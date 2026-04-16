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
});
