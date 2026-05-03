"use client";

import { Trash2 } from "lucide-react";
import { toast } from "sonner";

interface UndoToastContentProps {
  message: string;
  onUndo: () => void;
  toastId: string | number;
}

// Destructive variant of ToastContent — shares layout but has Trash icon and
// a "되돌리기" action button. Kept separate from ToastContent because the
// action button + dismiss callback is specific to undoable mutations.
export function UndoToastContent({
  message,
  onUndo,
  toastId,
}: UndoToastContentProps) {
  return (
    <div className="flex items-center gap-3 w-[440px] max-w-[calc(100vw-32px)] rounded-lg border border-red-400/30 bg-red-950/40 shadow-xl px-4 py-3 backdrop-blur-sm">
      <Trash2
        size={16}
        strokeWidth={1.75}
        className="text-red-400 flex-shrink-0"
        aria-hidden="true"
      />
      <span className="flex-1 text-[13px] text-red-100 truncate tracking-tight">
        {message}
      </span>
      <button
        type="button"
        onClick={() => {
          onUndo();
          toast.dismiss(toastId);
        }}
        className="px-3 py-1.5 text-[12px] font-medium text-red-200 border border-red-400/60 rounded-md hover:bg-red-400/10 hover:border-red-400 transition-colors min-h-[28px] flex-shrink-0"
      >
        되돌리기
      </button>
    </div>
  );
}
