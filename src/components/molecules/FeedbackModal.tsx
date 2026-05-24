"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Image as ImageIcon,
  Loader2,
  MessageSquare,
  Send,
  X,
} from "lucide-react";

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

async function captureScreenshot(): Promise<Blob | null> {
  try {
    const mod = await import("html2canvas");
    const html2canvas = (mod as unknown as { default: typeof import("html2canvas").default }).default;
    const canvas = await html2canvas(document.body, {
      backgroundColor: null,
      scale: 1,
      logging: false,
      useCORS: true,
      ignoreElements: (el: Element) =>
        el instanceof HTMLElement && el.hasAttribute("data-html2canvas-ignore"),
    });
    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.8);
    });
  } catch {
    return null;
  }
}

export function FeedbackModal({ isOpen, userId, onClose }: FeedbackModalProps) {
  const [body, setBody] = useState("");
  const [includeScreenshot, setIncludeScreenshot] = useState(false);
  const [screenshot, setScreenshot] = useState<Blob | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [submit, setSubmit] = useState<SubmitState>({ kind: "idle" });

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
    }, 800);
    return () => clearTimeout(timer);
  }, [isOpen]);

  async function handleCaptureScreenshot() {
    setCapturing(true);
    try {
      const blob = await captureScreenshot();
      if (blob) {
        setScreenshot(blob);
        // revoke previous URL 메모리 누수 회피
        if (screenshotPreview) URL.revokeObjectURL(screenshotPreview);
        setScreenshotPreview(URL.createObjectURL(blob));
        setIncludeScreenshot(true);
      } else {
        setSubmit({
          kind: "error",
          message: "스크린샷 캡처에 실패했습니다.",
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
      data-html2canvas-ignore="true"
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
              {screenshotPreview ? (
                <div className="mt-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={screenshotPreview}
                    alt="첨부 스크린샷 미리보기"
                    className="w-full rounded-md border border-[var(--color-border)] max-h-32 object-cover"
                  />
                  <p className="text-[9.5px] text-[var(--color-text-muted)] mt-1 leading-snug">
                    Privacy: 학생/강사 이름이 화면에 보이면 image 에 포함됩니다. 민감 정보 노출 우려 시 제거하세요.
                  </p>
                </div>
              ) : (
                <p className="text-[9.5px] text-[var(--color-text-muted)] leading-snug">
                  버튼 누르면 모달 제외한 현재 화면 캡처. 1MB 이하 JPEG. 학원
                  내부 정보 (학생/강사 이름) 노출 가능 — 의식적 선택.
                </p>
              )}
            </div>

            {/* Metadata info banner */}
            <div className="mt-2 text-[9.5px] text-[var(--color-text-muted)] leading-snug">
              자동 첨부: IP / 브라우저 / 화면 크기 / timezone / 페이지 history
              — 디버깅 용도.
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
    </div>
  );
}
