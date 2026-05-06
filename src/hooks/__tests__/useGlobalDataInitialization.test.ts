/**
 * useGlobalDataInitialization 기본 기능 테스트
 * 스마트 초기화 로직 및 기본 동작을 검증합니다.
 */

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useGlobalDataInitialization } from "../useGlobalDataInitialization";
import { supabase } from "../../utils/supabaseClient";
import { checkLoginDataConflict } from "../../lib/auth/handleLoginDataMigration";

// Mock dependencies
vi.mock("../../lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../../lib/auth/handleLoginDataMigration", () => ({
  checkLoginDataConflict: vi.fn(() => ({ action: "use-server" })),
  applyServerChoice: vi.fn(),
  applyLocalDataChoice: vi.fn(),
}));

// timeUtils mock removed - using standard Date now

vi.mock("../../utils/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}));

// Mock fetch
global.fetch = vi.fn();

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

describe("useGlobalDataInitialization 기본 기능", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
  });

  it("초기 상태가 올바르게 설정되어야 한다", () => {
    const { result } = renderHook(() => useGlobalDataInitialization());

    expect(result.current.isInitialized).toBe(false);
    expect(result.current.isInitializing).toBe(false);
  });

  it("필수 속성들이 정의되어야 한다", () => {
    const { result } = renderHook(() => useGlobalDataInitialization());

    expect(result.current).toHaveProperty("isInitialized");
    expect(result.current).toHaveProperty("isInitializing");
    expect(typeof result.current.isInitialized).toBe("boolean");
    expect(typeof result.current.isInitializing).toBe("boolean");
  });

  it("훅이 에러 없이 마운트되어야 한다", () => {
    expect(() => {
      renderHook(() => useGlobalDataInitialization());
    }).not.toThrow();
  });

  it("훅 이름과 export가 올바르게 정의되어야 한다", () => {
    expect(useGlobalDataInitialization).toBeDefined();
    expect(typeof useGlobalDataInitialization).toBe("function");
    expect(useGlobalDataInitialization.name).toBe(
      "useGlobalDataInitialization"
    );
  });

  // NOTE: "기본 과목 추가 시 lastModified가 갱신되어야 한다" 테스트는 삭제됨.
  // lastModified는 훅 내부 상태로 public API에 노출되지 않으므로
  // (return 값: isInitialized, isInitializing, conflictState, resolveConflict, isMigrating, migrationError)
  // 훅 외부에서 직접 검증할 수 없다.
  // 해당 동작을 검증하려면 localStorage.setItem 호출 인자를 파싱하여
  // lastModified 필드가 초기화 전후로 달라지는지 확인하는 방식이 필요하며,
  // 이는 별도 통합 테스트(integration test) 수준에서 다루는 것이 적합하다.
  // 관련 Issue: class-planner tech-debt backlog
});

describe("익명 사용자 초기화", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();

    // supabase returns no session
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    } as any);
  });

  it("세션 없으면 anonymous 스토리지를 생성하지 않는다 (자동 시딩 제거)", async () => {
    // Phase 5-D fix: anonymous path no longer auto-seeds DEFAULT_SUBJECTS.
    // Visiting without a session must NOT touch localStorage at all.
    localStorageMock.getItem.mockReturnValue(null);

    const { result } = renderHook(() => useGlobalDataInitialization());
    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    const setItemCalls: string[][] = localStorageMock.setItem.mock.calls;
    const anonymousCall = setItemCalls.find(
      (args) => args[0] === "classPlannerData:anonymous"
    );
    expect(anonymousCall).toBeUndefined();
  });

  it("세션 없이 방문만 해도 anonymous 스토리지를 생성하지 않는다", async () => {
    // getItem returns null — localStorage에 아무것도 없음
    localStorageMock.getItem.mockReturnValue(null);

    const { result } = renderHook(() => useGlobalDataInitialization());
    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    // setItem이 "classPlannerData:anonymous" 키로 호출되면 안 됨
    const setItemCalls: string[][] = localStorageMock.setItem.mock.calls;
    const anonymousCall = setItemCalls.find(
      (args) => args[0] === "classPlannerData:anonymous"
    );
    expect(anonymousCall).toBeUndefined();
  });

  it("anonymous 키가 이미 있으면 재초기화 안 함 (기존 데이터 유지)", async () => {
    const existingData = JSON.stringify({
      students: [{ id: "s1", name: "Existing" }],
      subjects: [],
      sessions: [],
      enrollments: [],
      version: "1.0",
      lastModified: new Date().toISOString(),
    });

    // getItem returns existing data for ANONYMOUS_STORAGE_KEY
    localStorageMock.getItem.mockImplementation((key: string) => {
      if (key === "classPlannerData:anonymous") return existingData;
      return null;
    });

    const { result } = renderHook(() => useGlobalDataInitialization());
    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    // setItem should NOT have been called with the anonymous key
    const setItemCalls: string[][] = localStorageMock.setItem.mock.calls;
    const anonymousCall = setItemCalls.find((args) => args[0] === "classPlannerData:anonymous");
    expect(anonymousCall).toBeUndefined();
  });
});

describe("로그인 사용자 — 충돌 없음", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: "user-123", email: "test@test.com" } } },
      error: null,
    } as any);

    localStorageMock.getItem.mockReturnValue(null);

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: [] }),
    });

    // no conflict
    vi.mocked(checkLoginDataConflict).mockReturnValue({ action: "use-server" });
  });

  it("anonymous 데이터 없으면 conflictState null", async () => {
    const { result } = renderHook(() => useGlobalDataInitialization());
    await waitFor(() => expect(result.current.isInitialized).toBe(true));
    expect(result.current.conflictState).toBeNull();
  });

  it("서버에서 받은 teachers가 localStorage에 저장된다 (빈 배열 덮어쓰기 버그 방지)", async () => {
    const serverTeachers = [{ id: "t1", name: "김선생", userId: "user-123" }];

    global.fetch = vi.fn().mockImplementation((url: string) => {
      const data = url.includes("/api/teachers") ? serverTeachers : [];
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data }),
      });
    });

    const { result } = renderHook(() => useGlobalDataInitialization());
    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    const setItemCalls: string[][] = localStorageMock.setItem.mock.calls;
    const dataCall = setItemCalls.find((args) => args[0].startsWith("classPlannerData:"));
    expect(dataCall).toBeDefined();

    const saved = JSON.parse(dataCall![1]);
    // teacher-subjects fetch가 빈 배열 반환 → subjectIds: [] 가 hydration되는 것이 올바른 동작
    expect(saved.teachers).toEqual([{ ...serverTeachers[0], subjectIds: [] }]);
  });
});

describe("로그인 사용자 — 충돌 처리", () => {
  const anonymousData = {
    students: [{ id: "a1", name: "Anon" }],
    subjects: [{ id: "as1", name: "익명과목", color: "#fff" }],
    sessions: [],
    enrollments: [],
    teachers: [],
    version: "1.0",
    lastModified: new Date().toISOString(),
  };

  const serverData = {
    students: [{ id: "s1", name: "ServerStudent" }],
    subjects: [{ id: "ss1", name: "서버과목", color: "#000" }],
    sessions: [],
    enrollments: [],
    teachers: [],
    version: "1.0",
    lastModified: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: "user-456", email: "user@test.com" } } },
      error: null,
    } as any);

    // anonymous data present in localStorage
    localStorageMock.getItem.mockImplementation((key: string) => {
      if (key === "classPlannerData:anonymous")
        return JSON.stringify(anonymousData);
      return null;
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: [] }),
    });
  });

  it("anonymous + server 모두 있으면 conflictState 설정, isInitialized false", async () => {
    vi.mocked(checkLoginDataConflict).mockReturnValue({
      action: "conflict",
      localData: anonymousData,
      serverData,
    });

    const { result } = renderHook(() => useGlobalDataInitialization());

    await waitFor(() => expect(result.current.conflictState).not.toBeNull());

    expect(result.current.conflictState?.action).toBe("conflict");
    expect(result.current.isInitialized).toBe(false);
  });

  it("anonymous 있고 서버 비어있으면 upload-local 자동 처리, isInitialized true", async () => {
    vi.mocked(checkLoginDataConflict).mockReturnValue({ action: "upload-local" });

    const { result } = renderHook(() => useGlobalDataInitialization());

    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    expect(result.current.conflictState).toBeNull();
  });

  it("resolveConflict('server') 호출 시 isInitialized true, conflictState null", async () => {
    vi.mocked(checkLoginDataConflict).mockReturnValue({
      action: "conflict",
      localData: anonymousData,
      serverData,
    });

    const { result } = renderHook(() => useGlobalDataInitialization());

    // Wait for conflict state to be set
    await waitFor(() => expect(result.current.conflictState).not.toBeNull());
    expect(result.current.isInitialized).toBe(false);

    // Resolve with server choice
    result.current.resolveConflict("server");

    await waitFor(() => expect(result.current.isInitialized).toBe(true));
    expect(result.current.conflictState).toBeNull();
  });

  it("resolveConflict('local') 호출 시 isInitialized true, conflictState null", async () => {
    vi.mocked(checkLoginDataConflict).mockReturnValue({
      action: "conflict",
      localData: anonymousData,
      serverData,
    });

    const { result } = renderHook(() => useGlobalDataInitialization());

    // Wait for conflict state to be set
    await waitFor(() => expect(result.current.conflictState).not.toBeNull());
    expect(result.current.isInitialized).toBe(false);

    // Resolve with local choice
    result.current.resolveConflict("local");

    await waitFor(() => expect(result.current.isInitialized).toBe(true));
    expect(result.current.conflictState).toBeNull();
  });
});

describe("로그인 사용자 — 로컬-서버 lastModified 동기화 (Phase 1)", () => {
  // Phase 1 (Hybrid Local-First): server fetch이 무조건 localStorage를 덮어쓰는
  // 기존 동작을 timestamp 비교로 보호. local이 더 신선하면 skip.
  // 학생 add 후 fire-and-forget sync 실패 + 새로고침 = 학생 사라짐 버그 방지.

  const USER_ID = "user-123";
  // 로컬 bag을 controlled JSON으로 반환하기 위한 helper
  const STORAGE_KEY = `classPlannerData:${USER_ID}`;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: USER_ID, email: "test@test.com" } } },
      error: null,
    } as any);

    vi.mocked(checkLoginDataConflict).mockReturnValue({ action: "use-server" });
  });

  function mockLocalBag(bag: {
    students?: any[];
    subjects?: any[];
    sessions?: any[];
    enrollments?: any[];
    teachers?: any[];
    lastModified: string;
  }) {
    localStorageMock.getItem.mockImplementation((key: string) => {
      if (key === "supabase_user_id") return USER_ID;
      if (key === STORAGE_KEY)
        return JSON.stringify({
          students: bag.students ?? [],
          subjects: bag.subjects ?? [],
          sessions: bag.sessions ?? [],
          enrollments: bag.enrollments ?? [],
          teachers: bag.teachers ?? [],
          version: "1.0",
          lastModified: bag.lastModified,
        });
      return null;
    });
  }

  function mockServerFetches(payload: {
    students?: any[];
    subjects?: any[];
    sessions?: any[];
    enrollments?: any[];
    teachers?: any[];
    fail?: boolean;
  }) {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (payload.fail) return Promise.reject(new Error("network"));
      let data: any[] = [];
      if (url.includes("/api/students")) data = payload.students ?? [];
      else if (url.includes("/api/subjects")) data = payload.subjects ?? [];
      else if (url.includes("/api/sessions")) data = payload.sessions ?? [];
      else if (url.includes("/api/enrollments")) data = payload.enrollments ?? [];
      else if (url.includes("/api/teachers")) data = payload.teachers ?? [];
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data }),
      });
    });
  }

  function setItemDataPayload(): any | null {
    const calls = localStorageMock.setItem.mock.calls as string[][];
    const dataCall = calls.find((args) => args[0] === STORAGE_KEY);
    return dataCall ? JSON.parse(dataCall[1]) : null;
  }

  it("로컬이 서버보다 2초 늦음 → 덮어쓴다 (server-newer)", async () => {
    const T = Date.now();
    mockLocalBag({
      students: [{ id: "old", name: "기존학생" }],
      subjects: [{ id: "sub1", name: "수학", color: "#fff" }],
      lastModified: new Date(T - 2000).toISOString(),
    });
    mockServerFetches({
      students: [{ id: "srv1", name: "서버학생", updatedAt: new Date(T).toISOString() }],
      subjects: [{ id: "sub-srv", name: "과학", color: "#abc", updatedAt: new Date(T).toISOString() }],
    });

    const { result } = renderHook(() => useGlobalDataInitialization());
    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    const saved = setItemDataPayload();
    expect(saved).not.toBeNull();
    // server 데이터로 덮어써짐
    expect(saved.students.map((s: any) => s.id)).toEqual(["srv1"]);
  });

  it("로컬이 서버보다 2초 빠름 → 덮어쓰지 않는다 (local-newer, ★ 버그 fix)", async () => {
    const T = Date.now();
    mockLocalBag({
      students: [{ id: "local-new", name: "방금추가한학생" }],
      subjects: [{ id: "sub1", name: "수학", color: "#fff" }],
      lastModified: new Date(T + 2000).toISOString(),
    });
    mockServerFetches({
      // server subjects를 1개 둬서 DEFAULT_SUBJECTS bootstrap 분기 회피 → Phase 1 로직 진입
      subjects: [{ id: "sub-srv", name: "수학", color: "#fff", updatedAt: new Date(T).toISOString() }],
      students: [{ id: "srv1", name: "서버학생", updatedAt: new Date(T).toISOString() }],
    });

    const { result } = renderHook(() => useGlobalDataInitialization());
    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    const saved = setItemDataPayload();
    // skip 됐으므로 STORAGE_KEY 에 setItem 호출 자체가 없어야 함
    expect(saved).toBeNull();
  });

  it("로컬 비어 있음 → 덮어쓴다 (local-empty, academy switch 보호)", async () => {
    const T = Date.now();
    // 빈 entity + fresh lastModified (academy switch 시뮬레이션)
    mockLocalBag({
      lastModified: new Date(T + 60_000).toISOString(),
    });
    mockServerFetches({
      students: [{ id: "srv1", name: "S", updatedAt: new Date(T).toISOString() }],
    });

    const { result } = renderHook(() => useGlobalDataInitialization());
    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    const saved = setItemDataPayload();
    expect(saved).not.toBeNull();
    expect(saved.students.map((s: any) => s.id)).toEqual(["srv1"]);
  });

  it("모든 fetch 실패 → 덮어쓰지 않는다 (server-unreachable)", async () => {
    const T = Date.now();
    mockLocalBag({
      students: [{ id: "local-1", name: "기존" }],
      lastModified: new Date(T).toISOString(),
    });
    mockServerFetches({ fail: true });

    const { result } = renderHook(() => useGlobalDataInitialization());
    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    const saved = setItemDataPayload();
    expect(saved).toBeNull(); // 로컬 보존
  });

  it("로컬-서버 1초 이내 차이 → 덮어쓴다 (tiebreak)", async () => {
    const T = Date.now();
    mockLocalBag({
      students: [{ id: "local", name: "S" }],
      lastModified: new Date(T + 500).toISOString(),
    });
    mockServerFetches({
      students: [{ id: "srv", name: "Server", updatedAt: new Date(T).toISOString() }],
    });

    const { result } = renderHook(() => useGlobalDataInitialization());
    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    const saved = setItemDataPayload();
    expect(saved).not.toBeNull();
    expect(saved.students.map((s: any) => s.id)).toEqual(["srv"]);
  });

  it("레거시 데이터 (모든 updatedAt 없음) → 덮어쓰지 않는다 (server-unreachable-or-no-timestamps)", async () => {
    const T = Date.now();
    mockLocalBag({
      students: [{ id: "local", name: "S" }],
      subjects: [{ id: "sub1", name: "수학", color: "#fff" }],
      lastModified: new Date(T).toISOString(),
    });
    // 서버 응답에 updatedAt 없음 (legacy entries) → computeServerLastModified=null
    // bootstrap 분기 회피 위해 subjects도 비-empty (no updatedAt)
    mockServerFetches({
      students: [{ id: "srv", name: "Server" }],
      subjects: [{ id: "sub-srv", name: "Subj", color: "#fff" }],
    });

    const { result } = renderHook(() => useGlobalDataInitialization());
    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    const saved = setItemDataPayload();
    expect(saved).toBeNull(); // 로컬 보존 (보수적)
  });

});
