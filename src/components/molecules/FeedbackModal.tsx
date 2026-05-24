"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, MessageSquare, Send, X, AlertCircle } from "lucide-react";

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

export function FeedbackModal({ isOpen, userId, onClose }: FeedbackModalProps) {
  const [body, setBody] = useState("");
  const [submit, setSubmit] = useState<SubmitState>({ kind: "idle" });

  // ESC 키 닫기
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  // 모달 닫힐 때 상태 초기화 (1초 후 — success 메시지 보이게)
  useEffect(() => {
    if (isOpen) return;
    const timer = setTimeout(() => {
      setBody("");
      setSubmit({ kind: "idle" });
    }, 800);
    return () => clearTimeout(timer);
  }, [isOpen]);

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
      const res = await fetch(`/api/feedback?userId=${encodeURIComponent(userId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: trimmed,
          category: "general",
          url: typeof window !== "undefined" ? window.location.href : null,
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
        }),
      });
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
      // 1.5초 후 자동 닫기
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
    >
      <div
        className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl w-full max-w-md p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
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
            {/* Textarea */}
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={isSubmitting}
              maxLength={4000}
              placeholder="예: 시간표에서 학생을 드래그할 때 가끔 끊겨요. Chrome 최신 버전 사용 중..."
              className="w-full h-32 px-3 py-2 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[13px] placeholder:text-[var(--color-text-muted)]/60 focus:outline-none focus:border-amber-500/50 resize-none disabled:opacity-50"
              data-testid="feedback-textarea"
            />

            {/* Char count */}
            <div className="mt-1 flex items-center justify-between text-[10px] text-[var(--color-text-muted)]">
              <span>{body.length} / 4000</span>
              <span>
                현재 페이지: <code className="font-mono">{typeof window !== "undefined" ? window.location.pathname : ""}</code>
              </span>
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
                <Send className="w-3 h-3" />
                {isSubmitting ? "전송 중..." : "보내기"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
