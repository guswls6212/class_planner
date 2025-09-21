/**
 * useLocal 테스트 (32줄)
 */

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLocal } from "../useLocal";

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

describe("useLocal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("useLocal 훅이 에러 없이 초기화되어야 한다", () => {
    expect(() => {
      renderHook(() => useLocal("test-key", "initial-value"));
    }).not.toThrow();
  });

  it("초기값으로 설정되어야 한다", () => {
    const { result } = renderHook(() => useLocal("test-key", "initial-value"));

    expect(result.current[0]).toBe("initial-value");
  });

  it("localStorage에서 값을 로드해야 한다", () => {
    localStorageMock.getItem.mockReturnValue('"saved-value"' as any);

    const { result } = renderHook(() => useLocal("test-key", "initial-value"));

    expect(result.current[0]).toBe("saved-value");
  });

  it("값 설정이 작동해야 한다", () => {
    const { result } = renderHook(() => useLocal("test-key", "initial-value"));

    act(() => {
      result.current[1]("new-value");
    });

    expect(result.current[0]).toBe("new-value");
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "test-key",
      '"new-value"'
    );
  });

  it("객체 값을 처리할 수 있어야 한다", () => {
    const initialObject = { name: "test", value: 123 };
    const { result } = renderHook(() => useLocal("test-key", initialObject));

    const newObject = { name: "updated", value: 456 };

    act(() => {
      result.current[1](newObject);
    });

    expect(result.current[0]).toEqual(newObject);
  });

  it("잘못된 JSON을 안전하게 처리해야 한다", () => {
    localStorageMock.getItem.mockReturnValue("invalid json" as any);

    const { result } = renderHook(() => useLocal("test-key", "fallback"));

    expect(result.current[0]).toBe("fallback");
  });
});
