"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Check, Crop } from "lucide-react";

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface FeedbackScreenshotCropperProps {
  imageUrl: string;
  onCancel: () => void;
  onConfirm: (croppedBlob: Blob, croppedUrl: string) => void;
}

// 최소 선택 크기 (px, 화면 좌표) — 작으면 의도 X reset
const MIN_SELECTION_SIZE = 20;

/**
 * 캡처 이미지에 drag-selectable 사각형 overlay 를 띄워 영역 자르기.
 *
 * 흐름:
 *   1. PointerDown — selection 시작점 기록 + dragging 활성
 *   2. PointerMove — selection bounding rect 갱신 (실시간 dim + border)
 *   3. PointerUp — dragging 종료, 최소 크기 미달 시 selection reset
 *   4. "잘라내기" 클릭 — screen 좌표 → image natural 좌표 변환 후
 *      offscreen canvas drawImage 로 crop → Blob 반환
 *
 * 좌표 변환:
 *   image 는 object-contain 으로 container fit. screen coord 는 container
 *   relative. img.naturalWidth/clientWidth scale 로 native pixel 좌표 환산.
 *
 * 한계:
 *   - image 영역 밖 selection 시 crop 결과에 검은 영역 (1차 무시)
 *   - 큰 이미지 단일 canvas crop 메모리 부담 (modern-screenshot 결과 < 1MB
 *     이므로 통상 OK)
 */
export function FeedbackScreenshotCropper({
  imageUrl,
  onCancel,
  onConfirm,
}: FeedbackScreenshotCropperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);

  const [imageLoaded, setImageLoaded] = useState(false);
  const [selection, setSelection] = useState<Rect | null>(null);
  const [dragging, setDragging] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // ESC 닫기 (capture phase — 부모 modal 의 ESC 보다 먼저)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !confirming) {
        e.stopPropagation();
        onCancel();
      }
    }
    window.addEventListener("keydown", onKey, { capture: true });
    return () =>
      window.removeEventListener("keydown", onKey, { capture: true });
  }, [onCancel, confirming]);

  function getRelative(e: ReactPointerEvent): { x: number; y: number } {
    const container = containerRef.current;
    if (!container) return { x: 0, y: 0 };
    const rect = container.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(rect.width, e.clientX - rect.left)),
      y: Math.max(0, Math.min(rect.height, e.clientY - rect.top)),
    };
  }

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (!imageLoaded || confirming) return;
    const pos = getRelative(e);
    dragStart.current = pos;
    setSelection({ x: pos.x, y: pos.y, width: 0, height: 0 });
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!dragging || !dragStart.current) return;
    const pos = getRelative(e);
    const x = Math.min(dragStart.current.x, pos.x);
    const y = Math.min(dragStart.current.y, pos.y);
    const width = Math.abs(pos.x - dragStart.current.x);
    const height = Math.abs(pos.y - dragStart.current.y);
    setSelection({ x, y, width, height });
  }

  function handlePointerUp() {
    setDragging(false);
    dragStart.current = null;
    setSelection((prev) => {
      if (!prev) return null;
      if (prev.width < MIN_SELECTION_SIZE || prev.height < MIN_SELECTION_SIZE) {
        return null;
      }
      return prev;
    });
  }

  async function handleConfirm() {
    if (!selection || !imageRef.current || !containerRef.current) return;
    const img = imageRef.current;
    if (!img.naturalWidth || !img.naturalHeight) return;

    setConfirming(true);
    try {
      // 좌표 변환 — selection 은 container 기준, 변환 단계:
      //   container 좌표
      //   → img element box 좌표 (container padding + img element position)
      //   → object-contain content 좌표 (box 안의 letterbox offset 제거)
      //   → image natural 좌표 (contain ratio scale 적용)
      const containerRect = containerRef.current.getBoundingClientRect();
      const imgRect = img.getBoundingClientRect();
      const imgBoxLeft = imgRect.left - containerRect.left;
      const imgBoxTop = imgRect.top - containerRect.top;

      // object-contain: image content 가 img box 안에서 aspect 유지하며 fit.
      // 더 작은 비율이 fit 되는 축, 다른 축에 letterbox (가운데 정렬).
      const ratioW = img.clientWidth / img.naturalWidth;
      const ratioH = img.clientHeight / img.naturalHeight;
      const containRatio = Math.min(ratioW, ratioH);
      const displayedWidth = img.naturalWidth * containRatio;
      const displayedHeight = img.naturalHeight * containRatio;
      const letterboxX = (img.clientWidth - displayedWidth) / 2;
      const letterboxY = (img.clientHeight - displayedHeight) / 2;

      // selection (container 좌표) 의 image content 기준 좌표
      const contentLeft = imgBoxLeft + letterboxX;
      const contentTop = imgBoxTop + letterboxY;
      const naturalX = (selection.x - contentLeft) / containRatio;
      const naturalY = (selection.y - contentTop) / containRatio;
      const naturalW = selection.width / containRatio;
      const naturalH = selection.height / containRatio;

      // image bounds 안으로 clamp (사용자가 image 밖 drag 시 잘림 방지)
      const sx = Math.max(0, Math.min(img.naturalWidth - 1, Math.round(naturalX)));
      const sy = Math.max(0, Math.min(img.naturalHeight - 1, Math.round(naturalY)));
      const sw = Math.max(1, Math.min(img.naturalWidth - sx, Math.round(naturalW)));
      const sh = Math.max(1, Math.min(img.naturalHeight - sy, Math.round(naturalH)));

      const canvas = document.createElement("canvas");
      canvas.width = sw;
      canvas.height = sh;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setConfirming(false);
        return;
      }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/jpeg", 0.85),
      );
      if (!blob) {
        setConfirming(false);
        return;
      }
      const url = URL.createObjectURL(blob);
      onConfirm(blob, url);
    } catch {
      setConfirming(false);
    }
  }

  const hasValidSelection =
    selection !== null &&
    selection.width >= MIN_SELECTION_SIZE &&
    selection.height >= MIN_SELECTION_SIZE;

  return (
    <div
      className="fixed inset-0 bg-black/95 z-[120] flex flex-col items-stretch"
      role="dialog"
      aria-modal="true"
      aria-label="스크린샷 영역 자르기"
      data-feedback-modal-root="true"
      data-html2canvas-ignore="true"
      // 모든 click/pointer event 가 FeedbackModal backdrop 으로 bubble 되지 않도록 차단
      // (backdrop 의 onClick={onClose} 가 cropper button click 도 받아 modal 이 닫히던 버그 fix)
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-black/60 border-b border-white/10">
        <div className="flex items-center gap-2 text-white text-[13px]">
          <Crop className="w-4 h-4 text-amber-300" />
          <span className="font-medium">영역을 드래그해 자르기</span>
          <span className="text-white/50 text-[11px] ml-2 hidden sm:inline">
            (마우스로 사각형 선택 → 잘라내기)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={confirming}
            className="px-3 py-1.5 text-[12px] text-white/70 hover:text-white rounded-md hover:bg-white/10 disabled:opacity-40"
            data-testid="feedback-crop-cancel"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!hasValidSelection || confirming}
            data-testid="feedback-crop-confirm"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-500/30 border border-amber-400/50 text-[12px] text-amber-100 hover:bg-amber-500/40 font-medium disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Check className="w-3.5 h-3.5" />
            {confirming ? "처리 중..." : "잘라내기"}
          </button>
        </div>
      </div>

      {/* Image + selection */}
      <div
        ref={containerRef}
        className="relative flex-1 overflow-auto p-6 cursor-crosshair select-none touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        data-testid="feedback-crop-canvas"
      >
        <img
          ref={imageRef}
          src={imageUrl}
          alt="캡처 이미지 — 영역을 드래그해 자르기"
          onLoad={() => setImageLoaded(true)}
          draggable={false}
          className="block max-w-full max-h-full object-contain mx-auto pointer-events-none select-none"
          style={{ userSelect: "none" }}
        />

        {selection && (
          <>
            {/* Dim overlay — 4 영역 (top/bottom/left/right of selection) */}
            <div
              className="absolute bg-black/60 pointer-events-none"
              style={{
                left: 0,
                top: 0,
                right: 0,
                height: selection.y,
              }}
            />
            <div
              className="absolute bg-black/60 pointer-events-none"
              style={{
                left: 0,
                top: selection.y + selection.height,
                right: 0,
                bottom: 0,
              }}
            />
            <div
              className="absolute bg-black/60 pointer-events-none"
              style={{
                left: 0,
                top: selection.y,
                width: selection.x,
                height: selection.height,
              }}
            />
            <div
              className="absolute bg-black/60 pointer-events-none"
              style={{
                left: selection.x + selection.width,
                top: selection.y,
                right: 0,
                height: selection.height,
              }}
            />
            {/* Selection border + size label */}
            <div
              className="absolute border-2 border-amber-400 pointer-events-none"
              style={{
                left: selection.x,
                top: selection.y,
                width: selection.width,
                height: selection.height,
              }}
            >
              {hasValidSelection && (
                <div className="absolute -top-7 left-0 px-2 py-0.5 text-[11px] bg-amber-400 text-black rounded font-mono whitespace-nowrap">
                  {Math.round(selection.width)} × {Math.round(selection.height)}{" "}
                  px (화면)
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Footer hint */}
      <div className="px-6 py-2 bg-black/60 border-t border-white/10 text-[11px] text-white/50 text-center">
        <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[10px]">
          ESC
        </kbd>
        <span className="ml-2">
          취소 — 다시 드래그하면 선택 영역 재설정
        </span>
      </div>
    </div>
  );
}
