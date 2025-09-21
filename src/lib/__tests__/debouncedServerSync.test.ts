/**
 * debounced 서버 동기화 시스템 테스트
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanupSyncSystem,
  forceSyncToServer,
  getSyncStatus,
  initializeSyncSystem,
  scheduleServerSync,
} from "../debouncedServerSync";

// Mock dependencies
vi.mock("../logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../timeUtils", () => ({
  getKSTTime: () => "2025-09-21T16:00:00.000+09:00",
}));

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
const mockDispatchEvent = vi.fn();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

Object.defineProperty(window, "addEventListener", {
  value: mockAddEventListener,
});

Object.defineProperty(window, "removeEventListener", {
  value: mockRemoveEventListener,
});

Object.defineProperty(window, "dispatchEvent", {
  value: mockDispatchEvent,
});

// Mock fetch
global.fetch = vi.fn();

// Mock timers
vi.useFakeTimers();

describe("debouncedServerSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
    localStorageMock.getItem.mockClear();
    mockAddEventListener.mockClear();
    mockRemoveEventListener.mockClear();
    mockDispatchEvent.mockClear();
  });

  afterEach(() => {
    cleanupSyncSystem();
  });

  describe("동기화 시스템 초기화", () => {
    it("이벤트 리스너를 등록해야 한다", () => {
      initializeSyncSystem();

      expect(mockAddEventListener).toHaveBeenCalledWith(
        "classPlannerDataChanged",
        expect.any(Function)
      );
      expect(mockAddEventListener).toHaveBeenCalledWith(
        "beforeunload",
        expect.any(Function)
      );
      expect(mockAddEventListener).toHaveBeenCalledWith(
        "userLoggedOut",
        expect.any(Function)
      );
    });

    it("동기화 상태를 조회할 수 있어야 한다", () => {
      const status = getSyncStatus();

      expect(status).toHaveProperty("isActive");
      expect(status).toHaveProperty("queueLength");
      expect(status).toHaveProperty("isSyncing");
      expect(status).toHaveProperty("lastSyncTime");
      expect(status).toHaveProperty("nextSyncIn");
    });
  });

  describe("동기화 예약", () => {
    it("데이터 변경 시 동기화를 예약해야 한다", () => {
      const testData = {
        students: [{ id: "test-1", name: "김철수" }],
        subjects: [],
        sessions: [],
        enrollments: [],
        version: "1.0",
        lastModified: "2025-09-21T16:00:00.000+09:00",
      };

      scheduleServerSync(testData);

      const status = getSyncStatus();
      expect(status.queueLength).toBe(1);
    });

    it("여러 변경사항 시 최신 데이터만 유지해야 한다", () => {
      const testData1 = {
        students: [{ id: "test-1", name: "김철수" }],
        subjects: [],
        sessions: [],
        enrollments: [],
        version: "1.0",
        lastModified: "2025-09-21T16:00:00.000+09:00",
      };

      const testData2 = {
        students: [
          { id: "test-1", name: "김철수" },
          { id: "test-2", name: "이영희" },
        ],
        subjects: [],
        sessions: [],
        enrollments: [],
        version: "1.0",
        lastModified: "2025-09-21T16:01:00.000+09:00",
      };

      scheduleServerSync(testData1);
      scheduleServerSync(testData2);

      const status = getSyncStatus();
      expect(status.queueLength).toBe(1); // 최신 데이터만 유지
    });
  });

  describe("즉시 동기화", () => {
    it("성공적인 서버 동기화를 처리해야 한다", async () => {
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

      const testData = {
        students: [{ id: "test-1", name: "김철수" }],
        subjects: [],
        sessions: [],
        enrollments: [],
        version: "1.0",
        lastModified: "2025-09-21T16:00:00.000+09:00",
      };

      const result = await forceSyncToServer(testData);

      expect(result.success).toBe(true);
      expect(result.syncedAt).toBe("2025-09-21T16:00:00.000+09:00");
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
    });

    it("인증 정보 없을 시 에러를 반환해야 한다", async () => {
      localStorageMock.getItem.mockReturnValue(null);

      const testData = {
        students: [],
        subjects: [],
        sessions: [],
        enrollments: [],
        version: "1.0",
        lastModified: "2025-09-21T16:00:00.000+09:00",
      };

      const result = await forceSyncToServer(testData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("사용자 ID가 없습니다");
    });

    it("서버 에러 시 실패를 반환해야 한다", async () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === "supabase_user_id") return "test-user-id";
        if (key === "sb-kcyqftasdxtqslrhbctv-auth-token") {
          return JSON.stringify({ access_token: "test-token" });
        }
        return null;
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: "Server error",
        }),
      });

      const testData = {
        students: [],
        subjects: [],
        sessions: [],
        enrollments: [],
        version: "1.0",
        lastModified: "2025-09-21T16:00:00.000+09:00",
      };

      const result = await forceSyncToServer(testData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Server error");
    });
  });

  describe("시스템 정리", () => {
    it("시스템을 성공적으로 정리해야 한다", () => {
      initializeSyncSystem();
      scheduleServerSync({
        students: [],
        subjects: [],
        sessions: [],
        enrollments: [],
        version: "1.0",
        lastModified: "2025-09-21T16:00:00.000+09:00",
      });

      const statusBefore = getSyncStatus();
      expect(statusBefore.queueLength).toBe(1);

      cleanupSyncSystem();

      const statusAfter = getSyncStatus();
      expect(statusAfter.queueLength).toBe(0);
      expect(statusAfter.isActive).toBe(false);
    });
  });
});
