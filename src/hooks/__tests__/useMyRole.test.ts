import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// --- Mocks ---------------------------------------------------------------

// useAuth는 AuthContext에서 session을 단일 source로 제공.
// test에서는 vi.mock으로 바로 갈음 (이전엔 supabase.auth.getSession 직접 mock).
const { mockUseAuth } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: mockUseAuth,
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

// Helper: builds a fetch impl that returns members for /api/members and
// an empty academies list for /api/academies/mine. Tests that need
// non-empty academies override before calling renderHook.
function mockMembersAndEmptyAcademies(members: unknown[]) {
  mockFetch.mockImplementation((url: string) => {
    if (url.startsWith("/api/members")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ data: members }),
      });
    }
    if (url.startsWith("/api/academies/mine")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ academies: [] }),
      });
    }
    if (url.startsWith("/api/auth/set-role-cookie")) {
      return Promise.resolve({ ok: true });
    }
    return Promise.resolve({ ok: false });
  });
}

import { useMyRole } from "../useMyRole";

// -------------------------------------------------------------------------

const MEMBER_OWNER = {
  userId: "user-owner",
  role: "owner" as const,
  linkedTeacherId: null,
  linkedTeacherName: null,
  linkedTeacherColor: null,
};

const MEMBER_ADMIN = {
  userId: "user-admin",
  role: "admin" as const,
  linkedTeacherId: "t-1",
  linkedTeacherName: "김강사",
  linkedTeacherColor: "#6366f1",
};

const MEMBER_MEMBER = {
  userId: "user-member",
  role: "member" as const,
  linkedTeacherId: "t-2",
  linkedTeacherName: "이강사",
  linkedTeacherColor: "#ec4899",
};

const SESSION_OWNER = { user: { id: "user-owner" } };
const SESSION_ADMIN = { user: { id: "user-admin" } };
const SESSION_MEMBER_USER = { user: { id: "user-member" } };

describe("useMyRole", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // sessionStorage cache는 우리 hook이 useMyRole_v1_<userId>로 저장 — test 간
    // leak 시 후속 test가 우연한 cache hit으로 expectation 어긋남(PR #357 회귀).
    // 매 test마다 fresh 보장.
    sessionStorage.clear();
  });

  it("세션 없을 때(익명 사용자) role=null, canManage=true를 반환한다 — Anonymous-First", async () => {
    // Anonymous users own their localStorage data and must be able to create/edit
    // sessions, students, and subjects. canManage must be true after load.
    mockUseAuth.mockReturnValue({ session: null, user: null, loading: false });

    const { result } = renderHook(() => useMyRole());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.role).toBe(null);
    expect(result.current.canManage).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it("owner 역할이면 canManage=true를 반환한다", async () => {
    mockUseAuth.mockReturnValue({ session: SESSION_OWNER, user: SESSION_OWNER.user, loading: false });
    mockMembersAndEmptyAcademies([MEMBER_OWNER]);

    const { result } = renderHook(() => useMyRole());

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.role).toBe("owner");
    expect(result.current.canManage).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it("admin 역할이면 canManage=true를 반환한다", async () => {
    mockUseAuth.mockReturnValue({ session: SESSION_ADMIN, user: SESSION_ADMIN.user, loading: false });
    mockMembersAndEmptyAcademies([MEMBER_OWNER, MEMBER_ADMIN]);

    const { result } = renderHook(() => useMyRole());

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.role).toBe("admin");
    expect(result.current.canManage).toBe(true);
    expect(result.current.linkedTeacherId).toBe("t-1");
    expect(result.current.linkedTeacherName).toBe("김강사");
  });

  it("member 역할이면 canManage=false를 반환한다", async () => {
    mockUseAuth.mockReturnValue({ session: SESSION_MEMBER_USER, user: SESSION_MEMBER_USER.user, loading: false });
    mockMembersAndEmptyAcademies([MEMBER_OWNER, MEMBER_MEMBER]);

    const { result } = renderHook(() => useMyRole());

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.role).toBe("member");
    expect(result.current.canManage).toBe(false);
    expect(result.current.linkedTeacherId).toBe("t-2");
    expect(result.current.linkedTeacherColor).toBe("#ec4899");
    expect(result.current.isLoading).toBe(false);
  });

  it("API 응답이 실패하면 canManage=false(fail-closed)를 반환한다", async () => {
    mockUseAuth.mockReturnValue({ session: SESSION_OWNER, user: SESSION_OWNER.user, loading: false });
    mockFetch.mockResolvedValue({ ok: false });

    const { result } = renderHook(() => useMyRole());

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    // API not-ok keeps the hook in its initial pessimistic state — canManage stays false.
    // No exception is thrown, but no role state is committed either.
    expect(result.current.canManage).toBe(false);
  });

  it("초기 isLoading=true이며 canManage=false(보수적 기본값)이다", () => {
    mockUseAuth.mockReturnValue({ session: null, user: null, loading: true }); // still loading

    const { result } = renderHook(() => useMyRole());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.canManage).toBe(false);
  });

  it("멤버 목록에 현재 유저가 없으면 canManage=false를 반환한다", async () => {
    mockUseAuth.mockReturnValue({ session: SESSION_MEMBER_USER, user: SESSION_MEMBER_USER.user, loading: false });
    mockMembersAndEmptyAcademies([MEMBER_OWNER]); // user-member not in list

    const { result } = renderHook(() => useMyRole());

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.role).toBe(null);
    expect(result.current.canManage).toBe(false);
  });

  it("academies 목록을 fetch해 첫 번째 항목을 active academy로 설정한다", async () => {
    mockUseAuth.mockReturnValue({ session: SESSION_OWNER, user: SESSION_OWNER.user, loading: false });
    const ACADEMY_LIST = [
      { id: "ac-1", name: "유빈학원", slug: "yubin", role: "owner" },
      { id: "ac-2", name: "둘째학원", slug: "second", role: "admin" },
    ];
    mockFetch.mockImplementation((url: string) => {
      if (url.startsWith("/api/members")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: [MEMBER_OWNER] }),
        });
      }
      if (url.startsWith("/api/academies/mine")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ academies: ACADEMY_LIST }),
        });
      }
      return Promise.resolve({ ok: true });
    });

    // localStorage in setupTests.ts is mocked with vi.fn(); getItem returns
    // undefined (effectively "not set") — matches the unset state we want.
    const setItemSpy = vi.mocked(window.localStorage.setItem);
    const getItemMock = vi.mocked(window.localStorage.getItem);
    getItemMock.mockReturnValue(null); // Active academy not yet set
    setItemSpy.mockClear();

    const { result } = renderHook(() => useMyRole());

    // Need a macrotask wait — the hook does a dynamic `await import("@/lib/localStorageCrud")`
    // after the academies fetch resolves; microtask-only flushes (Promise.resolve loops)
    // are not enough for vite's lazy module evaluation.
    await act(async () => {
      await new Promise<void>((resolve) => setTimeout(resolve, 200));
    });

    expect(result.current.role).toBe("owner");
    expect(result.current.academies).toHaveLength(2);
    expect(result.current.academies[0].id).toBe("ac-1");
    // First academy is set as active in localStorage
    expect(setItemSpy).toHaveBeenCalledWith("active_academy:user-owner", "ac-1");
  });

  it("academies fetch가 실패해도 role/canManage 결정에는 영향이 없다", async () => {
    mockUseAuth.mockReturnValue({ session: SESSION_OWNER, user: SESSION_OWNER.user, loading: false });
    mockFetch.mockImplementation((url: string) => {
      if (url.startsWith("/api/members")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: [MEMBER_OWNER] }),
        });
      }
      if (url.startsWith("/api/academies/mine")) {
        return Promise.reject(new Error("network"));
      }
      return Promise.resolve({ ok: true });
    });

    const { result } = renderHook(() => useMyRole());

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.role).toBe("owner");
    expect(result.current.canManage).toBe(true);
    expect(result.current.academies).toEqual([]);
  });

  describe("adminCount — 단일 admin 학원 토스트 suppress용", () => {
    it("owner 1명 + member만 있으면 adminCount=1", async () => {
      mockUseAuth.mockReturnValue({ session: SESSION_OWNER, user: SESSION_OWNER.user, loading: false });
      mockMembersAndEmptyAcademies([MEMBER_OWNER, MEMBER_MEMBER]);

      const { result } = renderHook(() => useMyRole());

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(result.current.adminCount).toBe(1);
    });

    it("owner 1명 + admin 1명 + member 1명이면 adminCount=2", async () => {
      mockUseAuth.mockReturnValue({ session: SESSION_OWNER, user: SESSION_OWNER.user, loading: false });
      mockMembersAndEmptyAcademies([MEMBER_OWNER, MEMBER_ADMIN, MEMBER_MEMBER]);

      const { result } = renderHook(() => useMyRole());

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(result.current.adminCount).toBe(2);
    });

    it("익명 사용자(세션 없음)이면 adminCount=0", async () => {
      mockUseAuth.mockReturnValue({ session: null, user: null, loading: false });

      const { result } = renderHook(() => useMyRole());

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(result.current.adminCount).toBe(0);
    });
  });

  // sessionStorage cache — fetch async race로 first-paint flash 방지.
  // 이 cache는 e2e 환경의 useMyRole timeout flaky도 회복.
  describe("sessionStorage cache — first-paint race 회복", () => {
    beforeEach(() => {
      sessionStorage.clear();
    });

    it("cache hit이면 fetch 응답 전에도 즉시 canManage 반영", async () => {
      mockUseAuth.mockReturnValue({
        session: SESSION_OWNER,
        user: SESSION_OWNER.user,
        loading: false,
      });

      // sessionStorage에 cache 사전 주입 (이전 tab session의 결과 simulating)
      sessionStorage.setItem(
        "useMyRole_v1_user-owner",
        JSON.stringify({
          role: "owner",
          canManage: true,
          academies: [],
          linkedTeacherId: null,
          linkedTeacherName: null,
          linkedTeacherColor: null,
          adminCount: 1,
        }),
      );

      // fetch는 pending — cache hit으로 즉시 hydrate 검증
      mockFetch.mockImplementation(
        () => new Promise(() => {}), // never resolves
      );

      const { result } = renderHook(() => useMyRole());

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(result.current.canManage).toBe(true);
      expect(result.current.role).toBe("owner");
      expect(result.current.isLoading).toBe(false);
    });

    it("fetch 응답 후 sessionStorage cache 업데이트", async () => {
      mockUseAuth.mockReturnValue({
        session: SESSION_OWNER,
        user: SESSION_OWNER.user,
        loading: false,
      });
      mockMembersAndEmptyAcademies([MEMBER_OWNER]);

      renderHook(() => useMyRole());

      await act(async () => {
        await new Promise<void>((resolve) => setTimeout(resolve, 100));
      });

      const cached = sessionStorage.getItem("useMyRole_v1_user-owner");
      expect(cached).not.toBeNull();
      const parsed = JSON.parse(cached!);
      expect(parsed.canManage).toBe(true);
      expect(parsed.role).toBe("owner");
      expect(parsed.adminCount).toBe(1);
    });

    it("다른 userId의 cache는 격리됨 — user-owner는 cache miss", async () => {
      // user-admin cache pre-set
      sessionStorage.setItem(
        "useMyRole_v1_user-admin",
        JSON.stringify({
          role: "admin",
          canManage: true,
          academies: [],
          linkedTeacherId: null,
          linkedTeacherName: null,
          linkedTeacherColor: null,
          adminCount: 1,
        }),
      );

      // user-owner로 로그인 — fetch pending
      mockUseAuth.mockReturnValue({
        session: SESSION_OWNER,
        user: SESSION_OWNER.user,
        loading: false,
      });
      mockFetch.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useMyRole());

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      // user-owner는 cache 없음 → 초기 pessimistic (isLoading=true, canManage=false)
      expect(result.current.isLoading).toBe(true);
      expect(result.current.canManage).toBe(false);
    });

    it("손상된 cache (canManage 필드 누락)는 무시 + pessimistic 시작", async () => {
      sessionStorage.setItem(
        "useMyRole_v1_user-owner",
        JSON.stringify({ role: "owner" }), // canManage 누락
      );

      mockUseAuth.mockReturnValue({
        session: SESSION_OWNER,
        user: SESSION_OWNER.user,
        loading: false,
      });
      mockFetch.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useMyRole());

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      // 손상된 cache 무시 → pessimistic
      expect(result.current.isLoading).toBe(true);
      expect(result.current.canManage).toBe(false);
    });
  });
});
