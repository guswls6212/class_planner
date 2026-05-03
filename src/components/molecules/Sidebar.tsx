"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  Users,
  BookOpen,
  GraduationCap,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { supabase } from "@/utils/supabaseClient";
import { signOut } from "@/lib/auth/signOut";
import { useMyRole } from "@/hooks/useMyRole";
import { useSidebar } from "@/contexts/SidebarContext";

interface SidebarItem {
  href: string;
  icon: LucideIcon;
  label: string;
  /** True if visible only to owner/admin (canManage=true). */
  adminOnly?: boolean;
}

const topItems: SidebarItem[] = [
  { href: "/schedule", icon: CalendarDays, label: "시간표" },
  { href: "/students", icon: Users, label: "학생", adminOnly: true },
  { href: "/subjects", icon: BookOpen, label: "과목", adminOnly: true },
  { href: "/teachers", icon: GraduationCap, label: "강사", adminOnly: true },
];

const bottomItems: SidebarItem[] = [
  { href: "/settings", icon: Settings, label: "설정" },
];

function UserSection() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const isConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!isConfigured) return;
    supabase.auth
      .getUser()
      .then(({ data }) => {
        setEmail(data.user?.email ?? null);
      })
      .catch(() => {});
  }, []);

  if (!email) return null;

  return (
    <div className="border-t border-slate-700 mt-1 pt-1">
      <div className="px-3 py-2">
        <p
          className="text-[10px] text-slate-500 truncate"
          title={email}
        >
          {email}
        </p>
      </div>
      <button
        type="button"
        onClick={() => signOut()}
        className="w-full px-3 py-2 text-left text-[11px] text-semantic-danger hover:bg-slate-700 transition-colors rounded-lg"
      >
        로그아웃
      </button>
    </div>
  );
}

function SidebarLink({
  href,
  icon: Icon,
  label,
  isActive,
  expanded,
}: SidebarItem & { isActive: boolean; expanded: boolean }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={`group relative flex items-center h-10 rounded-admin-md transition-colors ${
        expanded ? "w-full px-3 gap-3" : "justify-center w-10"
      } ${
        isActive
          ? "bg-accent text-[var(--color-admin-ink)]"
          : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-overlay-light)]"
      }`}
    >
      <Icon size={22} strokeWidth={1.5} className="flex-shrink-0" />
      {expanded ? (
        <span className="text-sm font-medium whitespace-nowrap">{label}</span>
      ) : (
        <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-admin-sm bg-[var(--color-bg-secondary)] px-2 py-1 text-caption text-[var(--color-text-primary)] opacity-0 group-hover:opacity-100 transition-opacity shadow-admin-sm z-50">
          {label}
        </span>
      )}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { expanded, toggle } = useSidebar();
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  // Role-based nav filtering. We hide admin-only items only when the user is
  // known to be a member. Loading state and anonymous users (role=null) keep
  // the full nav so we don't break the Anonymous-First flow where /students,
  // /subjects, /teachers are usable via localStorage.
  // Member users may briefly see admin items between the role fetch and the
  // re-render; clicking them lands on the middleware redirect with a toast.
  const { role, isLoading, academies } = useMyRole();
  const isMember = !isLoading && role === "member";
  const visibleTopItems = topItems.filter((item) => !item.adminOnly || !isMember);

  // Multi-academy switcher state. Reads the active academy id from
  // localStorage on mount; the dropdown lists all the user's academies and
  // switching reloads the page (cleanest way to reset all derived state).
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [activeAcademyId, setActiveAcademyId] = useState<string | null>(null);
  const switcherRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const userId =
      typeof window !== "undefined"
        ? localStorage.getItem("supabase_user_id")
        : null;
    if (!userId) return;
    import("@/lib/localStorageCrud").then(({ getActiveAcademyId }) => {
      setActiveAcademyId(getActiveAcademyId(userId));
    });
  }, []);

  // Close switcher dropdown on outside click.
  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setShowSwitcher(false);
      }
    }
    if (showSwitcher) {
      document.addEventListener("mousedown", handleOutsideClick);
      return () => document.removeEventListener("mousedown", handleOutsideClick);
    }
  }, [showSwitcher]);

  const activeAcademy =
    academies.find((a) => a.id === activeAcademyId) ?? academies[0];

  async function handleSwitchAcademy(targetAcademyId: string) {
    const userId = localStorage.getItem("supabase_user_id");
    if (!userId || targetAcademyId === activeAcademyId) {
      setShowSwitcher(false);
      return;
    }

    // Set active academy on the server (sets the active_academy_id cookie).
    await fetch("/api/auth/set-active-academy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, academyId: targetAcademyId }),
    }).catch(() => {});

    // Set active academy in localStorage (client-side scope key).
    const { setActiveAcademyId: setActive } = await import("@/lib/localStorageCrud");
    setActive(userId, targetAcademyId);

    // Reload the page — cleanest way to reset all React state for the new academy.
    window.location.reload();
  }

  return (
    <aside
      className={`fixed left-0 top-0 bottom-0 z-50 flex flex-col gap-1 py-4 bg-[var(--color-bg-primary)] border-r border-[var(--color-border)] transition-[width] duration-200 ${
        expanded ? "w-52 items-start" : "w-14 items-center"
      }`}
    >
      {/* Academy Switcher (replaces the old "CP" logo). */}
      <div
        className={`relative mb-4 ${expanded ? "w-full px-2" : ""}`}
        ref={switcherRef}
      >
        <button
          type="button"
          onClick={() => setShowSwitcher((v) => !v)}
          aria-label={activeAcademy?.name ?? "학원"}
          aria-expanded={showSwitcher}
          title={activeAcademy?.name ?? "학원"}
          className={`flex items-center rounded-lg transition-colors hover:opacity-80 ${
            expanded
              ? "w-full px-3 py-2 gap-2 text-sm font-semibold"
              : "w-9 h-9 justify-center text-xs font-bold"
          }`}
          style={
            activeAcademy
              ? ({
                  "--tc": "#fbbf24",
                  backgroundColor: "color-mix(in srgb, var(--tc) 25%, transparent)",
                  color: "var(--tc)",
                } as React.CSSProperties)
              : undefined
          }
        >
          {expanded
            ? (activeAcademy?.name ?? "학원")
            : (activeAcademy ? activeAcademy.name.slice(0, 2) : "CP")}
        </button>

        {showSwitcher && (
          <div className="absolute left-full top-0 ml-2 z-50 w-52 rounded-xl border border-slate-700 bg-slate-800 py-1.5 shadow-xl">
            {academies.length > 0 ? (
              <>
                <div className="px-3 py-1 text-[10px] text-slate-500 font-medium tracking-wide uppercase">
                  내 학원
                </div>
                {academies.map((academy) => (
                  <button
                    key={academy.id}
                    type="button"
                    onClick={() => handleSwitchAcademy(academy.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-slate-700 ${
                      academy.id === activeAcademyId ? "bg-amber-500/10" : ""
                    }`}
                  >
                    <div
                      className="w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                      style={
                        {
                          "--tc":
                            academy.id === activeAcademyId ? "#fbbf24" : "#94a3b8",
                          backgroundColor:
                            "color-mix(in srgb, var(--tc) 20%, transparent)",
                          color: "var(--tc)",
                        } as React.CSSProperties
                      }
                    >
                      {academy.name.slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-slate-200 truncate">
                        {academy.name}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {academy.role === "owner"
                          ? "원장"
                          : academy.role === "admin"
                            ? "관리자"
                            : "강사"}
                      </div>
                    </div>
                    {academy.id === activeAcademyId && (
                      <span className="text-amber-400 text-xs flex-shrink-0">✓</span>
                    )}
                  </button>
                ))}
              </>
            ) : (
              <div className="px-3 py-3 text-[11px] text-slate-500 text-center">
                학원 정보를 불러오는 중...
              </div>
            )}
            <div className="border-t border-slate-700 mt-1 pt-1">
              <button
                type="button"
                onClick={() => { setShowSwitcher(false); window.location.href = '/onboarding'; }}
                className="w-full px-3 py-2 text-left text-[11px] text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-colors rounded-lg"
              >
                + 새 학원 만들기
              </button>
            </div>
            <UserSection />
          </div>
        )}
      </div>

      <div className={`flex flex-col gap-1 ${expanded ? "w-full px-2" : ""}`}>
        {visibleTopItems.map((item) => (
          <SidebarLink
            key={item.href}
            {...item}
            isActive={isActive(item.href)}
            expanded={expanded}
          />
        ))}
      </div>

      <div className={`mt-auto flex flex-col gap-1 ${expanded ? "w-full px-2" : ""}`}>
        {bottomItems.map((item) => (
          <SidebarLink
            key={item.href}
            {...item}
            isActive={isActive(item.href)}
            expanded={expanded}
          />
        ))}

        {/* Sidebar toggle button */}
        <button
          type="button"
          onClick={toggle}
          aria-label={expanded ? "사이드바 접기" : "사이드바 펼치기"}
          className={`flex items-center justify-center h-8 rounded-admin-md text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-overlay-light)] transition-colors ${
            expanded ? "w-full" : "w-8"
          }`}
        >
          {expanded
            ? <ChevronLeft size={16} strokeWidth={2} />
            : <ChevronRight size={16} strokeWidth={2} />}
        </button>
      </div>
    </aside>
  );
}
