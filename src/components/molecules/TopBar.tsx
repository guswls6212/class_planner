// src/components/molecules/TopBar.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LogIn } from "lucide-react";
import { supabase } from "@/utils/supabaseClient";
import { signOut } from "@/lib/auth/signOut";
import { useHelpDrawer } from "@/contexts/HelpDrawerContext";

function TopBarAccountSection() {
  const [email, setEmail] = useState<string | null | undefined>(undefined); // undefined = loading

  useEffect(() => {
    const isConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!isConfigured) {
      setEmail(null);
      return;
    }
    supabase.auth
      .getUser()
      .then(({ data }) => {
        setEmail(data.user?.email ?? null);
      })
      .catch(() => setEmail(null));
  }, []);

  if (email === undefined) return null; // loading

  if (email === null) {
    return (
      <Link
        href="/login"
        aria-label="로그인"
        className="flex items-center justify-center w-8 h-8 rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-overlay-light)] transition-colors"
      >
        <LogIn size={18} strokeWidth={1.5} />
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => signOut()}
      className="px-2 py-1 rounded-admin-md text-xs text-semantic-danger hover:bg-[var(--color-overlay-light)] transition-colors"
      aria-label="로그아웃"
    >
      로그아웃
    </button>
  );
}

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
        <TopBarAccountSection />
      </div>
    </header>
  );
}
