"use client";

import { useCallback, useEffect, useState } from "react";
import { showToast } from "../lib/toast";
import { logger } from "../lib/logger";

export interface AccessCodeEntry {
  id: string;
  label: string;
  filter_student_id: string | null;
  access_code: string;
  expires_at: string;
}

interface UseAccessCodesResult {
  accessCodes: AccessCodeEntry[];
  isLoading: boolean;
  /** True if we have any data to render — either from localStorage cache OR
   *  from a completed fetch. Use this to gate UI (skeleton vs. content). */
  hasInitialData: boolean;
  refresh: () => Promise<void>;
  /** Bulk: create codes for any student missing one (academy-wide). */
  handleCreate: () => Promise<void>;
  /** Bulk: revoke all + reissue (academy-wide). User-confirmed. */
  handleRenew: () => Promise<void>;
  /** Per-student: generate a code for one student (no-op if they already have one). */
  handleCreateForStudent: (studentId: string, studentName?: string) => Promise<void>;
  /** Per-student: revoke + reissue for one student. User-confirmed. */
  handleRenewForStudent: (studentId: string, studentName?: string) => Promise<void>;
  /** Per-student: revoke (expire) one student's code. User-confirmed. */
  handleRevokeForStudent: (studentId: string, studentName?: string) => Promise<void>;
}

/**
 * localStorage key for access-code cache (scoped per user).
 * Stale-while-revalidate pattern: cached value is shown instantly on
 * re-entry; a fresh fetch runs in the background and silently updates the
 * UI when complete. Class-planner is Local-first (per ARCHITECTURE.md
 * § 1.2) so this matches the rest of the data model.
 */
const cacheKey = (userId: string) => `class_planner_access_codes_${userId}`;

function readCache(userId: string | null): AccessCodeEntry[] | null {
  if (!userId || typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(cacheKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AccessCodeEntry[]) : null;
  } catch {
    return null;
  }
}

function writeCache(userId: string | null, codes: AccessCodeEntry[]) {
  if (!userId || typeof window === "undefined") return;
  try {
    localStorage.setItem(cacheKey(userId), JSON.stringify(codes));
  } catch {
    // localStorage quota / disabled — silent (cache is a best-effort optimization)
  }
}

/**
 * Fetches and manages student access codes for a given user.
 * Stale-while-revalidate via localStorage cache: cached codes are shown
 * instantly on re-entry, then refreshed in background. Pass userId=null
 * to disable both cache and fetching (e.g. anonymous users).
 */
export function useAccessCodes(userId: string | null): UseAccessCodesResult {
  // Lazy-initialize from cache so re-entry is instant (no skeleton flash).
  // Server render returns [] (typeof window === undefined), client first
  // render hydrates from cache — same as ThemeContext pattern but here the
  // SSR/client mismatch is fine because this only renders inside admin
  // routes which are CSR-after-hydration.
  const [accessCodes, setAccessCodes] = useState<AccessCodeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasInitialData, setHasInitialData] = useState(false);

  // Hydrate cache after mount (avoid SSR/client mismatch)
  useEffect(() => {
    const cached = readCache(userId);
    if (cached && cached.length > 0) {
      setAccessCodes(cached);
      setHasInitialData(true);
    }
  }, [userId]);

  const refresh = useCallback(async () => {
    if (!userId) {
      setAccessCodes([]);
      setHasInitialData(true);
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`/api/share-tokens?userId=${userId}`);
      if (res.ok) {
        const { data } = await res.json();
        const tokens = (data ?? []) as Array<{
          id: string;
          label: string | null;
          filter_student_id: string | null;
          access_code?: string | null;
          expires_at: string;
        }>;
        const next = tokens
          .filter((t) => Boolean(t.access_code))
          .map((t) => ({
            id: t.id,
            label: t.label ?? "",
            filter_student_id: t.filter_student_id,
            access_code: t.access_code as string,
            expires_at: t.expires_at,
          }));
        setAccessCodes(next);
        writeCache(userId, next);
      }
    } catch (err) {
      logger.error("접속 코드 로드 실패", undefined, err as Error);
    } finally {
      setIsLoading(false);
      setHasInitialData(true);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleCreate = useCallback(async () => {
    if (!userId) return;
    const res = await fetch(`/api/share-tokens/access-codes?userId=${userId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "create" }),
    });
    if (res.ok) {
      const data = await res.json();
      if ((data.created ?? 0) > 0) {
        showToast("success", `${data.created}명의 접속 코드가 생성됐습니다.`);
      } else {
        showToast("info", "모든 학생에게 이미 코드가 있습니다.");
      }
      await refresh();
    } else {
      showToast("error", "코드 생성에 실패했습니다.");
    }
  }, [userId, refresh]);

  // NOTE: 'renew' is destructive (revokes all existing codes). Caller is
  // responsible for confirmation (e.g. via ConfirmModal in StudentsPageLayout).
  // Internal window.confirm was removed in PR β so the UI can present a
  // richer warning with impact preview ("N명에게 재공유 필요").
  const handleRenew = useCallback(async () => {
    if (!userId) return;
    const res = await fetch(`/api/share-tokens/access-codes?userId=${userId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "renew" }),
    });
    if (res.ok) {
      showToast("success", "모든 접속 코드가 갱신됐습니다.");
      await refresh();
    } else {
      showToast("error", "코드 갱신에 실패했습니다.");
    }
  }, [userId, refresh]);

  const handleCreateForStudent = useCallback(
    async (studentId: string, studentName?: string) => {
      if (!userId) return;
      const res = await fetch(`/api/share-tokens/access-codes?userId=${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "create", studentIds: [studentId] }),
      });
      if (res.ok) {
        const data = await res.json();
        if ((data.created ?? 0) > 0) {
          showToast("success", `${studentName ?? "학생"} 접속 코드가 생성됐습니다.`);
        } else {
          showToast("info", "이 학생에게 이미 코드가 있습니다.");
        }
        await refresh();
      } else {
        showToast("error", "코드 생성에 실패했습니다.");
      }
    },
    [userId, refresh],
  );

  const handleRenewForStudent = useCallback(
    async (studentId: string, studentName?: string) => {
      if (!userId) return;
      if (typeof window !== "undefined" && !window.confirm(`${studentName ?? "이 학생"}의 접속 코드를 재발급할까요? 기존 코드는 즉시 만료됩니다.`)) return;
      const res = await fetch(`/api/share-tokens/access-codes?userId=${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "renew", studentIds: [studentId] }),
      });
      if (res.ok) {
        showToast("success", `${studentName ?? "학생"} 접속 코드가 재발급됐습니다.`);
        await refresh();
      } else {
        showToast("error", "코드 재발급에 실패했습니다.");
      }
    },
    [userId, refresh],
  );

  const handleRevokeForStudent = useCallback(
    async (studentId: string, studentName?: string) => {
      if (!userId) return;
      if (typeof window !== "undefined" && !window.confirm(`${studentName ?? "이 학생"}의 접속 코드를 만료시킬까요? 학부모 접속이 즉시 차단됩니다.`)) return;
      const res = await fetch(`/api/share-tokens/access-codes?userId=${userId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId }),
      });
      if (res.ok) {
        showToast("success", `${studentName ?? "학생"} 접속 코드가 만료됐습니다.`);
        await refresh();
      } else {
        showToast("error", "코드 만료에 실패했습니다.");
      }
    },
    [userId, refresh],
  );

  return {
    accessCodes,
    isLoading,
    hasInitialData,
    refresh,
    handleCreate,
    handleRenew,
    handleCreateForStudent,
    handleRenewForStudent,
    handleRevokeForStudent,
  };
}
