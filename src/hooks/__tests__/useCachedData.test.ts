/**
 * useCachedData 훅 테스트
 */

import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCachedData } from "../useCachedData";

// Mock dependencies
vi.mock("../lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// timeUtils mock removed - using standard Date now

vi.mock("../lib/yPositionMigration", () => ({
  migrateSessionsToLogicalPosition: vi.fn((sessions) => sessions),
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

describe("useCachedData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
  });

  it("초기 상태가 올바르게 설정되어야 한다", () => {
    // localStorage에 데이터 없음
    localStorageMock.getItem.mockReturnValue(null);

    const { result } = renderHook(() => useCachedData());

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
    expect(result.current.isFromCache).toBe(false);
    expect(result.current.studentCount).toBe(0);
  });

  it("localStorage에서 캐시된 데이터를 성공적으로 로드해야 한다", async () => {
    const mockCachedData = {
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
      lastModified: "2025-09-21T14:00:00.000+09:00",
    };

    // localStorage에 데이터 있음
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === "classPlannerData") {
        return JSON.stringify(mockCachedData);
      }
      if (key === "supabase_user_id") {
        return "test-user-id";
      }
      return null;
    });

    // 서버 API 성공 응답 mock
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockCachedData,
      }),
    });

    const { result } = renderHook(() => useCachedData());

    // 즉시 캐시된 데이터가 로드되어야 함
    expect(result.current.data.students).toHaveLength(2);
    expect(result.current.data.subjects).toHaveLength(1);
    expect(result.current.isFromCache).toBe(true);

    // 백그라운드 서버 동기화 완료 대기
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it("localStorage 파싱 실패 시 기본 데이터를 사용해야 한다", () => {
    // localStorage에 잘못된 JSON
    localStorageMock.getItem.mockReturnValue("invalid-json");

    const { result } = renderHook(() => useCachedData());

    expect(result.current.data).toEqual({
      students: [],
      subjects: [],
      sessions: [],
      enrollments: [],
      version: "1.0",
      lastModified: expect.any(String),
    });
    expect(result.current.isFromCache).toBe(false);
  });

  it("서버 동기화 실패해도 캐시된 데이터는 유지되어야 한다", async () => {
    const mockCachedData = {
      students: [{ id: "student-1", name: "김철수" }],
      subjects: [],
      sessions: [],
      enrollments: [],
      version: "1.0",
      lastModified: "2025-09-21T14:00:00.000+09:00",
    };

    // localStorage에 데이터 있음
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === "classPlannerData") {
        return JSON.stringify(mockCachedData);
      }
      if (key === "supabase_user_id") {
        return "test-user-id";
      }
      return null;
    });

    // 서버 API 실패 응답 mock
    (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useCachedData());

    // 캐시된 데이터는 즉시 로드됨
    expect(result.current.data.students).toHaveLength(1);
    expect(result.current.isFromCache).toBe(true);

    // 서버 동기화 완료 대기 (실패해도 캐시 데이터 유지)
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // 캐시된 데이터는 여전히 유지
    expect(result.current.data.students).toHaveLength(1);
  });

  it("refreshFromServer를 호출하면 서버에서 최신 데이터를 가져와야 한다", async () => {
    const initialData = {
      students: [{ id: "student-1", name: "김철수" }],
      subjects: [],
      sessions: [],
      enrollments: [],
      version: "1.0",
      lastModified: "2025-09-21T14:00:00.000+09:00",
    };

    const updatedData = {
      students: [
        { id: "student-1", name: "김철수" },
        { id: "student-2", name: "이영희" },
      ],
      subjects: [],
      sessions: [],
      enrollments: [],
      version: "1.0",
      lastModified: "2025-09-21T15:00:00.000+09:00",
    };

    // localStorage에 초기 데이터
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === "classPlannerData") {
        return JSON.stringify(initialData);
      }
      if (key === "supabase_user_id") {
        return "test-user-id";
      }
      return null;
    });

    // 서버 API 성공 응답 mock
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: updatedData,
      }),
    });

    const { result } = renderHook(() => useCachedData());

    // 초기에는 캐시된 데이터 (1명)
    expect(result.current.data.students).toHaveLength(1);

    // refreshFromServer 호출
    await act(async () => {
      await result.current.refreshFromServer();
    });

    // 서버에서 업데이트된 데이터 (2명)
    expect(result.current.data.students).toHaveLength(2);
  });

  it("사용자 ID가 없으면 에러를 반환해야 한다", async () => {
    // localStorage에 사용자 ID 없음
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === "classPlannerData") {
        return JSON.stringify({
          students: [],
          subjects: [],
          sessions: [],
          enrollments: [],
          version: "1.0",
          lastModified: "2025-09-21T14:00:00.000+09:00",
        });
      }
      return null; // supabase_user_id 없음
    });

    const { result } = renderHook(() => useCachedData());

    await waitFor(() => {
      expect(result.current.error).toBe(
        "사용자 ID가 없습니다. 다시 로그인해주세요."
      );
    });
  });

  it("통계가 올바르게 계산되어야 한다", () => {
    const mockData = {
      students: [
        { id: "student-1", name: "김철수" },
        { id: "student-2", name: "이영희" },
        { id: "student-3", name: "박민수" },
      ],
      subjects: [
        { id: "subject-1", name: "수학", color: "#ff0000" },
        { id: "subject-2", name: "영어", color: "#00ff00" },
      ],
      sessions: [
        { id: "session-1", startsAt: "09:00", endsAt: "10:00", weekday: 0 },
        { id: "session-2", startsAt: "10:00", endsAt: "11:00", weekday: 1 },
        { id: "session-3", startsAt: "11:00", endsAt: "12:00", weekday: 2 },
        { id: "session-4", startsAt: "13:00", endsAt: "14:00", weekday: 3 },
      ],
      enrollments: [
        { id: "enrollment-1", studentId: "student-1", subjectId: "subject-1" },
        { id: "enrollment-2", studentId: "student-2", subjectId: "subject-2" },
        { id: "enrollment-3", studentId: "student-3", subjectId: "subject-1" },
      ],
      version: "1.0",
      lastModified: "2025-09-21T14:00:00.000+09:00",
    };

    localStorageMock.getItem.mockImplementation((key) => {
      if (key === "classPlannerData") {
        return JSON.stringify(mockData);
      }
      if (key === "supabase_user_id") {
        return "test-user-id";
      }
      return null;
    });

    const { result } = renderHook(() => useCachedData());

    expect(result.current.studentCount).toBe(3);
    expect(result.current.subjectCount).toBe(2);
    expect(result.current.sessionCount).toBe(4);
    expect(result.current.enrollmentCount).toBe(3);
  });
});
