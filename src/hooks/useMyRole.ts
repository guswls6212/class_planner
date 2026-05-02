"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";

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
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

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
            });
          }
          return;
        }

        const userId = session.user.id;
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

        if (!me) {
          setData({
            role: null,
            isLoading: false,
            canManage: false,
            academies: [],
            linkedTeacherId: null,
            linkedTeacherName: null,
            linkedTeacherColor: null,
          });
          return;
        }

        setData({
          role: me.role,
          isLoading: false,
          canManage: me.role === "owner" || me.role === "admin",
          academies: [],
          linkedTeacherId: me.linkedTeacherId,
          linkedTeacherName: me.linkedTeacherName,
          linkedTeacherColor: me.linkedTeacherColor,
        });

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
              setData((prev) => ({ ...prev, academies: list ?? [] }));

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
          });
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return data;
}
