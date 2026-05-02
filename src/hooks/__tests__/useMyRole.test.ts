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

  it("세션 없을 때 role=null, canManage=false를 반환한다", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    const { result } = renderHook(() => useMyRole());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.role).toBe(null);
    expect(result.current.canManage).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it("owner 역할이면 canManage=true를 반환한다", async () => {
    mockGetSession.mockResolvedValue({ data: { session: SESSION_OWNER } });
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [MEMBER_OWNER] }),
    });

    const { result } = renderHook(() => useMyRole());

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.role).toBe("owner");
    expect(result.current.canManage).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it("admin 역할이면 canManage=true를 반환한다", async () => {
    mockGetSession.mockResolvedValue({ data: { session: SESSION_ADMIN } });
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [MEMBER_OWNER, MEMBER_ADMIN] }),
    });

    const { result } = renderHook(() => useMyRole());

    await act(async () => {
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
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [MEMBER_OWNER, MEMBER_MEMBER] }),
    });

    const { result } = renderHook(() => useMyRole());

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.role).toBe("member");
    expect(result.current.canManage).toBe(false);
    expect(result.current.linkedTeacherId).toBe("t-2");
    expect(result.current.linkedTeacherColor).toBe("#ec4899");
    expect(result.current.isLoading).toBe(false);
  });

  it("API 응답이 실패하면 canManage=true(fail-open)를 반환한다", async () => {
    mockGetSession.mockResolvedValue({ data: { session: SESSION_OWNER } });
    mockFetch.mockResolvedValue({ ok: false });

    const { result } = renderHook(() => useMyRole());

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    // On API error we remain in loading state (fetch returned not-ok but no exception)
    // canManage stays true initially and stays true since we didn't throw
    expect(result.current.canManage).toBe(true);
  });

  it("초기 isLoading=true이며 canManage=true(낙관적 기본값)이다", () => {
    mockGetSession.mockReturnValue(new Promise(() => {})); // never resolves

    const { result } = renderHook(() => useMyRole());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.canManage).toBe(true);
  });

  it("멤버 목록에 현재 유저가 없으면 canManage=false를 반환한다", async () => {
    mockGetSession.mockResolvedValue({ data: { session: SESSION_MEMBER_USER } });
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [MEMBER_OWNER] }), // user-member not in list
    });

    const { result } = renderHook(() => useMyRole());

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.role).toBe(null);
    expect(result.current.canManage).toBe(false);
  });
});
