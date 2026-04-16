"use client";

import { useCallback, useState } from "react";
import { useLocal } from "./useLocal";

export type ScheduleViewMode = "daily" | "weekly";

interface UseScheduleViewReturn {
  viewMode: ScheduleViewMode;
  setViewMode: (mode: ScheduleViewMode) => void;
  selectedDate: Date;
  selectedWeekday: number; // 0=Mon, 1=Tue, ... 6=Sun
  goToNextDay: () => void;
  goToPrevDay: () => void;
  goToToday: () => void;
  setSelectedDate: (date: Date) => void;
}

export function useScheduleView(): UseScheduleViewReturn {
  // Default: daily on mobile (< 768px), weekly on desktop
  const defaultMode: ScheduleViewMode =
    typeof window !== "undefined" && window.innerWidth < 768 ? "daily" : "weekly";

  const [storedView, setStoredView] = useLocal<ScheduleViewMode>("ui:scheduleView", defaultMode);
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  // Monday-based weekday: 0=Mon, 1=Tue, ..., 6=Sun
  const selectedWeekday = (selectedDate.getDay() + 6) % 7;

  const goToNextDay = useCallback(() => {
    setSelectedDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + 1);
      return next;
    });
  }, []);

  const goToPrevDay = useCallback(() => {
    setSelectedDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() - 1);
      return next;
    });
  }, []);

  const goToToday = useCallback(() => {
    setSelectedDate(new Date());
  }, []);

  return {
    viewMode: storedView,
    setViewMode: setStoredView,
    selectedDate,
    selectedWeekday,
    goToNextDay,
    goToPrevDay,
    goToToday,
    setSelectedDate,
  };
}
