import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// --- Mocks ---------------------------------------------------------------

// vi.mock is hoisted — use vi.hoisted so mockGetSession is available inside the factory
const { mockGetSession } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
}));

vi.mock("@/utils/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
    },
  },
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
  });

  it("세션 없을 때(익명 사용자) role=null, canManage=true를 반환한다 — Anonymous-First", async () => {
    // Anonymous users own their localStorage data and must be able to create/edit
    // sessions, students, and subjects. canManage must be true after load.
    mockGetSession.mockResolvedValue({ data: { session: null } });

    const { result } = renderHook(() => useMyRole());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.role).toBe(null);
    expect(result.current.canManage).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it("owner 역할이면 canManage=true를 반환한다", async () => {
    mockGetSession.mockResolvedValue({ data: { session: SESSION_OWNER } });
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
    mockGetSession.mockResolvedValue({ data: { session: SESSION_ADMIN } });
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
    mockGetSession.mockResolvedValue({ data: { session: SESSION_MEMBER_USER } });
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
    mockGetSession.mockResolvedValue({ data: { session: SESSION_OWNER } });
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
    mockGetSession.mockReturnValue(new Promise(() => {})); // never resolves

    const { result } = renderHook(() => useMyRole());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.canManage).toBe(false);
  });

  it("멤버 목록에 현재 유저가 없으면 canManage=false를 반환한다", async () => {
    mockGetSession.mockResolvedValue({ data: { session: SESSION_MEMBER_USER } });
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
    mockGetSession.mockResolvedValue({ data: { session: SESSION_OWNER } });
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
    mockGetSession.mockResolvedValue({ data: { session: SESSION_OWNER } });
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
      mockGetSession.mockResolvedValue({ data: { session: SESSION_OWNER } });
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
      mockGetSession.mockResolvedValue({ data: { session: SESSION_OWNER } });
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
      mockGetSession.mockResolvedValue({ data: { session: null } });

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
});
