"use client";

import { useCallback, useState } from "react";
import { useLocal } from "./useLocal";

export type ScheduleViewMode = "daily" | "weekly" | "monthly";

interface UseScheduleViewReturn {
  viewMode: ScheduleViewMode;
  setViewMode: (mode: ScheduleViewMode) => void;
  selectedDate: Date;
  selectedWeekday: number; // 0=Mon, 1=Tue, ... 6=Sun
  goToNextDay: () => void;
  goToPrevDay: () => void;
  goToNextWeek: () => void;
  goToPrevWeek: () => void;
  goToToday: () => void;
  setSelectedDate: (date: Date) => void;
  goToNextMonth: () => void;
  goToPrevMonth: () => void;
  currentMonthLabel: string; // e.g. "2026년 4월"
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

  const goToNextWeek = useCallback(() => {
    setSelectedDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + 7);
      return next;
    });
  }, []);

  const goToPrevWeek = useCallback(() => {
    setSelectedDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() - 7);
      return next;
    });
  }, []);

  const goToNextMonth = useCallback(() => {
    setSelectedDate((prev) => {
      const next = new Date(prev);
      next.setDate(1);
      next.setMonth(next.getMonth() + 1);
      return next;
    });
  }, []);

  const goToPrevMonth = useCallback(() => {
    setSelectedDate((prev) => {
      const next = new Date(prev);
      next.setDate(1);
      next.setMonth(next.getMonth() - 1);
      return next;
    });
  }, []);

  const currentMonthLabel = `${selectedDate.getFullYear()}년 ${selectedDate.getMonth() + 1}월`;

  return {
    viewMode: storedView,
    setViewMode: setStoredView,
    selectedDate,
    selectedWeekday,
    goToNextDay,
    goToPrevDay,
    goToNextWeek,
    goToPrevWeek,
    goToToday,
    setSelectedDate,
    goToNextMonth,
    goToPrevMonth,
    currentMonthLabel,
  };
}
