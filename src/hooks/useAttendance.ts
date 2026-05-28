"use client";

import { useCallback, useRef, useState } from "react";

interface AttendanceEntry {
  status: string;
  notes?: string | null;
}

/**
 * State 구조 — 2 차원 key: sessionId → date(YYYY-MM-DD) → studentId → entry.
 * 과거 일자 / 오늘 / 다른 주 출결을 동시에 유지 (이전: sessionId-only 였어서 다중 date 시 override).
 * 사용자 명시 (2026-05-28, PR #549): 과거 날짜 미체크 session 도 dot 표시 — 다중 date 동시 보존 필요.
 */
type AttendanceMap = Record<
  string, // sessionId
  Record<
    string, // date YYYY-MM-DD
    Record<string, AttendanceEntry> // studentId → entry
  >
>;

interface RawAttendanceRow {
  student_id: string;
  status: string;
  notes?: string | null;
  date: string;
}

export function useAttendance(userId: string | null) {
  const [attendance, setAttendance] = useState<AttendanceMap>({});

  // 같은 (sessionId, date) fetch 중복 회피 — useCallback + ref dedup.
  // 사용자 사고 (2026-05-28, PR #548): caller useEffect dep (fetchAttendance new ref 매 render) 변경마다
  // 재호출 → server 폭주. ref 로 dedup + useCallback 으로 dep 안정.
  const fetchedRef = useRef<Set<string>>(new Set());
  const lastUserIdRef = useRef<string | null>(null);
  if (lastUserIdRef.current !== userId) {
    fetchedRef.current = new Set();
    lastUserIdRef.current = userId;
  }

  const fetchAttendance = useCallback(
    async (sessionId: string, date: string) => {
      if (!userId) return;
      const key = `${sessionId}|${date}`;
      if (fetchedRef.current.has(key)) return;
      fetchedRef.current.add(key);

      const url = `/api/attendance?userId=${userId}&sessionId=${sessionId}&date=${date}`;
      const res = await fetch(url, undefined);
      if (!res.ok) {
        fetchedRef.current.delete(key);
        return;
      }

      const json = await res.json();
      if (!json.success) {
        fetchedRef.current.delete(key);
        return;
      }

      const entries: Record<string, AttendanceEntry> = {};
      for (const row of (json.data as RawAttendanceRow[])) {
        entries[row.student_id] = { status: row.status, notes: row.notes };
      }

      setAttendance((prev) => ({
        ...prev,
        [sessionId]: {
          ...(prev[sessionId] ?? {}),
          [date]: { ...((prev[sessionId] ?? {})[date] ?? {}), ...entries },
        },
      }));
    },
    [userId],
  );

  const markAttendance = useCallback(
    async (
      sessionId: string,
      studentId: string,
      date: string,
      status: string,
      notes?: string,
    ) => {
      if (!userId) return;

      const res = await fetch(`/api/attendance?userId=${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, studentId, date, status, notes }),
      });
      if (!res.ok) return;

      const json = await res.json();
      if (!json.success) return;

      const row = json.data as RawAttendanceRow;
      setAttendance((prev) => ({
        ...prev,
        [sessionId]: {
          ...(prev[sessionId] ?? {}),
          [date]: {
            ...((prev[sessionId] ?? {})[date] ?? {}),
            [row.student_id]: { status: row.status, notes: row.notes },
          },
        },
      }));
      fetchedRef.current.add(`${sessionId}|${date}`);
    },
    [userId],
  );

  const markAllPresent = useCallback(
    async (sessionId: string, studentIds: string[], date: string) => {
      if (!userId) return;

      const res = await fetch(`/api/attendance/bulk?userId=${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          date,
          records: studentIds.map((id) => ({ studentId: id, status: "present" })),
        }),
      });
      if (!res.ok) return;

      const json = await res.json();
      if (!json.success) return;

      const entries: Record<string, AttendanceEntry> = {};
      for (const row of (json.data as RawAttendanceRow[])) {
        entries[row.student_id] = { status: row.status, notes: row.notes };
      }

      setAttendance((prev) => ({
        ...prev,
        [sessionId]: {
          ...(prev[sessionId] ?? {}),
          [date]: { ...((prev[sessionId] ?? {})[date] ?? {}), ...entries },
        },
      }));
      fetchedRef.current.add(`${sessionId}|${date}`);
    },
    [userId],
  );

  /**
   * session schedule 이동 시 attendance 도 새 date 로 옮김 (B move 정책, 2026-05-28, PR #550).
   * 사용자 명시: session 이동 = "session instance 자체 이동" → 출결 fact 따라옴.
   *
   * @returns count of migrated records. null on error.
   *   - DUPLICATE_DATE error (409) — newDate 에 이미 attendance 있음 → caller 가 toast 안내
   */
  const migrateAttendance = useCallback(
    async (
      sessionId: string,
      oldDate: string,
      newDate: string,
    ): Promise<{ count: number; error?: "DUPLICATE_DATE" | "FAIL" } | null> => {
      if (!userId) return null;
      if (oldDate === newDate) return { count: 0 };

      const res = await fetch(`/api/attendance/migrate?userId=${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, oldDate, newDate }),
      });

      if (!res.ok) {
        if (res.status === 409) {
          return { count: 0, error: "DUPLICATE_DATE" };
        }
        return { count: 0, error: "FAIL" };
      }

      const json = await res.json();
      if (!json.success) return { count: 0, error: "FAIL" };

      const rows = (json.data ?? []) as RawAttendanceRow[];

      // local state 갱신: oldDate cache 무효화 + newDate 에 migrated entries.
      // date-aware shape (PR #549) — oldDate 삭제 + newDate 에 set.
      fetchedRef.current.delete(`${sessionId}|${oldDate}`);
      fetchedRef.current.delete(`${sessionId}|${newDate}`);

      const entries: Record<string, AttendanceEntry> = {};
      for (const row of rows) {
        entries[row.student_id] = { status: row.status, notes: row.notes };
      }
      setAttendance((prev) => {
        const sessionMap = { ...(prev[sessionId] ?? {}) };
        // oldDate 의 entries 제거 — server 에서 이미 옮겼으므로 local 도 정합.
        delete sessionMap[oldDate];
        // newDate 에 migrated entries set (기존 entry 와 merge)
        sessionMap[newDate] = { ...(sessionMap[newDate] ?? {}), ...entries };
        return { ...prev, [sessionId]: sessionMap };
      });

      return { count: rows.length };
    },
    [userId],
  );

  return {
    attendance,
    fetchAttendance,
    markAttendance,
    markAllPresent,
    migrateAttendance,
  };
}
