"use client";

import { Trash2 } from "lucide-react";
import { toast } from "sonner";

interface UndoToastContentProps {
  message: string;
  onUndo: () => void;
  toastId: string | number;
}

/**
 * Custom render for the undo toast.
 *
 * v2 디자인 (사용자 피드백 — "amber 위에 amber" 어울리지 않음):
 *   - Trash 아이콘으로 semantic indicator (삭제됨)
 *   - 본문 텍스트는 white, 토스트 배경은 dark (대비 명확)
 *   - 되돌리기 버튼은 outline 기본 + 호버 시만 amber accent (single point)
 *   - 페이지의 amber accent 영역과 색이 겹치지 않음
 */
export function UndoToastContent({
  message,
  onUndo,
  toastId,
}: UndoToastContentProps) {
  return (
    <div className="flex items-center gap-3 min-w-[320px] max-w-[440px] rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] shadow-xl px-4 py-3 backdrop-blur">
      <Trash2
        size={14}
        strokeWidth={1.75}
        className="text-[var(--color-text-muted)] flex-shrink-0"
        aria-hidden="true"
      />
      <span className="flex-1 text-[13px] text-[var(--color-text-primary)] truncate">
        {message}
      </span>
      <button
        type="button"
        onClick={() => {
          onUndo();
          toast.dismiss(toastId);
        }}
        className="px-3 py-1.5 text-[12px] font-medium text-[var(--color-text-primary)] border border-[var(--color-border)] rounded-md hover:border-amber-400 hover:text-amber-400 hover:bg-amber-400/5 transition-colors min-h-[28px]"
      >
        되돌리기
      </button>
    </div>
  );
}
