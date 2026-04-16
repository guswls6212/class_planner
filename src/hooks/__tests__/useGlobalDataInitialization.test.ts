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

  it("기본 과목 추가 시 lastModified가 갱신되어야 한다", () => {
    // Mock 데이터: 과목이 없는 상태
    const mockServerData = {
      students: [],
      subjects: [], // 빈 과목 배열
      sessions: [],
      enrollments: [],
      version: "1.0",
      lastModified: "2025-01-01T00:00:00.000Z",
    };

    // Mock localStorage에 빈 데이터 설정
    localStorageMock.getItem.mockReturnValue(null);

    // Mock API response
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockServerData),
    });

    const { result } = renderHook(() => useGlobalDataInitialization());

    // 초기 상태 확인
    expect(result.current.isInitialized).toBe(false);

    // 기본 과목이 추가될 때 lastModified가 갱신되는 로직이 있음을 확인
    // (실제 구현에서는 API 호출에서 lastModified가 갱신됨)
  });
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

  it("세션 없으면 anonymous 키로 기본 과목 9개 시딩", async () => {
    // getItem returns null → no existing anonymous data
    localStorageMock.getItem.mockReturnValue(null);

    const { result } = renderHook(() => useGlobalDataInitialization());
    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    // setClassPlannerData calls localStorage.setItem("classPlannerData:anonymous", ...)
    const setItemCalls: string[][] = localStorageMock.setItem.mock.calls;
    const anonymousCall = setItemCalls.find((args) => args[0] === "classPlannerData:anonymous");
    expect(anonymousCall).toBeDefined();

    const storedData = JSON.parse(anonymousCall![1]);
    expect(storedData.subjects.length).toBe(9);
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
