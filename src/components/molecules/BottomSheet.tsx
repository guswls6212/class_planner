"use client";

import { useEffect } from "react";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  dragHandleProps?: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
  };
  translateY?: number;
  "aria-labelledby"?: string;
}

export function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  dragHandleProps,
  translateY = 0,
  "aria-labelledby": ariaLabelledby,
}: BottomSheetProps) {
  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[var(--color-overlay)] animate-fade-in"
        onClick={onClose}
      />
      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledby}
        className="absolute bottom-0 left-0 right-0 bg-[var(--color-bg-primary)] rounded-t-2xl max-h-[85vh] overflow-y-auto animate-slide-up"
        style={{ transform: `translateY(${translateY}px)` }}
      >
        {/* Drag handle */}
        <div
          className="flex justify-center py-3 cursor-grab active:cursor-grabbing"
          {...dragHandleProps}
        >
          <div className="w-10 h-1 bg-[var(--color-border)] rounded-full" />
        </div>
        {title && (
          <h2
            id={ariaLabelledby}
            className="px-4 pb-2 text-lg font-semibold text-[var(--color-text-primary)]"
          >
            {title}
          </h2>
        )}
        <div className="px-4 pb-6">{children}</div>
      </div>
    </div>
  );
}
