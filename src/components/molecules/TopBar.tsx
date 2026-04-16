// src/components/molecules/TopBar.tsx
"use client";

import { AccountMenu } from "./AccountMenu";
import { useHelpDrawer } from "../../contexts/HelpDrawerContext";

export function TopBar() {
  const { open } = useHelpDrawer();

  return (
    <header className="flex items-center justify-between px-4 h-12 bg-[var(--color-bg-primary)] border-b border-[var(--color-border)] sticky top-0 z-40 pt-safe">
      <span className="text-label font-semibold text-[var(--color-text-primary)] tracking-wide">
        CLASS PLANNER
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={open}
          aria-label="도움말"
          className="p-2 rounded-admin-md text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-overlay-light)] transition-colors text-sm font-bold"
        >
          ?
        </button>
        <AccountMenu />
      </div>
    </header>
  );
}
