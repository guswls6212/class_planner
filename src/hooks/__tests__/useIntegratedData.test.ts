/**
 * useIntegratedData 훅 테스트 (캐시 우선 방식)
 */

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useIntegratedData } from "../useIntegratedData";

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

// timeUtils mock removed - using standard Date now

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

describe("useIntegratedData (캐시 우선)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
  });

  it("초기 상태가 올바르게 설정되어야 한다", () => {
    const { result } = renderHook(() => useIntegratedData());

    expect(result.current.data).toEqual({
      students: [],
      subjects: [],
      sessions: [],
      enrollments: [],
      version: "1.0",
      lastModified: expect.any(String),
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.studentCount).toBe(0);
  });

  it("useCachedData에서 데이터를 가져와야 한다", () => {
    const mockData = {
      students: [
        { id: "student-1", name: "김철수" },
        { id: "student-2", name: "이영희" },
      ],
      subjects: [{ id: "subject-1", name: "수학", color: "#ff0000" }],
      sessions: [
        { id: "session-1", startsAt: "09:00", endsAt: "10:00", weekday: 0 },
      ],
      enrollments: [
        { id: "enrollment-1", studentId: "student-1", subjectId: "subject-1" },
      ],
      version: "1.0",
      lastModified: "2025-09-21T15:00:00.000+09:00",
    };

    // useCachedData mock 업데이트
    const { useCachedData } = require("../useCachedData");
    useCachedData.mockReturnValue({
      data: mockData,
      loading: false,
      error: null,
      isFromCache: true,
      refreshFromServer: vi.fn(),
      clearError: vi.fn(),
      studentCount: 2,
      subjectCount: 1,
      sessionCount: 1,
      enrollmentCount: 1,
    });

    const { result } = renderHook(() => useIntegratedData());

    expect(result.current.data).toEqual(mockData);
    expect(result.current.studentCount).toBe(2);
    expect(result.current.subjectCount).toBe(1);
    expect(result.current.sessionCount).toBe(1);
    expect(result.current.enrollmentCount).toBe(1);
  });

  it("refreshData가 useCachedData의 refreshFromServer를 호출해야 한다", async () => {
    const mockRefreshFromServer = vi.fn();

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

    const { result } = renderHook(() => useIntegratedData());

    await act(async () => {
      await result.current.refreshData();
    });

    expect(mockRefreshFromServer).toHaveBeenCalled();
  });

  it("updateData가 서버 업데이트 후 캐시를 새로고침해야 한다", async () => {
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
        data: {},
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

    const { result } = renderHook(() => useIntegratedData());

    await act(async () => {
      await result.current.updateData({
        students: [{ id: "student-1", name: "김철수" }],
      });
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/data?userId=test-user-id"),
      expect.objectContaining({
        method: "PUT",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Authorization: "Bearer test-token",
        }),
      })
    );

    expect(mockRefreshFromServer).toHaveBeenCalled();
  });

  it("에러 처리가 올바르게 동작해야 한다", () => {
    const mockClearError = vi.fn();

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
      error: "Test error",
      isFromCache: false,
      refreshFromServer: vi.fn(),
      clearError: mockClearError,
      studentCount: 0,
      subjectCount: 0,
      sessionCount: 0,
      enrollmentCount: 0,
    });

    const { result } = renderHook(() => useIntegratedData());

    expect(result.current.error).toBe("Test error");

    act(() => {
      result.current.clearError();
    });

    expect(mockClearError).toHaveBeenCalled();
  });
});
