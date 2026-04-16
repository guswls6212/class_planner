"use client";

import { useEffect, useState } from "react";

export type SessionStatus = "upcoming" | "in-progress" | "completed";

/**
 * Calculates session status (upcoming / in-progress / completed) relative to now.
 * Updates every 60 seconds via setInterval.
 *
 * @param startsAt  HH:MM session start time
 * @param endsAt    HH:MM session end time
 * @param weekday   0 = Monday … 6 = Sunday  (same convention as Session.weekday)
 */
export function useSessionStatus(
  startsAt: string,
  endsAt: string,
  weekday: number
): SessionStatus {
  const calculate = (): SessionStatus => {
    const now = new Date();
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
  }, [startsAt, endsAt, weekday]);

  return status;
}
