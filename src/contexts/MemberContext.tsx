"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
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
   * 1이면 "다른 관리자가 있을 수 없음" → 시간표 변경 알림 토스트 suppress 등에 활용.
   * 익명 사용자/비회원은 0.
   */
  adminCount: number;
}

// sessionStorage cache — tab session 내에서 결과 재사용.
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

const DEFAULT_LOADING_DATA: CurrentMemberData = {
  role: null,
  isLoading: true,
  canManage: false,
  academies: [],
  linkedTeacherId: null,
  linkedTeacherName: null,
  linkedTeacherColor: null,
  adminCount: 0,
};

const MemberContext = createContext<CurrentMemberData | null>(null);

/**
 * MemberProvider — root 1회 fetch + 모든 consumer 공유.
 *
 * 이전엔 useMyRole 훅이 컴포넌트별로 mount될 때마다 자체 useEffect로
 * /api/members, /api/academies/mine, /api/auth/set-role-cookie를 호출했음.
 * sessionStorage cache가 *결과*는 공유했지만 *in-flight* request는 공유 못 함
 * → /schedule 같이 useMyRole 호출하는 5+ 컴포넌트가 동시 mount하면 같은 3개
 * endpoint가 4-6번 중복 호출.
 *
 * 본 Provider는 AuthProvider 안쪽에 mount되어 root 1회만 fetch 실행. 모든
 * consumer는 `useMemberContext()` (또는 같은 의미의 `useMyRole()` re-export)
 * 로 같은 메모리 상태를 읽음.
 *
 * Fallback: Provider 없이 useMemberContext 호출 시 (SSR/test 미설치) 기존
 * loading default 반환 — 기존 useMyRole 훅의 초기 상태와 일치.
 */
export function MemberProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<CurrentMemberData>(DEFAULT_LOADING_DATA);
  // class-planner:academy-changed 이벤트 등으로 강제 재fetch trigger.
  // 첫 onboarding 직후 academy_members INSERT 와 첫 fetch 간 read-after-write race
  // 가 발생해 me=null → canManage:false 영속화되던 사고 회피 (S-1.5 사고, 2026-05-20).
  // 새로고침 시에만 해결되던 증상 (FAB 사라짐 / 모달 안 열림 / 빈칸 클릭 무반응)
  // → academy-changed 이벤트로 강제 재fetch + cache 무효화.
  const [refetchToken, setRefetchToken] = useState(0);

  const { session, loading: authLoading } = useAuth();

  // class-planner:academy-changed 이벤트 listen → cache 무효화 + refetchToken bump
  // → 메인 useEffect 재실행. onboarding API success 직후 자연 발화 (page.tsx:97).
  useEffect(() => {
    const onAcademyChanged = () => {
      const uid = session?.user?.id;
      if (uid) {
        try {
          sessionStorage.removeItem(`${CACHE_KEY_PREFIX}${uid}`);
        } catch {
          // non-blocking
        }
      }
      setRefetchToken((t) => t + 1);
    };
    window.addEventListener("class-planner:academy-changed", onAcademyChanged);
    return () => {
      window.removeEventListener(
        "class-planner:academy-changed",
        onAcademyChanged,
      );
    };
  }, [session?.user?.id]);

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
          // me=null 케이스는 두 경로:
          //   (a) 사용자가 해당 학원의 멤버가 아님 (정상 — owner=true 권한 X)
          //   (b) onboarding INSERT 직후 fetch가 read-after-write race로 응답에
          //       me 누락 (S-1.5 사고)
          // 둘을 fetch만으로 구분 불가하므로 cache에 영속화하지 않는다 (옵션 2).
          // class-planner:academy-changed 이벤트로 자연 재fetch (옵션 1) +
          // 이번 응답은 화면에 반영하되 cache는 skip → 다음 mount/이벤트 시 새로
          // fetch해 정정 가능 (race 결과 stuck 차단).
          const freshSnapshot: CachedRoleSnapshot = {
            role: null,
            canManage: false,
            academies: cached?.academies ?? [],
            linkedTeacherId: null,
            linkedTeacherName: null,
            linkedTeacherColor: null,
            adminCount,
          };
          // saveRoleCache(userId, freshSnapshot); // 의도적 skip — race 결과 영속화 X
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
    // session 객체 reference 흔들림(Supabase의 getSession + onAuthStateChange
    // 'INITIAL_SESSION' + TOKEN_REFRESHED가 같은 user에 대해 setSession을 여러 번
    // 호출)으로 useEffect 재실행 → /api/members 등 3회 호출되던 사고 회피.
    // user.id 변화(다른 user 로그인) 또는 session null↔valid 전이만 trigger.
    // refetchToken 은 class-planner:academy-changed 이벤트에서 bump (S-1.5 race fix).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, session?.user?.id ?? null, refetchToken]);

  return (
    <MemberContext.Provider value={data}>{children}</MemberContext.Provider>
  );
}

/**
 * Returns the current user's role in the academy and linked teacher info.
 * Reads from MemberContext (root-mounted Provider). When the Provider is not
 * mounted (SSR snapshot / lone test render without wrapper), returns the
 * pessimistic loading default — matches the previous useMyRole hook's initial
 * state so consumers branching on isLoading/canManage stay safe.
 *
 * Loading default: isLoading=true, canManage=false (pessimistic — prevents
 * member users from briefly seeing admin-only UI while the request is in flight).
 * Owners get canManage=true after the API response (no flash of restricted
 * content because admin UI is rendered conditionally on canManage). Consumers
 * that need to render optimistically (e.g. the sidebar) should branch on
 * isLoading themselves.
 */
export function useMemberContext(): CurrentMemberData {
  const ctx = useContext(MemberContext);
  if (!ctx) {
    return DEFAULT_LOADING_DATA;
  }
  return ctx;
}
