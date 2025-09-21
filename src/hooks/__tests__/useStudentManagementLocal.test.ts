/**
 * useStudentManagementLocal 훅 기본 테스트
 */

import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useStudentManagementLocal } from "../useStudentManagementLocal";

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

describe("useStudentManagementLocal", () => {
  it("훅이 에러 없이 초기화되어야 한다", () => {
    localStorageMock.getItem.mockReturnValue(null);

    const { result } = renderHook(() => useStudentManagementLocal());

    expect(result.current).toHaveProperty("students");
    expect(result.current).toHaveProperty("loading");
    expect(result.current).toHaveProperty("error");
    expect(result.current).toHaveProperty("addStudent");
    expect(result.current).toHaveProperty("updateStudent");
    expect(result.current).toHaveProperty("deleteStudent");
    expect(result.current).toHaveProperty("getStudent");
    expect(result.current).toHaveProperty("refreshStudents");
    expect(result.current).toHaveProperty("clearError");
    expect(result.current).toHaveProperty("studentCount");
  });

  it("기본 상태가 올바르게 설정되어야 한다", () => {
    localStorageMock.getItem.mockReturnValue(null);

    const { result } = renderHook(() => useStudentManagementLocal());

    expect(Array.isArray(result.current.students)).toBe(true);
    expect(typeof result.current.loading).toBe("boolean");
    expect(typeof result.current.studentCount).toBe("number");
  });

  it("필수 함수들이 정의되어야 한다", () => {
    localStorageMock.getItem.mockReturnValue(null);

    const { result } = renderHook(() => useStudentManagementLocal());

    expect(typeof result.current.addStudent).toBe("function");
    expect(typeof result.current.updateStudent).toBe("function");
    expect(typeof result.current.deleteStudent).toBe("function");
    expect(typeof result.current.getStudent).toBe("function");
    expect(typeof result.current.refreshStudents).toBe("function");
    expect(typeof result.current.clearError).toBe("function");
  });

  it("이벤트 리스너를 등록해야 한다", () => {
    localStorageMock.getItem.mockReturnValue(null);

    renderHook(() => useStudentManagementLocal());

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
