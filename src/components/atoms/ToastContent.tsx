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
    icon: string;
    text: string;
    Icon: typeof CheckCircle2;
  }
> = {
  success: {
    container: "border-green-400/30 bg-green-950/40",
    icon: "text-green-400",
    text: "text-green-100",
    Icon: CheckCircle2,
  },
  error: {
    container: "border-red-400/30 bg-red-950/40",
    icon: "text-red-400",
    text: "text-red-100",
    Icon: AlertCircle,
  },
  warning: {
    container: "border-amber-400/30 bg-amber-950/40",
    icon: "text-amber-400",
    text: "text-amber-100",
    Icon: AlertTriangle,
  },
  info: {
    container: "border-sky-400/30 bg-sky-950/40",
    icon: "text-sky-400",
    text: "text-sky-100",
    Icon: Info,
  },
};

export function ToastContent({ message, variant, action }: ToastContentProps) {
  const v = variantStyles[variant];
  const Icon = v.Icon;
  return (
    <div
      className={`flex items-center gap-3 w-[440px] max-w-[calc(100vw-32px)] rounded-lg border ${v.container} shadow-xl px-4 py-3 backdrop-blur-sm`}
    >
      <Icon
        size={16}
        strokeWidth={1.75}
        className={`${v.icon} flex-shrink-0`}
        aria-hidden="true"
      />
      <span
        className={`flex-1 text-[13px] ${v.text} truncate tracking-tight`}
      >
        {message}
      </span>
      {action}
    </div>
  );
}
