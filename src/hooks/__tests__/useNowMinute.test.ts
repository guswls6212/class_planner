import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useNowMinute } from "../useNowMinute";

describe("useNowMinute", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("초기값은 현재 시각", () => {
    const { result } = renderHook(() => useNowMinute());
    expect(result.current).toBeInstanceOf(Date);
  });

  it("다음 분 경계에서 업데이트된다", () => {
    // Set time to 14:23:45 → next minute boundary is 14:24:00 (15s away)
    vi.setSystemTime(new Date("2026-04-29T14:23:45.000Z"));
    const { result } = renderHook(() => useNowMinute());

    const initial = result.current;

    // Advance to next minute boundary (15s + a bit)
    act(() => { vi.advanceTimersByTime(15_100); });

    expect(result.current).not.toBe(initial);
  });

  it("60초마다 반복 업데이트된다", () => {
    vi.setSystemTime(new Date("2026-04-29T14:24:00.000Z"));
    const { result } = renderHook(() => useNowMinute());

    act(() => { vi.advanceTimersByTime(1_000); }); // reach first boundary quickly
    const afterFirst = result.current;

    act(() => { vi.advanceTimersByTime(60_000); });
    expect(result.current).not.toBe(afterFirst);
  });
});
