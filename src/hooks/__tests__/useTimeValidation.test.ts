/**
 * useTimeValidation 테스트 (67줄)
 */

import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTimeValidation } from "../useTimeValidation";

// Mock logger
vi.mock("../../lib/logger", () => ({
  logger: {
    warn: vi.fn(),
  },
}));

describe("useTimeValidation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("시간 검증 훅이 에러 없이 초기화되어야 한다", () => {
    expect(() => {
      renderHook(() => useTimeValidation());
    }).not.toThrow();
  });

  it("기본 구조를 반환해야 한다", () => {
    const { result } = renderHook(() => useTimeValidation());

    expect(result.current).toBeDefined();
    expect(typeof result.current).toBe("object");
  });

  it("시간 범위 검증 함수가 존재해야 한다", () => {
    const { result } = renderHook(() => useTimeValidation());

    expect(typeof result.current.validateTimeRange).toBe("function");
  });

  it("다음 시간 계산 함수가 존재해야 한다", () => {
    const { result } = renderHook(() => useTimeValidation());

    expect(typeof result.current.getNextHour).toBe("function");
  });

  it("시작 시간 변경 핸들러가 존재해야 한다", () => {
    const { result } = renderHook(() => useTimeValidation());

    expect(typeof result.current.handleStartTimeChange).toBe("function");
  });

  it("종료 시간 변경 핸들러가 존재해야 한다", () => {
    const { result } = renderHook(() => useTimeValidation());

    expect(typeof result.current.handleEndTimeChange).toBe("function");
  });

  it("validateTimeRange: 종료가 시작보다 늦어야 true", () => {
    const { result } = renderHook(() => useTimeValidation());
    expect(result.current.validateTimeRange("10:00", "11:00")).toBe(true);
    expect(result.current.validateTimeRange("11:00", "10:00")).toBe(false);
    expect(result.current.validateTimeRange("10:00", "10:00")).toBe(false);
  });

  it("validateDurationWithinLimit: 8시간 이내만 허용", () => {
    const { result } = renderHook(() => useTimeValidation());
    // 8시간 == 480분
    expect(result.current.validateDurationWithinLimit("09:00", "17:00", 480)).toBe(true);
    // 8시간 초과
    expect(result.current.validateDurationWithinLimit("09:00", "17:30", 480)).toBe(false);
  });

  it("핸들러: 역전 시간 입력 시 console.warn 호출", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { result } = renderHook(() => useTimeValidation());
    const onUpdate = vi.fn();

    // 시작 시간 변경 → 종료보다 늦음
    result.current.handleStartTimeChange("12:00", "11:00", onUpdate);
    // 종료 시간 변경 → 시작보다 이름
    result.current.handleEndTimeChange("10:00", "11:00", onUpdate);

    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
