/**
 * useUserTracking 테스트 (273줄 - 큰 파일)
 */

import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock all dependencies
vi.mock("../../lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    business: vi.fn(),
  },
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(() => "test-user-id"),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

// Mock window location
Object.defineProperty(window, "location", {
  writable: true,
  value: {
    pathname: "/test",
    search: "",
    hash: "",
  },
});

// Mock navigator
Object.defineProperty(window, "navigator", {
  writable: true,
  value: {
    userAgent: "Test Browser",
  },
});

describe("useUserTracking", () => {
  let useUserTracking: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Dynamic import
    const module = await import("../useUserTracking");
    useUserTracking = module.useUserTracking;
  });

  it("사용자 추적 훅이 에러 없이 초기화되어야 한다", () => {
    expect(() => {
      renderHook(() => useUserTracking());
    }).not.toThrow();
  });

  it("기본 구조를 반환해야 한다", () => {
    const { result } = renderHook(() => useUserTracking());

    expect(result.current).toBeDefined();
    expect(typeof result.current).toBe("object");
  });

  it("사용자 ID 설정 함수가 있어야 한다", () => {
    const { result } = renderHook(() => useUserTracking());

    expect(typeof result.current.setUserId).toBe("function");
  });

  it("사용자 ID 제거 함수가 있어야 한다", () => {
    const { result } = renderHook(() => useUserTracking());

    expect(typeof result.current.clearUserId).toBe("function");
  });

  it("페이지 뷰 추적 함수가 있어야 한다", () => {
    const { result } = renderHook(() => useUserTracking());

    expect(typeof result.current.trackPageView).toBe("function");
  });

  it("액션 추적 함수가 있어야 한다", () => {
    const { result } = renderHook(() => useUserTracking());

    expect(typeof result.current.trackAction).toBe("function");
  });
});
