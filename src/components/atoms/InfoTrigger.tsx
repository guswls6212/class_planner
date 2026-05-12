"use client";

import { Info } from "lucide-react";

interface InfoTriggerProps {
  label: string;
  onClick: () => void;
  size?: "sm" | "md";
}

export function InfoTrigger({ label, onClick, size = "sm" }: InfoTriggerProps) {
  // 동심원 2겹 회피 (2026-05-12): button의 rounded-full border를 두면 lucide Info
  // SVG가 자체 원을 가지므로 원이 두 겹으로 겹쳐 보임. button은 padding/hover만
  // 담당하고 시각적 원은 lucide 아이콘에 위임한다.
  const dimClass = size === "sm" ? "w-6 h-6" : "w-8 h-8";
  const iconSize = size === "sm" ? 14 : 18;
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`${dimClass} inline-flex items-center justify-center rounded-admin-md text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-overlay-light)] transition-colors`}
    >
      <Info size={iconSize} strokeWidth={2} />
    </button>
  );
}
