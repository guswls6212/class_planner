/**
 * useSubjectManagement 훅 테스트 (캐시 우선 방식)
 */

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSubjectManagement } from "../useSubjectManagement";

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

describe("useSubjectManagement (캐시 우선)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockClear();
  });

  it("과목 관리 훅이 에러 없이 초기화되어야 한다", () => {
    const { result } = renderHook(() => useSubjectManagement());

    expect(result.current.subjects).toEqual([]);
    expect(result.current.errorMessage).toBe("");
    expect(result.current.subjectCount).toBe(0);
  });

  it("캐시된 과목 데이터를 올바르게 표시해야 한다", () => {
    const mockSubjects = [
      { id: "subject-1", name: "수학", color: "#ff0000" },
      { id: "subject-2", name: "영어", color: "#00ff00" },
    ];

    const { useCachedData } = require("../useCachedData");
    useCachedData.mockReturnValue({
      data: {
        students: [],
        subjects: mockSubjects,
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
      studentCount: 0,
      subjectCount: 2,
      sessionCount: 0,
      enrollmentCount: 0,
    });

    const { result } = renderHook(() => useSubjectManagement());

    expect(result.current.subjects).toHaveLength(2);
    expect(result.current.subjects[0].name).toBe("수학");
    expect(result.current.subjectCount).toBe(2);
  });

  it("과목 추가 시 서버 API 호출 후 캐시를 새로고침해야 한다", async () => {
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
        data: { id: "new-subject", name: "새과목", color: "#ff0000" },
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

    const { result } = renderHook(() => useSubjectManagement());

    await act(async () => {
      const success = await result.current.addSubject("새과목", "#ff0000");
      expect(success).toBe(true);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/subjects?userId=test-user-id"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "새과목", color: "#ff0000" }),
      })
    );

    expect(mockRefreshFromServer).toHaveBeenCalled();
  });

  it("getSubject이 캐시된 데이터에서 과목을 찾아야 한다", () => {
    const mockSubjects = [
      { id: "subject-1", name: "수학", color: "#ff0000" },
      { id: "subject-2", name: "영어", color: "#00ff00" },
    ];

    const { useCachedData } = require("../useCachedData");
    useCachedData.mockReturnValue({
      data: {
        students: [],
        subjects: mockSubjects,
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
      studentCount: 0,
      subjectCount: 2,
      sessionCount: 0,
      enrollmentCount: 0,
    });

    const { result } = renderHook(() => useSubjectManagement());

    const foundSubject = result.current.getSubject("subject-1");
    expect(foundSubject).toEqual({
      id: "subject-1",
      name: "수학",
      color: "#ff0000",
    });

    const notFoundSubject = result.current.getSubject("subject-999");
    expect(notFoundSubject).toBe(null);
  });

  it("필수 CRUD 함수들이 존재해야 한다", () => {
    const { result } = renderHook(() => useSubjectManagement());

    expect(typeof result.current.addSubject).toBe("function");
    expect(typeof result.current.updateSubject).toBe("function");
    expect(typeof result.current.deleteSubject).toBe("function");
    expect(typeof result.current.getSubject).toBe("function");
    expect(typeof result.current.refreshSubjects).toBe("function");
    expect(typeof result.current.clearError).toBe("function");
  });
});
