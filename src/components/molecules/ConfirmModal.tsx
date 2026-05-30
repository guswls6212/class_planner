import React from "react";
import { useModalA11y } from "../../hooks/useModalA11y";
import Button from "../atoms/Button";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: "danger" | "warning" | "info";
}

type Variant = NonNullable<ConfirmModalProps["variant"]>;

const VARIANT_STYLE: Record<
  Variant,
  { strip: string; iconBg: string; iconColor: string; glow: string }
> = {
  danger: {
    strip: "bg-red-500",
    iconBg: "bg-red-500/15",
    iconColor: "text-red-400",
    glow: "shadow-[0_24px_60px_-20px_rgba(239,68,68,0.45),0_0_0_1px_rgba(255,255,255,0.06)_inset]",
  },
  warning: {
    strip: "bg-amber-500",
    iconBg: "bg-amber-500/15",
    iconColor: "text-amber-400",
    glow: "shadow-[0_24px_60px_-20px_rgba(245,158,11,0.40),0_0_0_1px_rgba(255,255,255,0.06)_inset]",
  },
  info: {
    strip: "bg-indigo-500",
    iconBg: "bg-indigo-500/15",
    iconColor: "text-indigo-400",
    glow: "shadow-[0_24px_60px_-20px_rgba(99,102,241,0.40),0_0_0_1px_rgba(255,255,255,0.06)_inset]",
  },
};

const VARIANT_ICON: Record<Variant, React.ReactNode> = {
  danger: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
      />
    </svg>
  ),
  warning: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z"
      />
    </svg>
  ),
  info: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8.75-2a.75.75 0 0 1 .75-.75h.008a.75.75 0 0 1 .75.75v.008a.75.75 0 0 1-.75.75H10a.75.75 0 0 1-.75-.75V8Zm.75 2.75a.75.75 0 0 0-.75.75v3.5a.75.75 0 0 0 1.5 0v-3.5a.75.75 0 0 0-.75-.75Z"
      />
    </svg>
  ),
};

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = "확인",
  cancelText = "취소",
  onConfirm,
  onCancel,
  variant = "danger",
}) => {
  // Hook must be called before early return (Rules of Hooks).
  // useModalA11y provides: Escape key handling, focus trap, return-focus on close.
  const { containerRef } = useModalA11y({ isOpen, onClose: onCancel });

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  const v = VARIANT_STYLE[variant];

  return (
    <div
      // z-[1200] sits above DataConflictModal (z-[1100]) so the 2-step confirm reads cleanly
      className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/65 p-5 backdrop-blur-md confirm-modal-fade-in"
      data-testid="confirm-modal-backdrop"
      onClick={handleBackdropClick}
    >
      <div
        ref={containerRef}
        className={`relative w-full max-w-[440px] max-h-[90vh] overflow-hidden rounded-2xl border border-[--color-border-light]/60 bg-[--color-bg-primary] confirm-modal-pop-in ${v.glow}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-message"
      >
        {/* variant 좌측 액센트 strip */}
        <span
          className={`absolute left-0 top-0 bottom-0 w-1 ${v.strip}`}
          aria-hidden="true"
        />

        {/* 헤더: 아이콘 + 제목 */}
        <div className="flex items-start gap-3 px-6 pt-5">
          <div
            className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${v.iconBg} ${v.iconColor}`}
            aria-hidden="true"
          >
            {VARIANT_ICON[variant]}
          </div>
          <h3
            id="confirm-modal-title"
            className="flex-1 pt-1.5 text-lg font-semibold leading-tight tracking-tight text-[--color-text-primary]"
          >
            {title}
          </h3>
        </div>

        {/* 메시지 (아이콘 컬럼과 정렬) */}
        <div className="px-6 py-4 pl-[72px]">
          <p
            id="confirm-modal-message"
            className="text-sm leading-relaxed text-[--color-text-secondary]"
          >
            {message}
          </p>
        </div>

        {/* 푸터: 액션 버튼 */}
        <div className="flex justify-end gap-2 border-t border-[--color-border]/40 bg-black/[0.04] px-6 py-4">
          <Button
            variant="transparent"
            size="small"
            onClick={onCancel}
            className="min-w-[72px]"
          >
            {cancelText}
          </Button>
          <Button
            variant={
              variant === "warning"
                ? "primary"
                : variant === "info"
                  ? "secondary"
                  : variant
            }
            size="small"
            onClick={onConfirm}
            className="min-w-[72px]"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
