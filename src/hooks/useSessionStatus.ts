"use client";

import { useEffect, useState } from "react";

export type SessionStatus = "upcoming" | "in-progress" | "completed";

/**
 * Calculates session status (upcoming / in-progress / completed) relative to now.
 *
 * 2 mode:
 *   1. weekday-only (legacy, default) — instanceDate 미제공 시. weekday !== today → "upcoming".
 *      함정: 이번 주 의 과거 날짜 (목요일에 월요일 session) 도 "upcoming" 반환 → dot 표시 안 됨.
 *   2. date-aware (instanceDate 제공 시) — session 의 실 instance 날짜 + 시간 비교.
 *      과거 날짜 → "completed" (정확). schedule page 가 weekStartDate + weekday 로 계산 후 전달.
 *
 * Updates every 60 seconds via setInterval.
 *
 * @param startsAt    HH:MM session start time
 * @param endsAt      HH:MM session end time
 * @param weekday     0 = Monday … 6 = Sunday  (same convention as Session.weekday)
 * @param instanceDate (옵션) YYYY-MM-DD — 본 session instance 의 실 날짜. 미제공 시 weekday-only mode.
 */
export function useSessionStatus(
  startsAt: string,
  endsAt: string,
  weekday: number,
  instanceDate?: string,
): SessionStatus {
  const calculate = (): SessionStatus => {
    const now = new Date();

    // Mode 2: date-aware (instanceDate 제공 시 우선)
    if (instanceDate) {
      const [yy, mm, dd] = instanceDate.split("-").map(Number);
      if (yy && mm && dd) {
        const [sh, sm] = startsAt.split(":").map(Number);
        const [eh, em] = endsAt.split(":").map(Number);
        const sessionStart = new Date(yy, mm - 1, dd, sh ?? 0, sm ?? 0, 0, 0);
        const sessionEnd = new Date(yy, mm - 1, dd, eh ?? 0, em ?? 0, 0, 0);

        if (now >= sessionEnd) return "completed";
        if (now >= sessionStart) return "in-progress";
        return "upcoming";
      }
    }

    // Mode 1: weekday-only (legacy)
    // JS getDay(): 0=Sun,1=Mon,...,6=Sat → convert to 0=Mon,...,6=Sun
    const currentWeekday = (now.getDay() + 6) % 7;
    if (currentWeekday !== weekday) return "upcoming";

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const [sh, sm] = startsAt.split(":").map(Number);
    const [eh, em] = endsAt.split(":").map(Number);
    const startMinutes = sh * 60 + sm;
    const endMinutes = eh * 60 + em;

    if (currentMinutes >= endMinutes) return "completed";
    if (currentMinutes >= startMinutes) return "in-progress";
    return "upcoming";
  };

  const [status, setStatus] = useState<SessionStatus>(calculate);

  useEffect(() => {
    setStatus(calculate());
    const interval = setInterval(() => setStatus(calculate()), 60_000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startsAt, endsAt, weekday, instanceDate]);

  return status;
}
