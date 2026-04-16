"use client";

import { useState } from "react";

interface AttendanceEntry {
  status: string;
  notes?: string | null;
}

type AttendanceMap = Record<string, Record<string, AttendanceEntry>>;

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
      [sessionId]: { ...(prev[sessionId] ?? {}), ...entries },
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
        [row.student_id]: { status: row.status, notes: row.notes },
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
      [sessionId]: { ...(prev[sessionId] ?? {}), ...entries },
    }));
  };

  return { attendance, fetchAttendance, markAttendance, markAllPresent };
}
