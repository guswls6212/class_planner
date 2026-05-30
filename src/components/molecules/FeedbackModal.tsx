"use client";

/**
 * FeedbackModal: 운영자가 피드백/버그 리포트 작성 → 스크린샷 첨부 + 카테고리 선택 →
 * POST /api/feedback 으로 전송. 작성 폼 + submit + result toast 까지 담당.
 *
 * 의존성:
 *   - lucide-react — 아이콘
 *   - useAuth — userId 첨부
 *   - api/feedback — server endpoint
 *   - non-goal: 피드백 list / admin 응답 (별도 admin page)
 *
 * 결정 history:
 *   - 카테고리 (버그/기능/기타) + 스크린샷 옵션 — UAT 운영자 요청.
 *   - omni-radar trace_id 첨부 — 후속 디버깅 연동.
 *   - ADR-002 (2026-05-28): UI molecule, 분리 needs-review (form / submit hook).
 *
 * Sniff test: UI + form state + submit. 한 모달 한 도메인 (feedback 입력). 분리 후보 (needs-review): screenshot capture / submit hook.
 */

import { useEffect, useState } from "react";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Crop,
  Image as ImageIcon,
  Loader2,
  Maximize2,
  MessageSquare,
  Send,
  X,
} from "lucide-react";
import { logger } from "@/lib/logger";
import { FeedbackScreenshotCropper } from "./FeedbackScreenshotCropper";

interface FeedbackModalProps {
  isOpen: boolean;
  userId: string | null;
  onClose: () => void;
}

type SubmitState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success" }
  | { kind: "error"; message: string };

interface ClientMetadata {
  screen: { width: number; height: number };
  viewport: { width: number; height: number };
  devicePixelRatio: number;
  referrer: string;
  timezone: string;
  locale: string;
  online: boolean;
  cookieEnabled: boolean;
  historyLength: number;
}

function captureClientMetadata(): ClientMetadata {
  return {
    screen: { width: window.screen.width, height: window.screen.height },
    viewport: { width: window.innerWidth, height: window.innerHeight },
    devicePixelRatio: window.devicePixelRatio,
    referrer: document.referrer,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    locale: navigator.language,
    online: navigator.onLine,
    cookieEnabled: navigator.cookieEnabled,
    historyLength: window.history.length,
  };
}

/**
 * modern-screenshot 으로 전체 페이지 DOM 캡처 (variant D).
 *
 * 기존 getDisplayMedia (viewport 1 frame + 권한 prompt + render race) 교체.
 * scrollHeight 전체 DOM 직접 렌더 → 스크롤 영역 포함 + 권한 prompt 회피 +
 * React state 와 동기 캡처 (race ↓).
 *
 * 흐름:
 *   1. modern-screenshot dynamic import (initial bundle 영향 ↓)
 *   2. filter 로 feedback modal + data-html2canvas-ignore 제외
 *   3. quality ladder (0.85 → 0.6 → 0.4) 적용해 1MB cap 통과
 *   4. Blob 반환
 *
 * 한계:
 *   - CSS transform 일부 부정확 (modern-screenshot 은 html2canvas 보다 개선)
 *   - 캡처 시간 1-3 초 (페이지 길이 따라)
 *   - quality 0.4 에도 1MB 초과 시 그대로 반환 (서버 검증에 위임)
 *
 * crop 옵션 (variant B 스타일) 은 별도 step — preview 단계에서 후행.
 */
const SCREENSHOT_MAX_BYTES = 1024 * 1024;
const SCREENSHOT_QUALITY_LADDER = [0.85, 0.6, 0.4] as const;

async function captureScreenshot(): Promise<{ blob: Blob | null; error: string | null }> {
  try {
    const { domToBlob } = await import("modern-screenshot");

    let blob: Blob | null = null;
    for (const quality of SCREENSHOT_QUALITY_LADDER) {
      blob = await domToBlob(document.body, {
        type: "image/jpeg",
        quality,
        backgroundColor: "#0a0a0a",
        scale: 1,
        filter: (node) => {
          if (!(node instanceof HTMLElement)) return true;
          // feedback modal 자체 제외
          if (node.hasAttribute("data-feedback-modal-root")) return false;
          // historical 이름 호환 (lightbox 등에 사용)
          if (node.dataset.html2canvasIgnore === "true") return false;
          return true;
        },
      });
      if (blob && blob.size <= SCREENSHOT_MAX_BYTES) break;
    }

    if (!blob) {
      return { blob: null, error: "캡처 결과 생성 실패" };
    }
    return { blob, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(
      "[FeedbackModal] captureScreenshot error",
      undefined,
      err instanceof Error ? err : new Error(String(err)),
    );
    return { blob: null, error: `캡처 실패: ${message}` };
  }
}

export function FeedbackModal({ isOpen, userId, onClose }: FeedbackModalProps) {
  const [body, setBody] = useState("");
  const [includeScreenshot, setIncludeScreenshot] = useState(false);
  const [screenshot, setScreenshot] = useState<Blob | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [submit, setSubmit] = useState<SubmitState>({ kind: "idle" });
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [cropperOpen, setCropperOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      // cropper open 중이면 cropper 의 자체 ESC handler (capture phase) 우선
      if (cropperOpen) return;
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose, cropperOpen]);

  // 모달 닫힐 때 상태 초기화 (0.8s 후 — success 메시지 보이게)
  useEffect(() => {
    if (isOpen) return;
    const timer = setTimeout(() => {
      setBody("");
      setIncludeScreenshot(false);
      setScreenshot(null);
      setScreenshotPreview(null);
      setSubmit({ kind: "idle" });
      setLightboxOpen(false);
      setCropperOpen(false);
    }, 800);
    return () => clearTimeout(timer);
  }, [isOpen]);

  // Lightbox ESC 키 닫기
  useEffect(() => {
    if (!lightboxOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        setLightboxOpen(false);
      }
    }
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [lightboxOpen]);

  async function handleCaptureScreenshot(openCropperAfter = false) {
    setCapturing(true);
    try {
      const { blob, error } = await captureScreenshot();
      if (blob) {
        setScreenshot(blob);
        // revoke previous URL 메모리 누수 회피
        if (screenshotPreview) URL.revokeObjectURL(screenshotPreview);
        setScreenshotPreview(URL.createObjectURL(blob));
        setIncludeScreenshot(true);
        if (openCropperAfter) setCropperOpen(true);
      } else {
        // captureScreenshot 이 이미 친절 메시지 (권한 거부 / 미지원 등) 반환 — wrapper prefix X
        setSubmit({
          kind: "error",
          message: error ?? "스크린샷 캡처에 실패했습니다.",
        });
      }
    } finally {
      setCapturing(false);
    }
  }

  function handleRemoveScreenshot() {
    if (screenshotPreview) URL.revokeObjectURL(screenshotPreview);
    setScreenshot(null);
    setScreenshotPreview(null);
    setIncludeScreenshot(false);
  }

  function handleCropConfirm(croppedBlob: Blob, croppedUrl: string) {
    // 이전 preview URL 정리 후 cropped blob 으로 교체
    if (screenshotPreview) URL.revokeObjectURL(screenshotPreview);
    setScreenshot(croppedBlob);
    setScreenshotPreview(croppedUrl);
    setIncludeScreenshot(true);
    setCropperOpen(false);
  }

  if (!isOpen) return null;

  async function handleSubmit() {
    const trimmed = body.trim();
    if (trimmed.length === 0) {
      setSubmit({ kind: "error", message: "내용을 입력해주세요." });
      return;
    }
    if (!userId) {
      setSubmit({
        kind: "error",
        message: "로그인 정보가 없습니다. 로그인 후 다시 시도해주세요.",
      });
      return;
    }

    setSubmit({ kind: "submitting" });
    try {
      const metadata = captureClientMetadata();

      // multipart formData (스크린샷 첨부 가능 + JSON metadata 전달)
      const formData = new FormData();
      formData.append("body", trimmed);
      formData.append("category", "general");
      formData.append("url", window.location.href);
      formData.append("userAgent", navigator.userAgent);
      formData.append("metadata", JSON.stringify(metadata));
      if (includeScreenshot && screenshot) {
        formData.append("screenshot", screenshot, "screenshot.jpg");
      }

      const res = await fetch(
        `/api/feedback?userId=${encodeURIComponent(userId)}`,
        { method: "POST", body: formData },
      );
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
      };
      if (!res.ok || !data.success) {
        setSubmit({
          kind: "error",
          message: data.error ?? "전송에 실패했습니다. 잠시 후 다시 시도해주세요.",
        });
        return;
      }
      setSubmit({ kind: "success" });
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      setSubmit({
        kind: "error",
        message:
          err instanceof Error
            ? err.message
            : "네트워크 오류 — 잠시 후 다시 시도해주세요.",
      });
    }
  }

  const isSubmitting = submit.kind === "submitting";
  const isSuccess = submit.kind === "success";

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
      onClick={() => !isSubmitting && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-modal-title"
      data-feedback-modal-root="true"
    >
      <div
        className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl w-full max-w-md p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        data-html2canvas-ignore="true"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2
              id="feedback-modal-title"
              className="text-[16px] font-semibold flex items-center gap-2"
            >
              <MessageSquare className="w-4 h-4 text-amber-300" />
              피드백 보내기
            </h2>
            <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
              버그 / 개선 의견 / 사용 중 어려움 — 자유롭게 작성해주세요
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] disabled:opacity-40"
            aria-label="닫기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Success state */}
        {isSuccess ? (
          <div className="py-6 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
            <p className="text-[14px] font-medium text-emerald-300">
              피드백이 전송되었습니다
            </p>
            <p className="text-[11px] text-[var(--color-text-muted)] mt-1">
              개발자가 확인 후 답변드립니다 (보통 1-2일)
            </p>
          </div>
        ) : (
          <>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={isSubmitting}
              maxLength={4000}
              placeholder="예: 시간표에서 학생을 드래그할 때 가끔 끊겨요. Chrome 최신 버전 사용 중..."
              className="w-full h-32 px-3 py-2 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[13px] placeholder:text-[var(--color-text-muted)]/60 focus:outline-none focus:border-amber-500/50 resize-none disabled:opacity-50"
              data-testid="feedback-textarea"
            />

            <div className="mt-1 flex items-center justify-between text-[10px] text-[var(--color-text-muted)]">
              <span>{body.length} / 4000</span>
              <span>
                현재 페이지:{" "}
                <code className="font-mono">
                  {typeof window !== "undefined" ? window.location.pathname : ""}
                </code>
              </span>
            </div>

            {/* Screenshot section */}
            <div className="mt-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-tertiary)]/40 p-3">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1.5 text-[11.5px] font-medium text-[var(--color-text-secondary)]">
                  <ImageIcon className="w-3.5 h-3.5 text-amber-300" />
                  스크린샷 첨부
                  <span className="text-[10px] text-[var(--color-text-muted)] font-normal">
                    (선택)
                  </span>
                </div>
                {!screenshot ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleCaptureScreenshot(false)}
                      disabled={capturing || isSubmitting}
                      data-testid="feedback-capture-screenshot"
                      className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-500/15 border border-amber-500/30 text-[11px] text-amber-300 hover:bg-amber-500/25 disabled:opacity-40"
                    >
                      {capturing ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Camera className="w-3 h-3" />
                      )}
                      {capturing ? "캡처 중..." : "전체 페이지"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCaptureScreenshot(true)}
                      disabled={capturing || isSubmitting}
                      data-testid="feedback-capture-and-crop"
                      className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-500/15 border border-amber-500/30 text-[11px] text-amber-300 hover:bg-amber-500/25 disabled:opacity-40"
                    >
                      {capturing ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Crop className="w-3 h-3" />
                      )}
                      {capturing ? "캡처 중..." : "영역 자르기"}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setCropperOpen(true)}
                      disabled={isSubmitting}
                      data-testid="feedback-open-cropper"
                      className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] text-amber-300 hover:bg-amber-500/10"
                    >
                      <Crop className="w-3 h-3" /> 자르기
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveScreenshot}
                      disabled={isSubmitting}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] text-rose-300 hover:bg-rose-500/10"
                    >
                      <X className="w-3 h-3" /> 제거
                    </button>
                  </div>
                )}
              </div>
              {screenshotPreview && (
                <button
                  type="button"
                  onClick={() => setLightboxOpen(true)}
                  className="mt-2 block w-full rounded-md overflow-hidden border border-[var(--color-border)] hover:border-amber-500/40 transition-colors group relative cursor-zoom-in"
                  title="클릭하면 크게 보기"
                  data-testid="feedback-screenshot-thumbnail"
                >
                  <img
                    src={screenshotPreview}
                    alt="첨부 스크린샷 미리보기 (클릭 시 확대)"
                    className="w-full max-h-48 object-cover"
                  />
                  {/* hover overlay with zoom hint */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 text-white text-[11px] font-medium backdrop-blur-sm">
                      <Maximize2 className="w-3 h-3" />
                      크게 보기
                    </span>
                  </div>
                </button>
              )}
            </div>

            {/* Error message */}
            {submit.kind === "error" && (
              <div className="mt-3 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-[11.5px] text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>{submit.message}</span>
              </div>
            )}

            {/* Footer */}
            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-3 py-1.5 rounded-lg text-[12px] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] disabled:opacity-40"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || body.trim().length === 0}
                data-testid="feedback-submit"
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-[12px] text-amber-300 hover:bg-amber-500/30 font-medium disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Send className="w-3 h-3" />
                )}
                {isSubmitting ? "전송 중..." : "보내기"}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Lightbox — 스크린샷 큰 미리보기 (modal 위 z-[110]) */}
      {lightboxOpen && screenshotPreview && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[110] p-4"
          onClick={(e) => {
            e.stopPropagation();
            setLightboxOpen(false);
          }}
          role="dialog"
          aria-modal="true"
          aria-label="스크린샷 크게 보기"
          data-html2canvas-ignore="true"
        >
          <img
            src={screenshotPreview}
            alt="첨부 스크린샷 (전체 크기)"
            className="max-w-full max-h-[calc(100vh-80px)] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          {/* Top-right close button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxOpen(false);
            }}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm"
            aria-label="닫기 (ESC)"
          >
            <X className="w-4 h-4" />
          </button>
          {/* Bottom-center hint */}
          <div
            className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-black/60 text-white text-[11px] backdrop-blur-sm flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <span>클릭 또는</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[10px]">ESC</kbd>
            <span>로 닫기</span>
          </div>
        </div>
      )}

      {/* Cropper — drag-selectable 영역 자르기 (variant B 옵션). lightbox 보다 위 z-[120] */}
      {cropperOpen && screenshotPreview && (
        <FeedbackScreenshotCropper
          imageUrl={screenshotPreview}
          onCancel={() => setCropperOpen(false)}
          onConfirm={handleCropConfirm}
        />
      )}
    </div>
  );
}
