/**
 * useStudentManagement 훅 테스트 (캐시 우선 방식)
 */

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useStudentManagementClean } from "../useStudentManagement";

// Mock dependencies
vi.mock("../useCachedData", () => ({
  useCachedData: vi.fn(() => ({
    data: {
      students: [],
      subjects: [],
      sessions: [],
      enrollments: [],
      version: "1.0",
      lastModified: "2025-09-21T15:00:00.000+09:00",
    },
    loading: false,
    error: null,
    isFromCache: false,
    refreshFromServer: vi.fn(),
    clearError: vi.fn(),
    studentCount: 0,
    subjectCount: 0,
    sessionCount: 0,
    enrollmentCount: 0,
  })),
}));

vi.mock("../lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

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

// Mock fetch
global.fetch = vi.fn();

describe("useStudentManagement (캐시 우선)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockClear();
  });

  it("학생 관리 훅이 에러 없이 초기화되어야 한다", () => {
    const { result } = renderHook(() => useStudentManagementClean());

    expect(result.current.students).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.studentCount).toBe(0);
  });

  it("캐시된 학생 데이터를 올바르게 표시해야 한다", () => {
    const mockStudents = [
      { id: "student-1", name: "김철수" },
      { id: "student-2", name: "이영희" },
    ];

    const { useCachedData } = require("../useCachedData");
    useCachedData.mockReturnValue({
      data: {
        students: mockStudents,
        subjects: [],
        sessions: [],
        enrollments: [],
        version: "1.0",
        lastModified: "2025-09-21T15:00:00.000+09:00",
      },
      loading: false,
      error: null,
      isFromCache: true,
      refreshFromServer: vi.fn(),
      clearError: vi.fn(),
      studentCount: 2,
      subjectCount: 0,
      sessionCount: 0,
      enrollmentCount: 0,
    });

    const { result } = renderHook(() => useStudentManagementClean());

    expect(result.current.students).toHaveLength(2);
    expect(result.current.students[0].name).toBe("김철수");
    expect(result.current.studentCount).toBe(2);
  });

  it("학생 추가 시 서버 API 호출 후 캐시를 새로고침해야 한다", async () => {
    const mockRefreshFromServer = vi.fn();

    localStorageMock.getItem.mockImplementation((key) => {
      if (key === "supabase_user_id") return "test-user-id";
      if (key === "sb-kcyqftasdxtqslrhbctv-auth-token") {
        return JSON.stringify({ access_token: "test-token" });
      }
      return null;
    });

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { id: "new-student", name: "새학생" },
      }),
    });

    const { useCachedData } = require("../useCachedData");
    useCachedData.mockReturnValue({
      data: {
        students: [],
        subjects: [],
        sessions: [],
        enrollments: [],
        version: "1.0",
        lastModified: "2025-09-21T15:00:00.000+09:00",
      },
      loading: false,
      error: null,
      isFromCache: false,
      refreshFromServer: mockRefreshFromServer,
      clearError: vi.fn(),
      studentCount: 0,
      subjectCount: 0,
      sessionCount: 0,
      enrollmentCount: 0,
    });

    const { result } = renderHook(() => useStudentManagementClean());

    await act(async () => {
      const success = await result.current.addStudent("새학생");
      expect(success).toBe(true);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/students?userId=test-user-id"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "새학생" }),
      })
    );

    expect(mockRefreshFromServer).toHaveBeenCalled();
  });

  it("학생 삭제 시 서버 API 호출 후 캐시를 새로고침해야 한다", async () => {
    const mockRefreshFromServer = vi.fn();

    localStorageMock.getItem.mockImplementation((key) => {
      if (key === "supabase_user_id") return "test-user-id";
      if (key === "sb-kcyqftasdxtqslrhbctv-auth-token") {
        return JSON.stringify({ access_token: "test-token" });
      }
      return null;
    });

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        message: "Student deleted successfully",
      }),
    });

    const { useCachedData } = require("../useCachedData");
    useCachedData.mockReturnValue({
      data: {
        students: [{ id: "student-1", name: "김철수" }],
        subjects: [],
        sessions: [],
        enrollments: [],
        version: "1.0",
        lastModified: "2025-09-21T15:00:00.000+09:00",
      },
      loading: false,
      error: null,
      isFromCache: false,
      refreshFromServer: mockRefreshFromServer,
      clearError: vi.fn(),
      studentCount: 1,
      subjectCount: 0,
      sessionCount: 0,
      enrollmentCount: 0,
    });

    const { result } = renderHook(() => useStudentManagementClean());

    await act(async () => {
      const success = await result.current.deleteStudent("student-1");
      expect(success).toBe(true);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/students/student-1?userId=test-user-id"),
      expect.objectContaining({
        method: "DELETE",
      })
    );

    expect(mockRefreshFromServer).toHaveBeenCalled();
  });

  it("getStudent이 캐시된 데이터에서 학생을 찾아야 한다", () => {
    const mockStudents = [
      { id: "student-1", name: "김철수" },
      { id: "student-2", name: "이영희" },
    ];

    const { useCachedData } = require("../useCachedData");
    useCachedData.mockReturnValue({
      data: {
        students: mockStudents,
        subjects: [],
        sessions: [],
        enrollments: [],
        version: "1.0",
        lastModified: "2025-09-21T15:00:00.000+09:00",
      },
      loading: false,
      error: null,
      isFromCache: true,
      refreshFromServer: vi.fn(),
      clearError: vi.fn(),
      studentCount: 2,
      subjectCount: 0,
      sessionCount: 0,
      enrollmentCount: 0,
    });

    const { result } = renderHook(() => useStudentManagementClean());

    const foundStudent = result.current.getStudent("student-1");
    expect(foundStudent).toEqual({ id: "student-1", name: "김철수" });

    const notFoundStudent = result.current.getStudent("student-999");
    expect(notFoundStudent).toBe(null);
  });

  it("필수 CRUD 함수들이 존재해야 한다", () => {
    const { result } = renderHook(() => useStudentManagementClean());

    expect(typeof result.current.addStudent).toBe("function");
    expect(typeof result.current.updateStudent).toBe("function");
    expect(typeof result.current.deleteStudent).toBe("function");
    expect(typeof result.current.getStudent).toBe("function");
    expect(typeof result.current.refreshStudents).toBe("function");
    expect(typeof result.current.clearError).toBe("function");
  });
});
