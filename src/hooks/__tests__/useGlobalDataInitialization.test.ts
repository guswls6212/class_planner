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
