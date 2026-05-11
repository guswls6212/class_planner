"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

export interface AcademyMembership {
  id: string;
  name: string;
  slug: string | null;
  role: string;
}

export interface CurrentMemberData {
  role: "owner" | "admin" | "member" | null;
  isLoading: boolean;
  canManage: boolean;
  academies: AcademyMembership[];
  linkedTeacherId: string | null;
  linkedTeacherName: string | null;
  linkedTeacherColor: string | null;
  /**
   * 활성 academy의 owner+admin 수.
   * 1이면 \"다른 관리자가 있을 수 없음\" → 시간표 변경 알림 토스트 suppress 등에 활용.
   * 익명 사용자/비회원은 0.
   */
  adminCount: number;
}

// sessionStorage cache — tab session 내에서 useMyRole 결과 재사용.
// 첫 render: fetch async로 isLoading=true → canManage=false flash (TemplateMenuV2
// 등 conditional UI 일시 숨김 → e2e timeout 또는 사용자 paint flash). Cache hit
// 시 즉시 hydrate로 race 제거. background fetch는 항상 실행해 stale 갱신.
// tab 종료 시 자동 폐기(sessionStorage) — multi-user/권한 변경 stale 위험 최소.
const CACHE_KEY_PREFIX = "useMyRole_v1_";

interface CachedRoleSnapshot {
  role: "owner" | "admin" | "member" | null;
  canManage: boolean;
  linkedTeacherId: string | null;
  linkedTeacherName: string | null;
  linkedTeacherColor: string | null;
  adminCount: number;
  academies: AcademyMembership[];
}

function loadRoleCache(userId: string): CachedRoleSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(`${CACHE_KEY_PREFIX}${userId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CachedRoleSnapshot>;
    // 최소 schema 검증 — 손상된 cache는 무시
    if (typeof parsed.canManage !== "boolean") return null;
    if (!Array.isArray(parsed.academies)) return null;
    return parsed as CachedRoleSnapshot;
  } catch {
    return null;
  }
}

function saveRoleCache(userId: string, data: CachedRoleSnapshot): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      `${CACHE_KEY_PREFIX}${userId}`,
      JSON.stringify(data),
    );
  } catch {
    // sessionStorage full/denied — non-blocking
  }
}

/**
 * Returns the current user's role in the academy and linked teacher info.
 * Fetched from /api/members?userId={userId}.
 *
 * Loading default: isLoading=true, canManage=false (pessimistic — prevents
 * member users from briefly seeing admin-only UI while the request is in flight).
 * Owners get canManage=true after the API response (no flash of restricted
 * content because admin UI is rendered conditionally on canManage). Consumers
 * that need to render optimistically (e.g. the sidebar) should branch on
 * isLoading themselves.
 *
 * Also fetches the user's academies list (multi-academy support) and
 * initializes the active academy in localStorage if not already set.
 * The academies fetch is non-blocking — failure leaves academies=[] but
 * does not affect role/canManage resolution.
 */
export function useMyRole(): CurrentMemberData {
  const [data, setData] = useState<CurrentMemberData>({
    role: null,
    isLoading: true,
    canManage: false,
    academies: [],
    linkedTeacherId: null,
    linkedTeacherName: null,
    linkedTeacherColor: null,
    adminCount: 0,
  });

  const { session, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;

    let cancelled = false;

    async function load() {
      try {
        if (!session) {
          if (!cancelled) {
            // Anonymous-First: no session means the user is not a member of any
            // academy. They use localStorage only and must be able to create/edit
            // sessions, students, and subjects.
            setData({
              role: null,
              isLoading: false,
              canManage: true,
              academies: [],
              linkedTeacherId: null,
              linkedTeacherName: null,
              linkedTeacherColor: null,
              adminCount: 0,
            });
          }
          return;
        }

        const userId = session.user.id;

        // Cache hit: 즉시 hydrate로 first-paint race 제거 (e2e flaky + UX flash).
        // background fetch는 그대로 진행해 stale 갱신.
        const cached = loadRoleCache(userId);
        if (cached && !cancelled) {
          setData({
            ...cached,
            isLoading: false,
          });
        }

        const res = await fetch(`/api/members?userId=${userId}`);
        if (!res.ok || cancelled) return;

        const json = await res.json();
        const members: Array<{
          userId: string;
          role: "owner" | "admin" | "member";
          linkedTeacherId: string | null;
          linkedTeacherName: string | null;
          linkedTeacherColor: string | null;
        }> = json.data ?? [];

        const me = members.find((m) => m.userId === userId);
        if (cancelled) return;

        // owner+admin 멤버 수 — 단일 admin 학원에서 schedule 변경 토스트 suppress
        // 등의 UX 가드에 사용.
        const adminCount = members.filter(
          (m) => m.role === "owner" || m.role === "admin",
        ).length;

        if (!me) {
          const freshSnapshot: CachedRoleSnapshot = {
            role: null,
            canManage: false,
            academies: cached?.academies ?? [],
            linkedTeacherId: null,
            linkedTeacherName: null,
            linkedTeacherColor: null,
            adminCount,
          };
          saveRoleCache(userId, freshSnapshot);
          setData({ ...freshSnapshot, isLoading: false });
          return;
        }

        const freshSnapshot: CachedRoleSnapshot = {
          role: me.role,
          canManage: me.role === "owner" || me.role === "admin",
          academies: cached?.academies ?? [],
          linkedTeacherId: me.linkedTeacherId,
          linkedTeacherName: me.linkedTeacherName,
          linkedTeacherColor: me.linkedTeacherColor,
          adminCount,
        };
        saveRoleCache(userId, freshSnapshot);
        setData({ ...freshSnapshot, isLoading: false });

        // Sync role to a server-readable cookie so the Next.js middleware
        // can enforce route-level RBAC. Fire-and-forget — failure here is
        // non-blocking; the middleware's missing-cookie path falls through
        // to allow access (loading state semantics).
        fetch("/api/auth/set-role-cookie", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: me.role }),
        }).catch(() => {});

        // Multi-academy: fetch the user's academies list and initialize
        // the active academy in localStorage if not yet set.
        // This is non-blocking: failure here leaves academies=[] but
        // does not affect role/canManage resolution above.
        try {
          const academiesRes = await fetch(`/api/academies/mine?userId=${userId}`);
          if (academiesRes.ok && !cancelled) {
            const { academies: list } = (await academiesRes.json()) as {
              academies: AcademyMembership[];
            };
            if (!cancelled) {
              setData((prev) => {
                const next = { ...prev, academies: list ?? [] };
                // academies는 cache에도 저장 — 다음 tab session 시작 시 즉시 hydrate.
                saveRoleCache(userId, {
                  role: next.role,
                  canManage: next.canManage,
                  academies: next.academies,
                  linkedTeacherId: next.linkedTeacherId,
                  linkedTeacherName: next.linkedTeacherName,
                  linkedTeacherColor: next.linkedTeacherColor,
                  adminCount: next.adminCount,
                });
                return next;
              });

              const { getActiveAcademyId, setActiveAcademyId } = await import(
                "@/lib/localStorageCrud"
              );
              const currentActive = getActiveAcademyId(userId);
              if (!currentActive && list && list.length > 0) {
                // First entry is owner-priority sorted by /api/academies/mine.
                setActiveAcademyId(userId, list[0].id);
              }
            }
          }
        } catch {
          // Non-blocking: leave academies=[] on failure. Role/canManage
          // already committed above.
        }
      } catch {
        if (!cancelled) {
          // On network error, fail closed — deny access rather than grant it.
          setData({
            role: null,
            isLoading: false,
            canManage: false,
            academies: [],
            linkedTeacherId: null,
            linkedTeacherName: null,
            linkedTeacherColor: null,
            adminCount: 0,
          });
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [authLoading, session]);

  return data;
}
