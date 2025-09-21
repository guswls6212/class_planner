/**
 * useGlobalDataInitialization 보안 테스트 (기본)
 *
 * 스마트 초기화 로직의 기본 동작을 검증합니다.
 */

import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useGlobalDataInitialization } from "../useGlobalDataInitialization";

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

describe("useGlobalDataInitialization 보안 기본 테스트", () => {
  it("훅이 에러 없이 초기화되어야 한다", () => {
    localStorageMock.getItem.mockReturnValue(null);

    const { result } = renderHook(() => useGlobalDataInitialization());

    expect(result.current).toHaveProperty("isInitialized");
    expect(result.current).toHaveProperty("isInitializing");
  });

  it("초기 상태가 올바르게 설정되어야 한다", () => {
    localStorageMock.getItem.mockReturnValue(null);

    const { result } = renderHook(() => useGlobalDataInitialization());

    expect(result.current.isInitialized).toBe(false);
    expect(result.current.isInitializing).toBe(false);
  });

  it("필수 함수들이 정의되어야 한다", () => {
    localStorageMock.getItem.mockReturnValue(null);

    const { result } = renderHook(() => useGlobalDataInitialization());

    expect(typeof result.current.isInitialized).toBe("boolean");
    expect(typeof result.current.isInitializing).toBe("boolean");
  });
});
