"use client";

import { Bell } from "lucide-react";

export function TopBar() {
  return (
    <header className="flex items-center justify-between px-4 h-12 bg-[var(--color-bg-primary)] border-b border-[var(--color-border)] sticky top-0 z-40">
      <span className="text-label font-semibold text-[var(--color-text-primary)] tracking-wide">
        CLASS PLANNER
      </span>
      <button
        className="p-2 rounded-admin-md text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-overlay-light)] transition-colors"
        aria-label="알림"
      >
        <Bell size={20} strokeWidth={1.5} />
      </button>
    </header>
  );
}
