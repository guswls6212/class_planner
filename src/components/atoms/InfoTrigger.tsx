"use client";

import { Info } from "lucide-react";

interface InfoTriggerProps {
  label: string;
  onClick: () => void;
  size?: "sm" | "md";
}

export function InfoTrigger({ label, onClick, size = "sm" }: InfoTriggerProps) {
  const dimClass = size === "sm" ? "w-4 h-4" : "w-6 h-6";
  const iconSize = size === "sm" ? 11 : 14;
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`${dimClass} inline-flex items-center justify-center rounded-full border border-[var(--color-text-muted)] text-[var(--color-text-muted)] hover:border-[var(--color-text-primary)] hover:text-[var(--color-text-primary)] transition-colors`}
    >
      <Info size={iconSize} strokeWidth={2} />
    </button>
  );
}
