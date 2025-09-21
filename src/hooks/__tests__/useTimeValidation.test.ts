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
});
