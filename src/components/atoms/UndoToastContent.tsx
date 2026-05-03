"use client";

import { Trash2 } from "lucide-react";
import { toast } from "sonner";

interface UndoToastContentProps {
  message: string;
  onUndo: () => void;
  toastId: string | number;
}

export function UndoToastContent({
  message,
  onUndo,
  toastId,
}: UndoToastContentProps) {
  return (
    <div className="flex items-center gap-3 min-w-[320px] max-w-[440px] rounded-[10px] border border-white bg-black shadow-2xl px-4 py-3">
      <Trash2
        size={16}
        strokeWidth={1.75}
        className="text-white flex-shrink-0"
        aria-hidden="true"
      />
      <span className="flex-1 text-[13px] text-white truncate">{message}</span>
      <button
        type="button"
        onClick={() => {
          onUndo();
          toast.dismiss(toastId);
        }}
        className="px-3.5 py-1.5 text-[12px] font-medium text-black bg-white border border-white rounded-md hover:bg-gray-100 transition-colors min-h-[28px]"
      >
        되돌리기
      </button>
    </div>
  );
}
