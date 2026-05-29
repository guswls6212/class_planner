/**
 * useGlobalDataInitialization 기본 기능 테스트
 * 스마트 초기화 로직 및 기본 동작을 검증합니다.
 */

import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useGlobalDataInitialization } from "../useGlobalDataInitialization";
import { supabase } from "../../utils/supabaseClient";
import { checkLoginDataConflict } from "../../lib/auth/handleLoginDataMigration";
import { __resetCacheForTest } from "../../lib/localStorageCrud";

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
  applyLocalDataChoice: vi.fn().mockResolvedValue({ failed: [], totalSynced: 1 }),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn(), info: vi.fn() },
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
    // PR #B-3 이후 server-side nested join으로 subjectIds가 응답에 포함됨.
    const serverTeachers = [{ id: "t1", name: "김선생", userId: "user-123", subjectIds: [] }];

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
    expect(saved.teachers).toEqual([serverTeachers[0]]);
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

  it("upload-local 자동 마이그레이션 실패 시 toast로 표면화 + migrationError set + isInitialized true 진행 (UAT 2026-05-08 회귀 가드)", async () => {
    vi.mocked(checkLoginDataConflict).mockReturnValue({ action: "upload-local" });
    const { applyLocalDataChoice } = await import("../../lib/auth/handleLoginDataMigration");
    const errMsg =
      "데이터 동기화에 실패했습니다: session: weekStartDate (YYYY-MM-DD) is required";
    vi.mocked(applyLocalDataChoice).mockRejectedValueOnce(new Error(errMsg));
    const { toast } = await import("sonner");

    const { result } = renderHook(() => useGlobalDataInitialization());

    // catch 후 setIsInitialized(true)로 앱 진입을 막지 않는다
    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    expect(result.current.migrationError).toBe(errMsg);
    expect(toast.error).toHaveBeenCalledWith(
      "자동 동기화 실패",
      expect.objectContaining({ description: errMsg }),
    );
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

    // module-level cache 비우기 — 이전 test의 stale data가 Phase 1 비교에 영향 차단
    __resetCacheForTest();

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

  it("UAT 강지원 시나리오: 학생 모두 삭제 + subject 1개 + server in-flight (학생 1명) → 학생 부활 안 함", async () => {
    // 사용자가 학생 7명 다 삭제 → local students=0 + sessions=0 + subject 1개 살아있음.
    // server는 마지막 학생 DELETE in-flight 또는 fetch가 그 직전 snapshot.
    // detectPartialCorruption이 (sessions=0 + subject 있음 + server.sessions>0) 매칭으로
    // server overwrite 강제하면 학생 부활. fix: students/enrollments 조건 추가.
    const T = Date.now();
    mockLocalBag({
      subjects: [{ id: "sub1", name: "수학", color: "#fff" }],
      lastModified: new Date(T).toISOString(),
    });
    mockServerFetches({
      students: [{ id: "srv-resurrect", name: "강지원", updatedAt: new Date(T - 5000).toISOString() }],
      subjects: [{ id: "sub1", name: "수학", color: "#fff", updatedAt: new Date(T - 60000).toISOString() }],
      sessions: [{ id: "ses1", updatedAt: new Date(T - 60000).toISOString() }],
    });

    const { result } = renderHook(() => useGlobalDataInitialization());
    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    const saved = setItemDataPayload();
    // local students=0 그대로 — server in-flight student 무시 (사용자 의도 우선)
    if (saved) {
      expect(saved.students).toEqual([]);
    }
    // saved=null (skip)인 경우도 OK — 어쨌든 부활 안 함
  });

  it("UAT 박태환 시나리오: 학생 일부만 살아있음 + sessions=0 + server in-flight → 부활 안 함", async () => {
    // 사용자가 학생 7명 추가 후 6명 삭제, 박태환 남음 → 박태환 마저 삭제 → 5초 안 새로고침.
    // local: students=1 (남은 학생 또는 stale), subjects=1, sessions=0
    // server: students=1 (박태환 in-flight), subjects=1, sessions=1
    // 기존 detectPartialCorruption은 (sessions=0 + students>0 + server.sessions>0)으로
    // false positive 매칭 → 박태환 부활. corruption 분기 제거 후 skip → 부활 안 함.
    const T = Date.now();
    mockLocalBag({
      students: [{ id: "local-survivor", name: "남은학생" }],
      subjects: [{ id: "sub1", name: "수학", color: "#fff" }],
      lastModified: new Date(T).toISOString(),
    });
    mockServerFetches({
      students: [{ id: "srv-pte", name: "박태환", updatedAt: new Date(T - 5000).toISOString() }],
      subjects: [{ id: "sub1", name: "수학", color: "#fff", updatedAt: new Date(T - 60000).toISOString() }],
      sessions: [{ id: "ses1", updatedAt: new Date(T - 60000).toISOString() }],
    });

    const { result } = renderHook(() => useGlobalDataInitialization());
    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    const saved = setItemDataPayload();
    // local students 변경 없어야 (남은학생만, 박태환 부활 X)
    if (saved) {
      expect(saved.students.map((s: any) => s.id)).toEqual(["local-survivor"]);
      expect(saved.students.find((s: any) => s.name === "박태환")).toBeUndefined();
    }
    // saved=null (skip)도 OK — local 그대로 유지
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

describe("Onboarding 가드 (academy 사전 검증)", () => {
  let originalLocation: Location;
  let replaceMock: ReturnType<typeof vi.fn>;

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

    // window.location.replace 호출 검증을 위한 mock
    originalLocation = window.location;
    replaceMock = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        ...originalLocation,
        replace: replaceMock,
      },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });

  it("academy 매핑 없으면 onboarding으로 redirect + 마이그레이션 skip", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/onboarding/status")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({ success: true, hasAcademy: false }),
        });
      }
      // 다른 API는 호출되면 안 되지만 안전망으로 빈 응답
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: [] }),
      });
    });

    renderHook(() => useGlobalDataInitialization());

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/onboarding"));

    // 마이그레이션 함수 호출 X
    expect(checkLoginDataConflict).not.toHaveBeenCalled();

    // anonymous 키 삭제 X (보존)
    const removeCalls: string[][] = localStorageMock.removeItem.mock.calls;
    const anonymousRemove = removeCalls.find(
      (args) => args[0] === "classPlannerData:anonymous"
    );
    expect(anonymousRemove).toBeUndefined();
  });

  it("academy 매핑 있으면 기존 흐름대로 마이그레이션 진행", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/onboarding/status")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              hasAcademy: true,
              academyId: "ac-1",
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: [] }),
      });
    });

    vi.mocked(checkLoginDataConflict).mockReturnValue({ action: "use-server" });

    const { result } = renderHook(() => useGlobalDataInitialization());
    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    expect(replaceMock).not.toHaveBeenCalled();
    expect(checkLoginDataConflict).toHaveBeenCalled();
  });

  it("이미 /onboarding에 있으면 redirect 발동 안 함 (무한 루프 방지)", async () => {
    // pathname을 /onboarding으로 override
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        ...originalLocation,
        pathname: "/onboarding",
        replace: replaceMock,
      },
    });

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/onboarding/status")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({ success: true, hasAcademy: false }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: [] }),
      });
    });

    const { result } = renderHook(() => useGlobalDataInitialization());

    // 초기화는 종결되어야 함 (UI 멈춤 방지)
    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    // replace는 절대 호출되면 안 됨 (무한 루프 핵심 방어)
    expect(replaceMock).not.toHaveBeenCalled();

    // 마이그레이션도 시작 안 함 (academy 없음 — Bug 2 그대로 적용)
    expect(checkLoginDataConflict).not.toHaveBeenCalled();
  });

  it("status fetch 네트워크 실패 시 기존 흐름 폴백", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/onboarding/status")) {
        return Promise.reject(new Error("network down"));
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: [] }),
      });
    });

    vi.mocked(checkLoginDataConflict).mockReturnValue({ action: "use-server" });

    const { result } = renderHook(() => useGlobalDataInitialization());
    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    expect(replaceMock).not.toHaveBeenCalled();
    expect(checkLoginDataConflict).toHaveBeenCalled();
  });
});

describe("Academy 변화 재실행 (UAT 2026-05-09 회귀 가드)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: "u-1", email: "u1@ex.com" } } } as never,
      error: null,
    });
  });

  it("class-planner:academy-changed event dispatch 시 mig 흐름이 재실행된다", async () => {
    // 첫 mount: academy 없음 → onboarding redirect → mig skip
    let hasAcademy = false;
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/onboarding/status")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, hasAcademy }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: [] }),
      });
    });
    vi.mocked(checkLoginDataConflict).mockReturnValue({ action: "use-server" });

    const { result } = renderHook(() => useGlobalDataInitialization());
    // 첫 흐름은 academy 없어서 mig 진입 안 함
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/onboarding/status?userId=u-1"),
      ),
    );
    expect(checkLoginDataConflict).not.toHaveBeenCalled();

    // onboarding 완료 시뮬레이션: academy 생성 + event dispatch
    hasAcademy = true;
    vi.mocked(checkLoginDataConflict).mockClear();
    window.dispatchEvent(new CustomEvent("class-planner:academy-changed"));

    // mig effect 재실행 → checkLoginDataConflict 호출
    await waitFor(() => expect(checkLoginDataConflict).toHaveBeenCalled());
    expect(result.current.isInitialized).toBe(true);
  });

  it("storage 이벤트(active_academy:{userId} 변경)도 mig 흐름을 재실행한다", async () => {
    let hasAcademy = false;
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/onboarding/status")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, hasAcademy }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: [] }),
      });
    });
    vi.mocked(checkLoginDataConflict).mockReturnValue({ action: "use-server" });

    renderHook(() => useGlobalDataInitialization());
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/onboarding/status?userId=u-1"),
      ),
    );
    expect(checkLoginDataConflict).not.toHaveBeenCalled();

    hasAcademy = true;
    vi.mocked(checkLoginDataConflict).mockClear();
    window.dispatchEvent(
      new StorageEvent("storage", { key: "active_academy:u-1", newValue: "a-1" }),
    );

    await waitFor(() => expect(checkLoginDataConflict).toHaveBeenCalled());
  });

  it("관련 없는 storage 이벤트는 mig 재실행을 트리거하지 않는다", async () => {
    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, hasAcademy: true, data: [] }),
      }),
    );
    vi.mocked(checkLoginDataConflict).mockReturnValue({ action: "use-server" });

    renderHook(() => useGlobalDataInitialization());
    await waitFor(() => expect(checkLoginDataConflict).toHaveBeenCalled());
    const initialCalls = vi.mocked(checkLoginDataConflict).mock.calls.length;

    window.dispatchEvent(
      new StorageEvent("storage", { key: "theme", newValue: "dark" }),
    );
    // 짧게 기다려서 listener race 회피
    await new Promise((r) => setTimeout(r, 30));

    expect(vi.mocked(checkLoginDataConflict).mock.calls.length).toBe(initialCalls);
  });
});
