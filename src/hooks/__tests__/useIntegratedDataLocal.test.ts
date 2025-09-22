/**
 * useIntegratedDataLocal 훅 기본 테스트
 */

import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useIntegratedDataLocal } from "../useIntegratedDataLocal";

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

describe("useIntegratedDataLocal", () => {
  it("훅이 에러 없이 초기화되어야 한다", () => {
    localStorageMock.getItem.mockReturnValue(null);

    const { result } = renderHook(() => useIntegratedDataLocal());

    expect(result.current).toHaveProperty("data");
    expect(result.current).toHaveProperty("loading");
    expect(result.current).toHaveProperty("error");
    expect(result.current).toHaveProperty("refreshData");
    expect(result.current).toHaveProperty("updateData");
    expect(result.current).toHaveProperty("clearError");
    expect(result.current).toHaveProperty("addSession");
    expect(result.current).toHaveProperty("updateSession");
    expect(result.current).toHaveProperty("deleteSession");
    expect(result.current).toHaveProperty("addEnrollment");
    expect(result.current).toHaveProperty("deleteEnrollment");
  });

  it("기본 상태가 올바르게 설정되어야 한다", () => {
    localStorageMock.getItem.mockReturnValue(null);

    const { result } = renderHook(() => useIntegratedDataLocal());

    expect(result.current.data).toHaveProperty("students");
    expect(result.current.data).toHaveProperty("subjects");
    expect(result.current.data).toHaveProperty("sessions");
    expect(result.current.data).toHaveProperty("enrollments");
    expect(result.current.data).toHaveProperty("version");
    expect(result.current.data).toHaveProperty("lastModified");

    expect(Array.isArray(result.current.data.students)).toBe(true);
    expect(Array.isArray(result.current.data.subjects)).toBe(true);
    expect(Array.isArray(result.current.data.sessions)).toBe(true);
    expect(Array.isArray(result.current.data.enrollments)).toBe(true);
  });

  it("통계가 올바르게 계산되어야 한다", () => {
    localStorageMock.getItem.mockReturnValue(null);

    const { result } = renderHook(() => useIntegratedDataLocal());

    expect(typeof result.current.studentCount).toBe("number");
    expect(typeof result.current.subjectCount).toBe("number");
    expect(typeof result.current.sessionCount).toBe("number");
    expect(typeof result.current.enrollmentCount).toBe("number");
  });

  it("필수 함수들이 정의되어야 한다", () => {
    localStorageMock.getItem.mockReturnValue(null);

    const { result } = renderHook(() => useIntegratedDataLocal());

    expect(typeof result.current.refreshData).toBe("function");
    expect(typeof result.current.updateData).toBe("function");
    expect(typeof result.current.clearError).toBe("function");
    expect(typeof result.current.addSession).toBe("function");
    expect(typeof result.current.updateSession).toBe("function");
    expect(typeof result.current.deleteSession).toBe("function");
    expect(typeof result.current.addEnrollment).toBe("function");
    expect(typeof result.current.deleteEnrollment).toBe("function");
  });

  it("이벤트 리스너를 등록해야 한다", () => {
    localStorageMock.getItem.mockReturnValue(null);

    renderHook(() => useIntegratedDataLocal());

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
