"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  GraduationCap,
  LogIn,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Users,
} from "lucide-react";
import { FeedbackModal } from "./FeedbackModal";
import type { LucideIcon } from "lucide-react";
import { signOut } from "@/lib/auth/signOut";
import { useMyRole } from "@/hooks/useMyRole";
import { useSidebar } from "@/contexts/SidebarContext";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationDropdown } from "../molecules/NotificationDropdown";
import CreateAcademyModal from "./CreateAcademyModal";

interface SidebarItem {
  href: string;
  icon: LucideIcon;
  label: string;
  /** True if visible only to owner/admin (canManage=true). */
  adminOnly?: boolean;
}

const topItems: SidebarItem[] = [
  { href: "/schedule", icon: CalendarDays, label: "시간표" },
  // phase1-release-readiness rank 6 (발견성) — 출결을 시간표 다음에 배치하여
  // mental model 통합 (시간표 ↔ 출결). 단순 wrap 페이지 (오늘/이번 주 sessions
  // list + AttendanceSheet modal). 상세: /strategy/discoverability-attendance-recovery
  { href: "/attendance", icon: ClipboardCheck, label: "출결" },
  { href: "/students", icon: Users, label: "학생", adminOnly: true },
  { href: "/subjects", icon: BookOpen, label: "과목", adminOnly: true },
  { href: "/teachers", icon: GraduationCap, label: "강사", adminOnly: true },
];

function UserBottomSection({ role }: { role: "owner" | "admin" | "member" | null }) {
  const { user } = useAuth();
  const email = user?.email ?? null;

  if (!email) return null;

  const roleLabel =
    role === "owner" ? "원장"
    : role === "admin" ? "관리자"
    : role === "member" ? "강사"
    : null;

  return (
    <div className="border-t border-[var(--color-border)] mt-1 pt-2">
      <div className="px-3 py-1">
        <p
          className="text-[10px] text-[var(--color-text-muted)] truncate"
          title={email}
        >
          {email}
        </p>
        {roleLabel && (
          <p className="text-[10px] text-amber-400 mt-0.5">{roleLabel}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => signOut()}
        className="w-full px-3 py-1.5 text-left text-[11px] text-semantic-danger hover:bg-[var(--color-overlay-light)] transition-colors rounded-lg"
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
      data-tour={href.startsWith("/") ? href.slice(1) : href}
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

  // Keyboard shortcut: ⌘+B (Mac) / Ctrl+B (Win/Linux) toggles the sidebar.
  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggle();
      }
    }
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [toggle]);

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

  // Login state — AuthContext에서 단일 source로 받음.
  const { session } = useAuth();
  const isLoggedIn = !!session;

  // Multi-academy switcher state. Reads the active academy id from
  // localStorage on mount; the dropdown lists all the user's academies and
  // switching reloads the page (cleanest way to reset all derived state).
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [activeAcademyId, setActiveAcademyId] = useState<string | null>(null);
  const [userIdForCreate, setUserIdForCreate] = useState<string | null>(null);
  const switcherRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const userId =
      typeof window !== "undefined"
        ? localStorage.getItem("supabase_user_id")
        : null;
    if (!userId) return;
    setUserIdForCreate(userId);
    import("@/lib/localStorageCrud").then(({ getActiveAcademyId }) => {
      setActiveAcademyId(getActiveAcademyId(userId));
    });
  }, []);

  async function handleAcademyCreated(newAcademyId: string) {
    const userId = userIdForCreate;
    if (!userId) {
      setShowCreateModal(false);
      return;
    }
    await fetch("/api/auth/set-active-academy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, academyId: newAcademyId }),
    }).catch(() => {});
    const { setActiveAcademyId: setActive } = await import("@/lib/localStorageCrud");
    setActive(userId, newAcademyId);
    window.location.reload();
  }

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
      {/* Academy Switcher + NotificationDropdown wrapper.
          Anonymous mode (anonymous-first 정책): 학원 박스는 미렌더 — 익명에겐 학원
          개념 자체가 무의미. 알림 종은 익명도 토스트 받을 수 있으므로 렌더.
          Expanded: 학원 박스 + 종 inline (학원이 flex-1로 거의 전 너비 차지).
          Collapsed: 학원 이니셜 위, 종 아래 stack (종은 nav size로 nav menu와 동등). */}
      <div className={`mb-4 ${expanded ? "w-full px-2" : ""}`}>
        <div
          className={
            expanded
              ? `flex items-center gap-1.5 ${isLoggedIn ? "" : "justify-end"}`
              : "flex flex-col items-center gap-1"
          }
        >
          {isLoggedIn && (
          <div
            className={`relative ${expanded ? "flex-1 min-w-0" : ""}`}
            ref={switcherRef}
          >
        <button
          type="button"
          onClick={() => setShowSwitcher((v) => !v)}
          aria-label={activeAcademy?.name ?? "학원"}
          aria-expanded={showSwitcher}
          title={activeAcademy?.name ?? "학원"}
          data-tour="academy-switch"
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
            {isLoading ? (
              <div className="px-3 py-3 text-[11px] text-slate-500 text-center">
                학원 정보를 불러오는 중...
              </div>
            ) : academies.length > 0 ? (
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
                참여 중인 학원이 없어요
              </div>
            )}
            <div className="border-t border-slate-700 mt-1 pt-1">
              {/* "새 학원 만들기" — ADR-023 (2026-05-24) 다중 학원 무제한.
                  본인 owner 학원 무제한. POST /api/academies 신규 endpoint 사용.
                  Premium 가치는 학원 수 limit 이 아닌 + feature (분점 통합
                  대시보드 등) 으로 차별화 (ADR-022). */}
              <button
                type="button"
                onClick={() => {
                  setShowSwitcher(false);
                  setShowCreateModal(true);
                }}
                data-testid="open-create-academy-modal"
                className="w-full px-3 py-2 text-left text-[11px] text-amber-300 hover:bg-slate-800 rounded-lg"
              >
                + 새 학원 만들기
              </button>
            </div>
          </div>
        )}
          </div>
          )}
          <NotificationDropdown size={expanded ? "md" : "nav"} />
        </div>
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

        {/* 미로그인: 로그인 아이콘, 로그인: 설정 아이콘 (강사 nav 바로 아래) */}
        <SidebarLink
          href={isLoggedIn ? "/settings" : "/login"}
          icon={isLoggedIn ? Settings : LogIn}
          label={isLoggedIn ? "설정" : "로그인"}
          isActive={isActive(isLoggedIn ? "/settings" : "/login")}
          expanded={expanded}
        />
      </div>

      <div className={`mt-auto flex flex-col gap-1 ${expanded ? "w-full px-2" : ""}`}>
        {/* 피드백 보내기 — design-exploration feedback-channel-design Variant A 채택 (2026-05-24).
            학원 멤버 (owner/admin/member) 만 노출. share-token viewer 차단. Phase 1 =
            개발자 (HYUNJIN) 수신 only (proposal phase1-production-release Step 1.1 Option E). */}
        {isLoggedIn && role !== null && (
          <button
            type="button"
            onClick={() => setShowFeedback(true)}
            aria-label="피드백 보내기"
            title={expanded ? "피드백 보내기" : "피드백 보내기"}
            data-testid="open-feedback-modal"
            className={`group relative flex items-center h-10 rounded-admin-md transition-all ${
              expanded
                ? "w-full px-3 gap-3 bg-gradient-to-r from-amber-500/15 to-orange-500/15 hover:from-amber-500/25 hover:to-orange-500/25 border border-amber-500/30 hover:shadow-md"
                : "justify-center w-10 hover:bg-amber-500/15 border border-transparent hover:border-amber-500/30"
            } text-amber-300`}
          >
            <MessageSquare size={20} strokeWidth={1.5} className="flex-shrink-0" />
            {expanded ? (
              <span className="text-sm font-medium whitespace-nowrap">피드백 보내기</span>
            ) : (
              <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-admin-sm bg-[var(--color-bg-secondary)] px-2 py-1 text-caption text-[var(--color-text-primary)] opacity-0 group-hover:opacity-100 transition-opacity shadow-admin-sm z-50">
                피드백 보내기
              </span>
            )}
          </button>
        )}

        {/* User info: email + role + logout (expanded + logged-in only) */}
        {expanded && <UserBottomSection role={role} />}

        {/* Sidebar toggle — Supabase style: small bottom-left icon */}
        <button
          type="button"
          onClick={toggle}
          aria-label={expanded ? "사이드바 접기" : "사이드바 펼치기"}
          title={expanded ? "사이드바 접기 (⌘B)" : "사이드바 펼치기 (⌘B)"}
          className="flex items-center justify-center w-7 h-7 rounded-admin-md text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-overlay-light)] transition-colors"
        >
          {expanded
            ? <PanelLeftClose size={16} strokeWidth={2} />
            : <PanelLeftOpen size={16} strokeWidth={2} />}
        </button>
      </div>
      <CreateAcademyModal
        isOpen={showCreateModal}
        userId={userIdForCreate}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleAcademyCreated}
      />
      <FeedbackModal
        isOpen={showFeedback}
        userId={userIdForCreate}
        onClose={() => setShowFeedback(false)}
      />
    </aside>
  );
}
