import React from "react";
import { useModalA11y } from "../../hooks/useModalA11y";

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

// 디자인: mockup confirm-modal-redesign "M3 상단 액센트 라인" (2026-06-02 사용자 픽).
//   솔리드 surface(#1f2937) + 상단 컬러 라인 + 어두운 backdrop → "투명" 체감 해소.
//   색 언어는 토스트(알림)와 통일: danger=red · warning=amber · info=sky (기존 indigo → sky).
const VARIANT_STYLE: Record<
  Variant,
  { topLine: string; iconBg: string; iconColor: string; confirmBtn: string }
> = {
  danger: {
    topLine: "bg-red-500",
    iconBg: "bg-red-500/15",
    iconColor: "text-red-400",
    confirmBtn: "bg-red-500 text-white hover:bg-red-600",
  },
  warning: {
    topLine: "bg-amber-500",
    iconBg: "bg-amber-500/15",
    iconColor: "text-amber-400",
    confirmBtn: "bg-amber-500 text-black hover:bg-amber-400",
  },
  info: {
    topLine: "bg-sky-500",
    iconBg: "bg-sky-500/15",
    iconColor: "text-sky-400",
    confirmBtn: "bg-sky-500 text-black hover:bg-sky-400",
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
      // z-[1200] sits above DataConflictModal (z-[1100]) so the 2-step confirm reads cleanly.
      // backdrop: 어둡게(80%) + blur-sm → 뒤 컬러 비침 최소화(솔리드 체감).
      className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/80 p-5 backdrop-blur-sm confirm-modal-fade-in"
      data-testid="confirm-modal-backdrop"
      onClick={handleBackdropClick}
    >
      <div
        ref={containerRef}
        className="relative w-full max-w-[440px] max-h-[90vh] overflow-hidden rounded-2xl border border-white/10 bg-[var(--color-bg-primary)] shadow-[0_24px_60px_-15px_rgba(0,0,0,0.7)] confirm-modal-pop-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-message"
      >
        {/* variant 상단 액센트 라인 (M3) */}
        <span className={`block h-1 w-full ${v.topLine}`} aria-hidden="true" />

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
            className="flex-1 pt-1.5 text-lg font-semibold leading-tight tracking-tight text-[var(--color-text-primary)]"
          >
            {title}
          </h3>
        </div>

        {/* 메시지 (아이콘 컬럼과 정렬) */}
        <div className="px-6 py-4 pl-[72px]">
          <p
            id="confirm-modal-message"
            className="text-sm leading-relaxed text-[var(--color-text-secondary)]"
          >
            {message}
          </p>
        </div>

        {/* 푸터: 액션 버튼 — 확인은 variant별 solid(팔레트 색). Button atom 의 bg-[--token](바-var)이
            이 Tailwind v4 셋업에서 fill 안 되는 이슈 회피 + mockup M3 의 solid 버튼과 일치. */}
        <div className="flex justify-end gap-2 border-t border-white/10 bg-black/20 px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="min-w-[72px] rounded-md px-3.5 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-white/5 hover:text-[var(--color-text-primary)] active:scale-[0.97]"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`min-w-[72px] rounded-md px-3.5 py-2 text-sm font-semibold transition-colors active:scale-[0.97] ${v.confirmBtn}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
