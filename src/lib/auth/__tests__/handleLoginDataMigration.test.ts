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
  teachers: [],
  version: "1.0",
  lastModified: new Date().toISOString(),
};

const serverData: ClassPlannerData = {
  students: [{ id: "server-s1", name: "Server Student" }],
  subjects: [{ id: "server-sub1", name: "서버 과목", color: "#ff0000" }],
  sessions: [],
  enrollments: [],
  teachers: [],
  version: "1.0",
  lastModified: new Date().toISOString(),
};

const localData: ClassPlannerData = {
  students: [{ id: "anon-s1", name: "Anonymous Student" }],
  subjects: [{ id: "anon-sub1", name: "익명 과목", color: "#00ff00" }],
  sessions: [],
  enrollments: [],
  teachers: [],
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

  // userId 키 보호 케이스 (온보딩 전 로그인 상태에서 입력한 데이터)
  it("anonymous 없고 userId 키에 데이터 있고 서버 비어있으면 upload-local", () => {
    storage["supabase_user_id"] = "user-local";
    storage["classPlannerData:user-local"] = JSON.stringify(localData);
    const result = checkLoginDataConflict(emptyData);
    expect(result.action).toBe("upload-local");
  });

  it("anonymous 없고 userId 키에 데이터 있고 서버도 있으면 use-server (이전 동기화 데이터, 충돌 불필요)", () => {
    storage["supabase_user_id"] = "user-local";
    storage["classPlannerData:user-local"] = JSON.stringify(localData);
    const result = checkLoginDataConflict(serverData);
    expect(result.action).toBe("use-server");
  });

  it("anonymous 없고 userId 키도 비어있으면 use-server", () => {
    storage["supabase_user_id"] = "user-local";
    storage["classPlannerData:user-local"] = JSON.stringify(emptyData);
    const result = checkLoginDataConflict(serverData);
    expect(result.action).toBe("use-server");
  });

  it("anon에 subjects만 9개 있고 students/sessions/enrollments는 0 → use-server", () => {
    const subjectsOnlyData: ClassPlannerData = {
      students: [],
      subjects: Array.from({ length: 9 }, (_, i) => ({
        id: `default-${i + 1}`,
        name: `과목${i + 1}`,
        color: "#fbbf24",
      })),
      sessions: [],
      enrollments: [],
      teachers: [],
      version: "1.0",
      lastModified: new Date().toISOString(),
    };
    storage["classPlannerData:anonymous"] = JSON.stringify(subjectsOnlyData);
    const result = checkLoginDataConflict(serverData);
    expect(result.action).toBe("use-server");
  });

  it("anon에 enrollments만 있고 students/sessions는 0 → conflict (enrollments는 의미 있는 데이터)", () => {
    const enrollmentsOnlyData: ClassPlannerData = {
      students: [],
      subjects: [],
      sessions: [],
      enrollments: [{ id: "e1", studentId: "s1", subjectId: "sub1" }],
      teachers: [],
      version: "1.0",
      lastModified: new Date().toISOString(),
    };
    storage["classPlannerData:anonymous"] = JSON.stringify(enrollmentsOnlyData);
    const result = checkLoginDataConflict(serverData);
    expect(result.action).toBe("conflict");
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

  it("anonymous도 없고 userId 키도 없으면 에러 throw", async () => {
    storage["supabase_user_id"] = "user-999";
    // userId 키 데이터도 없는 상태
    await expect(applyLocalDataChoice("user-999", emptyData)).rejects.toThrow(
      "로컬 데이터를 찾을 수 없습니다"
    );
  });

  it("userId 키 데이터로 마이그레이션 — anonymous 키 삭제 안 함", async () => {
    // anonymous 없음, userId 키에 데이터 있음 (온보딩 전 로그인 상태)
    storage["supabase_user_id"] = "user-999";
    storage["classPlannerData:user-999"] = JSON.stringify(localData);

    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ success: true, data: [] }), {
          headers: { "Content-Type": "application/json" },
        })
      );
    vi.stubGlobal("fetch", fetchMock);

    await applyLocalDataChoice("user-999", emptyData);

    // anonymous 키가 원래 없었으니 삭제 시도 없음 (anonymous 키 없음 유지)
    expect(storage["classPlannerData:anonymous"]).toBeUndefined();
    // supabase_user_id 설정 확인
    expect(storage["supabase_user_id"]).toBe("user-999");
    // re-fetch 5번 호출 (students, subjects, sessions, enrollments, teachers)
    expect(fetchMock).toHaveBeenCalledTimes(5);

    vi.unstubAllGlobals();
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
    // re-fetch 5번 호출 확인 (students, subjects, sessions, enrollments, teachers)
    expect(fetchMock).toHaveBeenCalledTimes(5);

    vi.unstubAllGlobals();
  });

  // 부분 실패(일부만 동기화) → throw 안 함 + anonymous 삭제로 재flood loop 차단.
  // 2026-05-29 migration-partial-failure-resilience (강사 미배정 세션 400 → 무한 spinner 사고).
  it("부분 실패 — throw 안 함, anonymous 삭제(loop 차단), 실패 레코드 반환", async () => {
    storage["classPlannerData:anonymous"] = JSON.stringify(localData);

    migrateLocalDataToServerMock.mockResolvedValueOnce({
      success: false,
      syncedCounts: { students: 1, subjects: 0, enrollments: 0, sessions: 0 }, // 1개 성공
      errors: [{ entity: "session", localId: "anon-sess1", message: "강사 미배정" }],
    });

    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ success: true, data: [] }), {
          headers: { "Content-Type": "application/json" },
        })
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await applyLocalDataChoice("user-999", emptyData);

    // totalSynced>0 → anonymous 삭제 (다음 로그인 재flood 차단)
    expect(storage["classPlannerData:anonymous"]).toBeUndefined();
    // re-fetch 실행됨 (throw 안 함)
    expect(fetchMock).toHaveBeenCalledTimes(5);
    // 실패 레코드 caller 로 반환
    expect(result.failed).toEqual([{ entity: "session", message: "강사 미배정" }]);
    expect(result.totalSynced).toBe(1);

    vi.unstubAllGlobals();
  });

  it("전체 실패(0 동기화) — throw 안 함, anonymous 보존(transient 재시도 여지), 실패 반환", async () => {
    storage["classPlannerData:anonymous"] = JSON.stringify(localData);

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

    const result = await applyLocalDataChoice("user-999", emptyData);

    // totalSynced=0 + anonymous.students>0 → 보존
    expect(storage["classPlannerData:anonymous"]).toBe(JSON.stringify(localData));
    expect(result.failed).toHaveLength(1);
    expect(result.totalSynced).toBe(0);

    vi.unstubAllGlobals();
  });
});
