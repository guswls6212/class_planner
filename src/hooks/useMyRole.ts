"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";

export interface CurrentMemberData {
  role: "owner" | "admin" | "member" | null;
  isLoading: boolean;
  canManage: boolean;
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
 */
export function useMyRole(): CurrentMemberData {
  const [data, setData] = useState<CurrentMemberData>({
    role: null,
    isLoading: true,
    canManage: false,
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
            setData({
              role: null,
              isLoading: false,
              canManage: false,
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
          linkedTeacherId: me.linkedTeacherId,
          linkedTeacherName: me.linkedTeacherName,
          linkedTeacherColor: me.linkedTeacherColor,
        });
      } catch {
        if (!cancelled) {
          // On network error, fail closed — deny access rather than grant it.
          // The loading state stays optimistic (canManage: true) to prevent flash
          // of restricted UI for owners while the request is in flight.
          setData({
            role: null,
            isLoading: false,
            canManage: false,
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
