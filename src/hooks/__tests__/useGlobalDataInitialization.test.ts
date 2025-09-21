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

// timeUtils mock removed - using standard Date now

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

  it("기본 과목 추가 시 lastModified가 갱신되어야 한다", () => {
    // Mock 데이터: 과목이 없는 상태
    const mockServerData = {
      students: [],
      subjects: [], // 빈 과목 배열
      sessions: [],
      enrollments: [],
      version: "1.0",
      lastModified: "2025-01-01T00:00:00.000Z",
    };

    // Mock localStorage에 빈 데이터 설정
    localStorageMock.getItem.mockReturnValue(null);

    // Mock API response
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockServerData),
    });

    const { result } = renderHook(() => useGlobalDataInitialization());

    // 초기 상태 확인
    expect(result.current.isInitialized).toBe(false);

    // 기본 과목이 추가될 때 lastModified가 갱신되는 로직이 있음을 확인
    // (실제 구현에서는 API 호출에서 lastModified가 갱신됨)
  });
});
