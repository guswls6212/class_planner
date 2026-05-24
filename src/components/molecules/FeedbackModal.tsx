"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Image as ImageIcon,
  Loader2,
  Maximize2,
  MessageSquare,
  Send,
  X,
} from "lucide-react";
import { logger } from "@/lib/logger";

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
 * Native Screen Capture API 으로 capture.
 *
 * Browser 의 navigator.mediaDevices.getDisplayMedia() — browser 가 직접 화면을
 * 화면 그대로 capture. fixed/sticky/transform/modern CSS 모두 정확 처리 (html2canvas
 * lib 의 layout limitation 회피).
 *
 * 흐름:
 *   1. modal 임시 hide (capture 결과에서 modal 자체 제외)
 *   2. getDisplayMedia 호출 → browser prompt ("이 탭" / "창" / "전체 화면" 선택)
 *   3. MediaStream 의 첫 frame 을 video → canvas drawImage → blob
 *   4. stream 해제 + modal 복원
 *
 * 한계 / 사용자 안내:
 *   - Browser 권한 prompt 첫 사용 시 1회 (이후 browser 가 권한 기억)
 *   - HTTPS 또는 localhost 필요 (production OK)
 *   - 사용자가 권한 거부 시 → error
 *   - Chrome 의 `preferCurrentTab` 으로 "이 탭" 자동 highlight (Firefox/Safari fallback)
 */
async function captureScreenshot(): Promise<{ blob: Blob | null; error: string | null }> {
  // STEP 1: modal 임시 hide — capture 결과에서 modal overlay 제외.
  // visibility 사용 (display 가 아닌 — layout shift 회피).
  const modals = Array.from(
    document.querySelectorAll<HTMLElement>("[data-feedback-modal-root]"),
  );
  const originalVisibility: Array<{ el: HTMLElement; value: string }> = [];
  for (const m of modals) {
    originalVisibility.push({ el: m, value: m.style.visibility });
    m.style.visibility = "hidden";
  }

  // 다음 frame 까지 wait (modal hide 적용 보장)
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );

  let stream: MediaStream | null = null;
  try {
    // STEP 2: Native API. preferCurrentTab 은 Chrome only experimental — TS 정의에 없음, cast.
    if (!navigator.mediaDevices?.getDisplayMedia) {
      return {
        blob: null,
        error: "이 브라우저는 화면 캡처를 지원하지 않습니다. 텍스트만 전송 가능합니다.",
      };
    }
    stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        displaySurface: "browser",
      },
      audio: false,
      preferCurrentTab: true,
    } as DisplayMediaStreamOptions & { preferCurrentTab?: boolean });

    // STEP 3: video → canvas → blob
    const video = document.createElement("video");
    video.srcObject = stream;
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("video metadata load 실패"));
    });
    await video.play();

    // settling 위해 100ms wait (첫 frame 안정화)
    await new Promise<void>((resolve) => setTimeout(resolve, 100));

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return { blob: null, error: "Canvas 2D context unavailable" };
    }
    ctx.drawImage(video, 0, 0);

    // blob 변환 (JPEG 0.8 quality, 1MB 한계 위해)
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.8),
    );
    return { blob, error: blob ? null : "blob 생성 실패" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // user denied 의 경우 친절 안내
    const friendly =
      err instanceof Error && err.name === "NotAllowedError"
        ? "화면 공유 권한이 거부됐습니다. 텍스트만 전송 가능합니다."
        : `캡처 실패: ${message}`;
    logger.error(
      "[FeedbackModal] captureScreenshot error",
      undefined,
      err instanceof Error ? err : new Error(String(err)),
    );
    return { blob: null, error: friendly };
  } finally {
    // STEP 4: stream 해제 + modal 복원
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }
    for (const { el, value } of originalVisibility) {
      el.style.visibility = value;
    }
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

  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

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

  async function handleCaptureScreenshot() {
    setCapturing(true);
    try {
      const { blob, error } = await captureScreenshot();
      if (blob) {
        setScreenshot(blob);
        // revoke previous URL 메모리 누수 회피
        if (screenshotPreview) URL.revokeObjectURL(screenshotPreview);
        setScreenshotPreview(URL.createObjectURL(blob));
        setIncludeScreenshot(true);
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
                  <button
                    type="button"
                    onClick={handleCaptureScreenshot}
                    disabled={capturing || isSubmitting}
                    data-testid="feedback-capture-screenshot"
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-500/15 border border-amber-500/30 text-[11px] text-amber-300 hover:bg-amber-500/25 disabled:opacity-40"
                  >
                    {capturing ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Camera className="w-3 h-3" />
                    )}
                    {capturing ? "캡처 중..." : "현재 화면 캡처"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleRemoveScreenshot}
                    disabled={isSubmitting}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] text-rose-300 hover:bg-rose-500/10"
                  >
                    <X className="w-3 h-3" /> 제거
                  </button>
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
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
    </div>
  );
}
