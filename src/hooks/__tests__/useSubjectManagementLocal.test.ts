/**
 * useSubjectManagementLocal 훅 기본 테스트
 */

import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useSubjectManagementLocal } from "../useSubjectManagementLocal";

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

// Mock window events
const mockAddEventListener = vi.fn();
const mockRemoveEventListener = vi.fn();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

Object.defineProperty(window, "addEventListener", {
  value: mockAddEventListener,
});

Object.defineProperty(window, "removeEventListener", {
  value: mockRemoveEventListener,
});

// Mock crypto.randomUUID
Object.defineProperty(global, "crypto", {
  value: {
    randomUUID: () => "test-uuid-" + Math.random().toString(36).substring(2),
  },
});

describe("useSubjectManagementLocal", () => {
  it("훅이 에러 없이 초기화되어야 한다", () => {
    localStorageMock.getItem.mockReturnValue(null);

    const { result } = renderHook(() => useSubjectManagementLocal());

    expect(result.current).toHaveProperty("subjects");
    expect(result.current).toHaveProperty("errorMessage");
    expect(result.current).toHaveProperty("addSubject");
    expect(result.current).toHaveProperty("updateSubject");
    expect(result.current).toHaveProperty("deleteSubject");
    expect(result.current).toHaveProperty("clearError");
    expect(result.current).toHaveProperty("subjectCount");
  });

  it("기본 상태가 올바르게 설정되어야 한다", () => {
    localStorageMock.getItem.mockReturnValue(null);

    const { result } = renderHook(() => useSubjectManagementLocal());

    expect(Array.isArray(result.current.subjects)).toBe(true);
    expect(typeof result.current.errorMessage).toBe("string");
    expect(typeof result.current.subjectCount).toBe("number");
  });

  it("필수 함수들이 정의되어야 한다", () => {
    localStorageMock.getItem.mockReturnValue(null);

    const { result } = renderHook(() => useSubjectManagementLocal());

    expect(typeof result.current.addSubject).toBe("function");
    expect(typeof result.current.updateSubject).toBe("function");
    expect(typeof result.current.deleteSubject).toBe("function");
    expect(typeof result.current.clearError).toBe("function");
  });

  it("초기 빈 localStorage에서 빈 배열로 시작한다", () => {
    localStorageMock.getItem.mockReturnValue(null);

    const { result } = renderHook(() => useSubjectManagementLocal());

    // PR #264: 디폴트 과목 9개 정책 제거. 빈 배열이 정답.
    // 신규 학원은 GroupSessionModal 인라인 "+" 버튼(PR #257)으로 직접 추가.
    expect(result.current.subjects).toEqual([]);
  });

  it("이벤트 리스너를 등록해야 한다", () => {
    localStorageMock.getItem.mockReturnValue(null);

    renderHook(() => useSubjectManagementLocal());

    expect(mockAddEventListener).toHaveBeenCalledWith(
      "storage",
      expect.any(Function)
    );
    expect(mockAddEventListener).toHaveBeenCalledWith(
      "classPlannerDataChanged",
      expect.any(Function)
    );
  });
});
