import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSessionStatus } from "../useSessionStatus";

describe("useSessionStatus", () => {
  beforeEach(() => {
    // Mock a Thursday (weekday index 3 in our system):
    // 2026-04-16 is Thursday → getDay()=4 → (4+6)%7=3
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-16T15:30:00")); // Thursday 15:30
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns upcoming when session weekday != today", () => {
    const { result } = renderHook(() =>
      useSessionStatus("14:00", "15:00", 0) // Monday (weekday 0 ≠ Thursday 3)
    );
    expect(result.current).toBe("upcoming");
  });

  it("returns in-progress when current time is within session range", () => {
    const { result } = renderHook(() =>
      useSessionStatus("15:00", "16:30", 3) // Thursday 15:00-16:30, now=15:30
    );
    expect(result.current).toBe("in-progress");
  });

  it("returns completed when current time is after session end", () => {
    const { result } = renderHook(() =>
      useSessionStatus("14:00", "15:00", 3) // Thursday 14:00-15:00, now=15:30
    );
    expect(result.current).toBe("completed");
  });

  it("returns upcoming when current time is before session start", () => {
    const { result } = renderHook(() =>
      useSessionStatus("16:00", "17:00", 3) // Thursday 16:00-17:00, now=15:30
    );
    expect(result.current).toBe("upcoming");
  });

  it("updates status when interval fires", () => {
    const { result } = renderHook(() =>
      useSessionStatus("15:45", "17:00", 3) // Thursday 15:45-17:00, now=15:30 → upcoming
    );
    expect(result.current).toBe("upcoming");

    // Advance time to 15:46 — now in-progress
    act(() => {
      vi.setSystemTime(new Date("2026-04-16T15:46:00"));
      vi.advanceTimersByTime(60_000);
    });
    expect(result.current).toBe("in-progress");
  });

  it("cleans up interval on unmount", () => {
    const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");
    const { unmount } = renderHook(() =>
      useSessionStatus("15:00", "16:00", 1)
    );
    unmount();
    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  it("returns in-progress at exact start boundary (currentMinutes === startMinutes)", () => {
    // now = 15:30, session 15:30–16:30 on Thursday (weekday 3)
    const { result } = renderHook(() =>
      useSessionStatus("15:30", "16:30", 3)
    );
    expect(result.current).toBe("in-progress");
  });

  it("returns completed at exact end boundary (currentMinutes === endMinutes)", () => {
    // now = 15:30, session 14:00–15:30 on Thursday (weekday 3)
    const { result } = renderHook(() =>
      useSessionStatus("14:00", "15:30", 3)
    );
    expect(result.current).toBe("completed");
  });

  it("handles Sunday weekday (getDay()=0 → (0+6)%7=6)", () => {
    // Override system time to Sunday 2026-04-19 15:30
    vi.setSystemTime(new Date("2026-04-19T15:30:00")); // Sunday → getDay()=0
    const { result } = renderHook(() =>
      useSessionStatus("14:00", "16:00", 6) // weekday 6 = Sunday
    );
    expect(result.current).toBe("in-progress");
  });
});
