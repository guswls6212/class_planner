"use client";

import { useState } from "react";

interface AttendanceEntry {
  status: string;
  notes?: string | null;
}

/**
 * State 구조 — 2 차원 key: sessionId → date(YYYY-MM-DD) → studentId → entry.
 * 과거 일자 / 오늘 / 다른 주 출결을 동시에 유지 (이전: sessionId-only 였어서 다중 date 시 override).
 * 사용자 명시 (2026-05-28): 과거 날짜 미체크 session 도 dot 표시 — 다중 date 동시 보존 필요.
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
}

export function useAttendance(userId: string | null) {
  const [attendance, setAttendance] = useState<AttendanceMap>({});

  const fetchAttendance = async (sessionId: string, date: string) => {
    if (!userId) return;

    const url = `/api/attendance?userId=${userId}&sessionId=${sessionId}&date=${date}`;
    const res = await fetch(url, undefined);
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
  };

  const markAttendance = async (
    sessionId: string,
    studentId: string,
    date: string,
    status: string,
    notes?: string
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
  };

  const markAllPresent = async (
    sessionId: string,
    studentIds: string[],
    date: string
  ) => {
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
  };

  return { attendance, fetchAttendance, markAttendance, markAllPresent };
}
