"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { LogIn } from "lucide-react";
import { supabase } from "../../utils/supabaseClient";
import { clearUserClassPlannerData } from "../../lib/localStorageCrud";

interface AccountMenuProps {
  compact?: boolean;
}

interface AuthUser {
  id: string;
  email?: string;
  user_metadata?: { avatar_url?: string; full_name?: string };
}

export function AccountMenu({ compact = false }: AccountMenuProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const isConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!isConfigured) return;

    supabase.auth.getUser()
      .then(({ data: { user } }) => {
        setUser(user);
      })
      .catch(() => {
        // Network failure — stay as anonymous
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      const currentUserId = localStorage.getItem("supabase_user_id");
      if (currentUserId) clearUserClassPlannerData(currentUserId);
      localStorage.removeItem("supabase_user_id");
      document.cookie = "onboarded=; Path=/; Max-Age=0";
      window.location.reload();
    } catch {
      window.location.reload();
    }
  };

  if (!user) {
    if (compact) {
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
      <Link
        href="/login"
        className="px-3 py-1.5 text-sm rounded-admin-md text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-overlay-light)] transition-colors"
      >
        로그인
      </Link>
    );
  }

  const initials = user.email?.charAt(0).toUpperCase() ?? "U";

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--color-primary)] overflow-hidden hover:ring-2 hover:ring-accent transition-all"
        aria-label="계정 메뉴"
        aria-expanded={isOpen}
      >
        {user.user_metadata?.avatar_url ? (
          <img
            src={user.user_metadata.avatar_url}
            alt="프로필"
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-sm font-semibold text-white">{initials}</span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-[9998]"
            onClick={() => setIsOpen(false)}
          />
          <div
            data-testid="account-menu-dropdown"
            data-anchor={compact ? "left" : "bottom"}
            className={[
              compact
                ? "absolute left-full bottom-0 ml-2 z-[9999] max-h-[calc(100vh-16px)] overflow-y-auto"
                : "absolute right-0 top-full mt-2 z-[9999]",
              "min-w-[200px] rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] shadow-admin-md p-2",
            ].join(" ")}
          >
            <div className="px-2 pb-2 mb-2 border-b border-[var(--color-border)]">
              <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                {user.user_metadata?.full_name ??
                  user.email?.split("@")[0] ??
                  "사용자"}
              </p>
              <p className="text-xs text-[var(--color-text-secondary)] truncate">
                {user.email}
              </p>
            </div>
            <Link
              href="/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center w-full px-2 py-1.5 rounded-md text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-overlay-light)] transition-colors"
            >
              설정
            </Link>
            <Link
              href="/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center w-full px-2 py-1.5 rounded-md text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-overlay-light)] transition-colors"
            >
              초대 관리
            </Link>
            <button
              onClick={handleLogout}
              aria-label="로그아웃"
              className="flex items-center w-full px-2 py-1.5 rounded-md text-sm text-semantic-danger hover:bg-[var(--color-overlay-light)] transition-colors"
            >
              로그아웃
            </button>
          </div>
        </>
      )}
    </div>
  );
}
