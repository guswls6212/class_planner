"use client";

import React, { useState } from "react";

interface HelpTooltipProps {
  content: string;
  label?: string;
}

export function HelpTooltip({ content, label = "도움말" }: HelpTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-label={label}
        className="flex items-center justify-center w-4 h-4 rounded-full border border-[var(--color-text-muted)] text-[var(--color-text-muted)] text-[10px] font-bold hover:border-[var(--color-text-primary)] hover:text-[var(--color-text-primary)] transition-colors"
      >
        i
      </button>
      {isOpen && (
        <>
          <div
            data-testid="help-tooltip-backdrop"
            className="fixed inset-0 z-[999]"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-6 top-0 z-[1000] w-56 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-3 text-xs text-[var(--color-text-secondary)] shadow-admin-md leading-relaxed">
            {content}
          </div>
        </>
      )}
    </div>
  );
}
