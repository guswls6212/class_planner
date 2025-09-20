/**
 * useGlobalDataInitialization 테스트
 * 전역 사용자 데이터 초기화 훅 테스트
 */

import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies
vi.mock("../../lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../../lib/timeUtils", () => ({
  getKSTTime: vi.fn(() => "2024-01-01T12:00:00.000+09:00"),
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

describe("useGlobalDataInitialization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
  });

  it("should initialize with correct default values", async () => {
    const { useGlobalDataInitialization } = await import(
      "../useGlobalDataInitialization"
    );

    const { result } = renderHook(() => useGlobalDataInitialization());

    expect(result.current.isInitialized).toBe(false);
    expect(result.current.isInitializing).toBe(false);
  });

  it("should have the correct hook name and export", async () => {
    const module = await import("../useGlobalDataInitialization");

    expect(module.useGlobalDataInitialization).toBeDefined();
    expect(typeof module.useGlobalDataInitialization).toBe("function");
  });

  it("should return the expected interface", async () => {
    const { useGlobalDataInitialization } = await import(
      "../useGlobalDataInitialization"
    );

    const { result } = renderHook(() => useGlobalDataInitialization());

    expect(result.current).toHaveProperty("isInitialized");
    expect(result.current).toHaveProperty("isInitializing");
    expect(typeof result.current.isInitialized).toBe("boolean");
    expect(typeof result.current.isInitializing).toBe("boolean");
  });
});
