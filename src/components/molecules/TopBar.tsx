"use client";

import { AccountMenu } from "./AccountMenu";

export function TopBar() {
  return (
    <header className="flex items-center justify-between px-4 h-12 bg-[var(--color-bg-primary)] border-b border-[var(--color-border)] sticky top-0 z-40 pt-safe">
      <span className="text-label font-semibold text-[var(--color-text-primary)] tracking-wide">
        CLASS PLANNER
      </span>
      <div className="flex items-center gap-2">
        <AccountMenu />
      </div>
    </header>
  );
}
