import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkLoginDataConflict,
  applyServerChoice,
  applyLocalDataChoice,
} from "../handleLoginDataMigration";
import type { ClassPlannerData } from "../../localStorageCrud";

// Mock localStorage
const storage: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => storage[key] || null),
  setItem: vi.fn((key: string, value: string) => { storage[key] = value; }),
  removeItem: vi.fn((key: string) => { delete storage[key]; }),
  clear: vi.fn(() => { Object.keys(storage).forEach((k) => delete storage[k]); }),
};
Object.defineProperty(window, "localStorage", { value: localStorageMock, writable: true });

vi.mock("../../logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// fullDataMigration mock — default: success with synced data
const migrateLocalDataToServerMock = vi.fn().mockResolvedValue({
  success: true,
  syncedCounts: { students: 1, subjects: 1, enrollments: 0, sessions: 0 },
  errors: [],
});
vi.mock("../fullDataMigration", () => ({
  migrateLocalDataToServer: (...args: unknown[]) => migrateLocalDataToServerMock(...args),
}));

const emptyData: ClassPlannerData = {
  students: [],
  subjects: [],
  sessions: [],
  enrollments: [],
  version: "1.0",
  lastModified: new Date().toISOString(),
};

const serverData: ClassPlannerData = {
  students: [{ id: "server-s1", name: "Server Student" }],
  subjects: [{ id: "server-sub1", name: "서버 과목", color: "#ff0000" }],
  sessions: [],
  enrollments: [],
  version: "1.0",
  lastModified: new Date().toISOString(),
};

const localData: ClassPlannerData = {
  students: [{ id: "anon-s1", name: "Anonymous Student" }],
  subjects: [{ id: "anon-sub1", name: "익명 과목", color: "#00ff00" }],
  sessions: [],
  enrollments: [],
  version: "1.0",
  lastModified: new Date().toISOString(),
};

describe("checkLoginDataConflict", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it("anonymous 데이터 없으면 use-server", () => {
    const result = checkLoginDataConflict(serverData);
    expect(result.action).toBe("use-server");
  });

  it("anonymous 데이터가 비어있으면 use-server", () => {
    storage["classPlannerData:anonymous"] = JSON.stringify(emptyData);
    const result = checkLoginDataConflict(serverData);
    expect(result.action).toBe("use-server");
  });

  it("anonymous 데이터 있고 서버 비어있으면 upload-local", () => {
    storage["classPlannerData:anonymous"] = JSON.stringify(localData);
    const result = checkLoginDataConflict(emptyData);
    expect(result.action).toBe("upload-local");
  });

  it("anonymous 데이터 있고 서버도 있으면 conflict", () => {
    storage["classPlannerData:anonymous"] = JSON.stringify(localData);
    const result = checkLoginDataConflict(serverData);
    expect(result.action).toBe("conflict");
    if (result.action === "conflict") {
      expect(result.localData.students[0].name).toBe("Anonymous Student");
      expect(result.serverData.students[0].name).toBe("Server Student");
    }
  });

  it("anonymous 키가 malformed JSON이면 use-server", () => {
    storage["classPlannerData:anonymous"] = "not-valid-json";
    const result = checkLoginDataConflict(serverData);
    expect(result.action).toBe("use-server");
  });
});

describe("applyServerChoice", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it("anonymous 키 삭제", () => {
    storage["classPlannerData:anonymous"] = JSON.stringify(localData);
    applyServerChoice();
    expect(storage["classPlannerData:anonymous"]).toBeUndefined();
  });
});

describe("applyLocalDataChoice", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    migrateLocalDataToServerMock.mockResolvedValue({
      success: true,
      syncedCounts: { students: 1, subjects: 1, enrollments: 0, sessions: 0 },
      errors: [],
    });
  });

  it("anonymous 데이터 없으면 아무것도 안 함", async () => {
    await applyLocalDataChoice("user-999", emptyData);
    expect(storage["classPlannerData:user-999"]).toBeUndefined();
  });

  it("마이그레이션 완료 후 anonymous 키 삭제, supabase_user_id 설정", async () => {
    storage["classPlannerData:anonymous"] = JSON.stringify(localData);

    // re-fetch mock: GET 엔드포인트들
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ success: true, data: [] }), {
          headers: { "Content-Type": "application/json" },
        })
      );
    vi.stubGlobal("fetch", fetchMock);

    await applyLocalDataChoice("user-999", emptyData);

    // anonymous 삭제 확인
    expect(storage["classPlannerData:anonymous"]).toBeUndefined();
    // supabase_user_id 설정 확인
    expect(storage["supabase_user_id"]).toBe("user-999");
    // re-fetch 4번 호출 확인 (students, subjects, sessions, enrollments)
    expect(fetchMock).toHaveBeenCalledTimes(4);

    vi.unstubAllGlobals();
  });

  it("전체 마이그레이션 실패 시 (totalSynced=0) anonymous 키 보존", async () => {
    storage["classPlannerData:anonymous"] = JSON.stringify(localData);

    // mock: 완전 실패 — 0건 동기화
    migrateLocalDataToServerMock.mockResolvedValueOnce({
      success: false,
      syncedCounts: { students: 0, subjects: 0, enrollments: 0, sessions: 0 },
      errors: [{ entity: "student", localId: "anon-s1", message: "네트워크 오류" }],
    });

    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ success: true, data: [] }), {
          headers: { "Content-Type": "application/json" },
        })
      );
    vi.stubGlobal("fetch", fetchMock);

    await applyLocalDataChoice("user-999", emptyData);

    // anonymous 키가 보존되어야 함
    expect(storage["classPlannerData:anonymous"]).toBe(JSON.stringify(localData));

    vi.unstubAllGlobals();
  });
});
