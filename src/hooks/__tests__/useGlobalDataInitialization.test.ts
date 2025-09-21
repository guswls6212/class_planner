/**
 * useGlobalDataInitialization 기본 기능 테스트
 * 스마트 초기화 로직 및 기본 동작을 검증합니다.
 */

import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useGlobalDataInitialization } from "../useGlobalDataInitialization";

// Mock dependencies
vi.mock("../../lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../../lib/timeUtils", () => ({
  getKSTTime: () => "2025-09-21T16:00:00.000+09:00",
}));

vi.mock("../../utils/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}));

// Mock fetch
global.fetch = vi.fn();

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

describe("useGlobalDataInitialization 기본 기능", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
  });

  it("초기 상태가 올바르게 설정되어야 한다", () => {
    const { result } = renderHook(() => useGlobalDataInitialization());

    expect(result.current.isInitialized).toBe(false);
    expect(result.current.isInitializing).toBe(false);
  });

  it("필수 속성들이 정의되어야 한다", () => {
    const { result } = renderHook(() => useGlobalDataInitialization());

    expect(result.current).toHaveProperty("isInitialized");
    expect(result.current).toHaveProperty("isInitializing");
    expect(typeof result.current.isInitialized).toBe("boolean");
    expect(typeof result.current.isInitializing).toBe("boolean");
  });

  it("훅이 에러 없이 마운트되어야 한다", () => {
    expect(() => {
      renderHook(() => useGlobalDataInitialization());
    }).not.toThrow();
  });

  it("훅 이름과 export가 올바르게 정의되어야 한다", () => {
    expect(useGlobalDataInitialization).toBeDefined();
    expect(typeof useGlobalDataInitialization).toBe("function");
    expect(useGlobalDataInitialization.name).toBe(
      "useGlobalDataInitialization"
    );
  });
});
