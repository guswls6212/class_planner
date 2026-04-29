"use client";
import { useEffect, useState } from "react";

/**
 * Returns the current Date, updated at each minute boundary (00 seconds).
 * Uses minute-boundary sync: waits for the next :00 second, then fires every 60s.
 * Resyncs when the tab becomes visible again (visibilitychange).
 */
export function useNowMinute(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    let intervalId: ReturnType<typeof setInterval>;

    function scheduleNextMinute() {
      const ms = new Date();
      const msUntilNextMinute = (60 - ms.getSeconds()) * 1000 - ms.getMilliseconds();
      timeoutId = setTimeout(() => {
        setNow(new Date());
        intervalId = setInterval(() => setNow(new Date()), 60_000);
      }, msUntilNextMinute);
    }

    scheduleNextMinute();

    // Resync when tab becomes visible
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        clearTimeout(timeoutId);
        clearInterval(intervalId);
        setNow(new Date());
        scheduleNextMinute();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return now;
}
