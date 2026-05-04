"use client";

import { Copy, Trash2, X } from "lucide-react";

interface SelectionBarProps {
  count: number;
  onCopy?: () => void;
  onDelete: () => void;
  onClear: () => void;
}

/**
 * 다중 선택 시 화면 상단에 표시되는 sticky 일괄 작업 바.
 * count === 0이면 미렌더 (시각 노이즈 0).
 */
export default function SelectionBar({
  count,
  onCopy,
  onDelete,
  onClear,
}: SelectionBarProps) {
  if (count === 0) return null;
  return (
    <div
      role="region"
      aria-label="선택된 세션 일괄 작업"
      data-testid="selection-bar"
      className="sticky top-0 z-30 mb-3 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 shadow-sm dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-200"
    >
      <span className="font-semibold">{count}개 선택됨</span>
      <span className="flex-1" />
      {onCopy && (
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-white/70 px-2 py-1 text-xs font-medium text-amber-900 hover:bg-white dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-100 dark:hover:bg-amber-900/70"
          data-testid="selection-bar-copy"
        >
          <Copy size={12} strokeWidth={2} />
          복사
        </button>
      )}
      <button
        type="button"
        onClick={onDelete}
        className="inline-flex items-center gap-1 rounded-md border border-red-300 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100 dark:border-red-700 dark:bg-red-950/40 dark:text-red-200 dark:hover:bg-red-950/70"
        data-testid="selection-bar-delete"
      >
        <Trash2 size={12} strokeWidth={2} />
        삭제
      </button>
      <button
        type="button"
        onClick={onClear}
        aria-label="선택 해제"
        className="inline-flex items-center gap-1 rounded-md p-1 text-amber-900 hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-900/40"
        data-testid="selection-bar-clear"
        title="선택 해제 (Esc)"
      >
        <X size={14} strokeWidth={2} />
      </button>
    </div>
  );
}
