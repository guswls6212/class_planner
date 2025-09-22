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

  it("dispatchToast 함수가 존재해야 한다", () => {
    const { result } = renderHook(() => useTimeValidation());

    expect(typeof result.current.dispatchToast).toBe("function");
  });

  it("validateAndToastGroup 함수가 존재해야 한다", () => {
    const { result } = renderHook(() => useTimeValidation());

    expect(typeof result.current.validateAndToastGroup).toBe("function");
  });

  it("validateAndToastEdit 함수가 존재해야 한다", () => {
    const { result } = renderHook(() => useTimeValidation());

    expect(typeof result.current.validateAndToastEdit).toBe("function");
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

  it("validateAndToastGroup: 잘못된 시간에 에러 설정", () => {
    const { result } = renderHook(() => useTimeValidation());
    const setError = vi.fn();

    // 잘못된 시간 범위
    expect(result.current.validateAndToastGroup("12:00", "11:00", setError)).toBe(false);
    expect(setError).toHaveBeenCalledWith("종료 시간은 시작 시간보다 늦어야 합니다.");

    // 8시간 초과
    expect(result.current.validateAndToastGroup("09:00", "18:00", setError)).toBe(false);
    expect(setError).toHaveBeenCalledWith("세션 시간은 최대 8시간까지 설정할 수 있습니다.");

    // 유효한 시간
    expect(result.current.validateAndToastGroup("10:00", "11:00", setError)).toBe(true);
    expect(setError).toHaveBeenCalledWith("");
  });

  it("validateAndToastEdit: 잘못된 시간에 토스트 이벤트 발생", () => {
    const { result } = renderHook(() => useTimeValidation());
    const dispatchEventSpy = vi.spyOn(window, "dispatchEvent").mockImplementation(() => true);

    // 잘못된 시간 범위
    expect(result.current.validateAndToastEdit("12:00", "11:00")).toBe(false);
    expect(dispatchEventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "toast",
        detail: { type: "error", message: "종료 시간은 시작 시간보다 늦어야 합니다." }
      })
    );

    dispatchEventSpy.mockRestore();
  });
});
