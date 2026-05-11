"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface SectionHeaderProps {
  children: ReactNode;
  /** lucide icon component (Calendar, BookOpen 등). 좌측 작은 아이콘. */
  icon?: LucideIcon;
  /** 우측 count badge (총 N개 등). */
  count?: number | string;
  className?: string;
}

/**
 * Section 라벨 SSOT — 11px uppercase tracking-wide + optional icon/count badge.
 *
 * 사용처: 모달/패널 내 section 라벨 ("담당 과목", "연락처·역할", "수업 일정" 등).
 *
 * 예:
 *   <SectionHeader icon={BookOpen} count={5}>담당 과목</SectionHeader>
 */
export function SectionHeader({
  children,
  icon: Icon,
  count,
  className = "",
}: SectionHeaderProps) {
  return (
    <h3
      className={`text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)] flex items-center gap-1.5 ${className}`}
    >
      {Icon && <Icon size={12} strokeWidth={1.5} aria-hidden="true" />}
      <span>{children}</span>
      {count != null && (
        <span className="ml-1 inline-flex items-center rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-text-primary)] normal-case tracking-normal">
          {count}
        </span>
      )}
    </h3>
  );
}

export default SectionHeader;
