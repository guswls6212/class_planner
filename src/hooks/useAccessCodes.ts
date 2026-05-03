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
  /** True until the first fetch completes (used to gate UI on initial load). */
  hasLoadedOnce: boolean;
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
 * Fetches and manages student access codes for a given user.
 * Filters /api/share-tokens response to entries with access_code set.
 * Pass userId=null to disable fetching (e.g. anonymous users).
 */
export function useAccessCodes(userId: string | null): UseAccessCodesResult {
  const [accessCodes, setAccessCodes] = useState<AccessCodeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) {
      setAccessCodes([]);
      setHasLoadedOnce(true);
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
        setAccessCodes(
          tokens
            .filter((t) => Boolean(t.access_code))
            .map((t) => ({
              id: t.id,
              label: t.label ?? "",
              filter_student_id: t.filter_student_id,
              access_code: t.access_code as string,
              expires_at: t.expires_at,
            }))
        );
      }
    } catch (err) {
      logger.error("접속 코드 로드 실패", undefined, err as Error);
    } finally {
      setIsLoading(false);
      setHasLoadedOnce(true);
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

  const handleRenew = useCallback(async () => {
    if (!userId) return;
    if (typeof window !== "undefined" && !window.confirm("모든 접속 코드를 새로 발급할까요? 기존 코드는 즉시 만료됩니다.")) return;
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
    hasLoadedOnce,
    refresh,
    handleCreate,
    handleRenew,
    handleCreateForStudent,
    handleRenewForStudent,
    handleRevokeForStudent,
  };
}
