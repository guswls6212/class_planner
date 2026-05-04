"use client";

import { AlertTriangle, Info, RefreshCw } from "lucide-react";
import { toast } from "sonner";

type ActionToastVariant = "info" | "warning";

interface ActionToastContentProps {
  message: string;
  actionLabel: string;
  onAction: () => void;
  toastId: string | number;
  variant?: ActionToastVariant;
}

/**
 * 액션 버튼이 달린 토스트 — 사용자에게 알림 + 명시적 행동 요구.
 *
 * 사용 예: "다른 관리자가 시간표를 변경했어요" + [새로고침] 버튼.
 *
 * Destructive(undo)와 분리한 이유:
 * - UndoToastContent는 빨간 색상 + Trash 아이콘으로 destructive 시각
 * - ActionToastContent는 info(파란) / warning(주황) 시각으로 비파괴 알림
 */
export function ActionToastContent({
  message,
  actionLabel,
  onAction,
  toastId,
  variant = "info",
}: ActionToastContentProps) {
  const isWarning = variant === "warning";
  const Icon = isWarning ? AlertTriangle : Info;

  const containerClass = isWarning
    ? "border-amber-400/30 bg-amber-950/40"
    : "border-sky-400/30 bg-sky-950/40";
  const iconClass = isWarning ? "text-amber-400" : "text-sky-400";
  const textClass = isWarning ? "text-amber-100" : "text-sky-100";
  const buttonClass = isWarning
    ? "text-amber-200 border-amber-400/60 hover:bg-amber-400/10 hover:border-amber-400"
    : "text-sky-200 border-sky-400/60 hover:bg-sky-400/10 hover:border-sky-400";

  return (
    <div
      className={`flex items-center gap-3 w-[440px] max-w-[calc(100vw-32px)] rounded-lg border shadow-xl px-4 py-3 backdrop-blur-sm ${containerClass}`}
      data-testid="action-toast"
      data-variant={variant}
    >
      <Icon
        size={16}
        strokeWidth={1.75}
        className={`flex-shrink-0 ${iconClass}`}
        aria-hidden="true"
      />
      <span className={`flex-1 text-[13px] truncate tracking-tight ${textClass}`}>
        {message}
      </span>
      <button
        type="button"
        onClick={() => {
          onAction();
          toast.dismiss(toastId);
        }}
        data-testid="action-toast-button"
        className={`inline-flex items-center gap-1 px-3 py-1.5 text-[12px] font-medium border rounded-md transition-colors min-h-[28px] flex-shrink-0 ${buttonClass}`}
      >
        <RefreshCw size={12} strokeWidth={2} aria-hidden="true" />
        {actionLabel}
      </button>
    </div>
  );
}
