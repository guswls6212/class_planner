import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useState } from "react";
import { useScheduleView } from "../useScheduleView";

// Mock useLocal to avoid localStorage issues in tests
vi.mock("../useLocal", () => ({
  useLocal: vi.fn((key: string, initial: unknown) => {
    return useState(initial);
  }),
}));

describe("useScheduleView", () => {
  it("initializes with correct selectedWeekday for today", () => {
    const { result } = renderHook(() => useScheduleView());
    const today = new Date();
    const expectedWeekday = (today.getDay() + 6) % 7;
    expect(result.current.selectedWeekday).toBe(expectedWeekday);
  });

  it("goToNextDay increments the date", () => {
    const { result } = renderHook(() => useScheduleView());
    const before = new Date(result.current.selectedDate);
    act(() => result.current.goToNextDay());
    const after = new Date(result.current.selectedDate);
    expect(after.getDate()).toBe(before.getDate() + 1 > new Date(before.getFullYear(), before.getMonth() + 1, 0).getDate() ? 1 : before.getDate() + 1);
  });

  it("goToPrevDay decrements the date", () => {
    vi.setSystemTime(new Date("2026-04-16T12:00:00")); // Thursday
    const { result } = renderHook(() => useScheduleView());
    const before = new Date(result.current.selectedDate);
    act(() => result.current.goToPrevDay());
    const after = new Date(result.current.selectedDate);
    expect(after.getDate()).toBe(before.getDate() - 1);
    vi.useRealTimers();
  });

  it("goToToday resets to today", () => {
    vi.setSystemTime(new Date("2026-04-16T12:00:00"));
    const { result } = renderHook(() => useScheduleView());
    act(() => result.current.goToNextDay());
    act(() => result.current.goToToday());
    const today = new Date();
    expect(result.current.selectedDate.toDateString()).toBe(today.toDateString());
    vi.useRealTimers();
  });

  it("setViewMode persists view mode", () => {
    const { result } = renderHook(() => useScheduleView());
    act(() => result.current.setViewMode("weekly"));
    expect(result.current.viewMode).toBe("weekly");
    act(() => result.current.setViewMode("daily"));
    expect(result.current.viewMode).toBe("daily");
  });

  it("setViewMode('monthly') persists monthly mode", () => {
    const { result } = renderHook(() => useScheduleView());
    act(() => result.current.setViewMode("monthly"));
    expect(result.current.viewMode).toBe("monthly");
  });

  it("goToNextMonth increments the month", () => {
    vi.setSystemTime(new Date("2026-04-16T12:00:00"));
    const { result } = renderHook(() => useScheduleView());
    act(() => result.current.goToNextMonth());
    expect(result.current.selectedDate.getMonth()).toBe(4); // May = 4
    vi.useRealTimers();
  });

  it("goToPrevMonth decrements the month", () => {
    vi.setSystemTime(new Date("2026-04-16T12:00:00"));
    const { result } = renderHook(() => useScheduleView());
    act(() => result.current.goToPrevMonth());
    expect(result.current.selectedDate.getMonth()).toBe(2); // March = 2
    vi.useRealTimers();
  });

  it("currentMonthLabel returns 'YYYY년 M월' format", () => {
    vi.setSystemTime(new Date("2026-04-16T12:00:00"));
    const { result } = renderHook(() => useScheduleView());
    expect(result.current.currentMonthLabel).toBe("2026년 4월");
    vi.useRealTimers();
  });

  it("selectedWeekday is 0 (Mon) for a Monday", () => {
    vi.setSystemTime(new Date("2026-04-13T12:00:00")); // Monday
    const { result } = renderHook(() => useScheduleView());
    expect(result.current.selectedWeekday).toBe(0);
    vi.useRealTimers();
  });

  it("selectedWeekday is 6 (Sun) for a Sunday", () => {
    vi.setSystemTime(new Date("2026-04-19T12:00:00")); // Sunday
    const { result } = renderHook(() => useScheduleView());
    expect(result.current.selectedWeekday).toBe(6);
    vi.useRealTimers();
  });

  it("goToNextWeek advances selectedDate by exactly 7 days", () => {
    vi.setSystemTime(new Date("2026-04-16T12:00:00")); // Thursday
    const { result } = renderHook(() => useScheduleView());
    const before = new Date(result.current.selectedDate);
    act(() => result.current.goToNextWeek());
    const after = result.current.selectedDate;
    const diff = (after.getTime() - before.getTime()) / (1000 * 60 * 60 * 24);
    expect(diff).toBe(7);
    vi.useRealTimers();
  });

  it("goToPrevWeek retreats selectedDate by exactly 7 days", () => {
    vi.setSystemTime(new Date("2026-04-16T12:00:00")); // Thursday
    const { result } = renderHook(() => useScheduleView());
    const before = new Date(result.current.selectedDate);
    act(() => result.current.goToPrevWeek());
    const after = result.current.selectedDate;
    const diff = (before.getTime() - after.getTime()) / (1000 * 60 * 60 * 24);
    expect(diff).toBe(7);
    vi.useRealTimers();
  });

  it("goToNextWeek crosses month boundary correctly (Dec 28 → Jan 4)", () => {
    vi.setSystemTime(new Date("2025-12-28T12:00:00")); // Sunday Dec 28
    const { result } = renderHook(() => useScheduleView());
    act(() => result.current.goToNextWeek());
    const after = result.current.selectedDate;
    expect(after.getFullYear()).toBe(2026);
    expect(after.getMonth()).toBe(0); // January
    expect(after.getDate()).toBe(4);
    vi.useRealTimers();
  });

  it("goToPrevWeek crosses year boundary correctly (Jan 4 → Dec 28)", () => {
    vi.setSystemTime(new Date("2026-01-04T12:00:00")); // Sunday Jan 4
    const { result } = renderHook(() => useScheduleView());
    act(() => result.current.goToPrevWeek());
    const after = result.current.selectedDate;
    expect(after.getFullYear()).toBe(2025);
    expect(after.getMonth()).toBe(11); // December
    expect(after.getDate()).toBe(28);
    vi.useRealTimers();
  });
});
