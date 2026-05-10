"use client";

import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import type { ReactNode } from "react";

export type ToastVariant = "success" | "error" | "warning" | "info";

interface ToastContentProps {
  message: string;
  variant: ToastVariant;
  action?: ReactNode;
}

const variantStyles: Record<
  ToastVariant,
  {
    container: string;
    headerBorder: string;
    icon: string;
    text: string;
    label: string;
    Icon: typeof CheckCircle2;
  }
> = {
  success: {
    container: "border-green-400/30 bg-green-950/40",
    headerBorder: "border-green-400/30",
    icon: "text-green-400",
    text: "text-green-100",
    label: "성공",
    Icon: CheckCircle2,
  },
  error: {
    container: "border-red-400/30 bg-red-950/40",
    headerBorder: "border-red-400/30",
    icon: "text-red-400",
    text: "text-red-100",
    label: "오류",
    Icon: AlertCircle,
  },
  warning: {
    container: "border-amber-400/30 bg-amber-950/40",
    headerBorder: "border-amber-400/30",
    icon: "text-amber-400",
    text: "text-amber-100",
    label: "주의",
    Icon: AlertTriangle,
  },
  info: {
    container: "border-sky-400/30 bg-sky-950/40",
    headerBorder: "border-sky-400/30",
    icon: "text-sky-400",
    text: "text-sky-100",
    label: "안내",
    Icon: Info,
  },
};

/**
 * 헤더 + 본문 카드 토스트 (UAT 2026-05-10).
 * - 헤더: variant 라벨(성공/안내/주의/오류) + 아이콘 — 정보 계층 분명
 * - 본문: 자동 줄바꿈(word-break: keep-all로 한글 자연 줄바꿈) — 잘림 없음
 * - action: 헤더 우측에 배치 (undo/CTA 등)
 */
export function ToastContent({ message, variant, action }: ToastContentProps) {
  const v = variantStyles[variant];
  const Icon = v.Icon;
  return (
    <div
      className={`w-[480px] max-w-[calc(100vw-32px)] rounded-xl border ${v.container} shadow-xl backdrop-blur-md overflow-hidden`}
      role="status"
    >
      <div
        className={`flex items-center gap-2 px-4 py-2.5 border-b ${v.headerBorder}`}
      >
        <Icon size={14} strokeWidth={2} className={v.icon} aria-hidden="true" />
        <span
          className={`text-[11px] font-semibold uppercase tracking-wider ${v.icon}`}
        >
          {v.label}
        </span>
        {action && <span className="ml-auto">{action}</span>}
      </div>
      <div className="px-4 py-3">
        <p
          className={`text-[13px] ${v.text} tracking-tight leading-relaxed`}
          style={{ wordBreak: "keep-all" }}
        >
          {message}
        </p>
      </div>
    </div>
  );
}
