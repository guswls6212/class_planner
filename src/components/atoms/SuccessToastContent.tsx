"use client";

import { CheckCircle2 } from "lucide-react";

interface SuccessToastContentProps {
  message: string;
}

export function SuccessToastContent({ message }: SuccessToastContentProps) {
  return (
    <div className="flex items-center gap-3 w-[440px] max-w-[calc(100vw-32px)] rounded-lg border border-green-400/30 bg-green-950/40 shadow-xl px-4 py-3 backdrop-blur-sm">
      <CheckCircle2
        size={16}
        strokeWidth={1.75}
        className="text-green-400 flex-shrink-0"
        aria-hidden="true"
      />
      <span className="flex-1 text-[13px] text-green-100 truncate tracking-tight">
        {message}
      </span>
    </div>
  );
}
