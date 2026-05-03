"use client";

import { toast } from "sonner";

interface UndoToastContentProps {
  message: string;
  onUndo: () => void;
  toastId: string | number;
}

/**
 * Custom render for the undo toast — styled to match class-planner
 * Admin Amber design tokens. Used by showUndoToast in lib/toast.ts.
 *
 * Why custom (not sonner default action button):
 *   사용자 피드백 — 기본 sonner action 버튼이 class-planner와 어울리지 않음.
 *   여기선 amber accent + dark surface 토큰 사용해 우아함 통일.
 */
export function UndoToastContent({
  message,
  onUndo,
  toastId,
}: UndoToastContentProps) {
  return (
    <div className="flex items-center gap-3 min-w-[320px] max-w-[420px] rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] shadow-xl px-4 py-3 backdrop-blur">
      {/* small amber dot to signal an action-recoverable state */}
      <div className="h-2 w-2 rounded-full bg-amber-400 flex-shrink-0" aria-hidden="true" />
      <span className="flex-1 text-[13px] text-[var(--color-text-primary)] truncate">
        {message}
      </span>
      <button
        type="button"
        onClick={() => {
          onUndo();
          toast.dismiss(toastId);
        }}
        className="px-3 py-1.5 text-[12px] font-semibold text-[var(--color-admin-ink)] bg-amber-400 rounded-md hover:bg-amber-300 transition-colors min-h-[28px]"
      >
        되돌리기
      </button>
    </div>
  );
}
