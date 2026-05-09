import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// --- Mocks ---------------------------------------------------------------

const { mockUseAuth } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: mockUseAuth,
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

import { useMyTeacher } from "../useMyTeacher";

// -------------------------------------------------------------------------

describe("useMyTeacher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("연결된 강사가 있으면 teacherId/Name/Color를 반환한다", async () => {
    mockUseAuth.mockReturnValue({
      session: { user: { id: "user-member" } },
      user: { id: "user-member" },
      loading: false,
    });
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            userId: "user-member",
            role: "member",
            linkedTeacherId: "t-abc",
            linkedTeacherName: "홍길동",
            linkedTeacherColor: "#f59e0b",
          },
        ],
      }),
    });

    const { result } = renderHook(() => useMyTeacher());

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.teacherId).toBe("t-abc");
    expect(result.current.teacherName).toBe("홍길동");
    expect(result.current.teacherColor).toBe("#f59e0b");
    expect(result.current.isLoading).toBe(false);
  });

  it("연결된 강사가 없으면 null을 반환한다", async () => {
    mockUseAuth.mockReturnValue({
      session: { user: { id: "user-owner" } },
      user: { id: "user-owner" },
      loading: false,
    });
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            userId: "user-owner",
            role: "owner",
            linkedTeacherId: null,
            linkedTeacherName: null,
            linkedTeacherColor: null,
          },
        ],
      }),
    });

    const { result } = renderHook(() => useMyTeacher());

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.teacherId).toBe(null);
    expect(result.current.teacherName).toBe(null);
    expect(result.current.teacherColor).toBe(null);
  });

  it("로딩 중에는 isLoading=true이다", () => {
    mockUseAuth.mockReturnValue({ session: null, user: null, loading: true }); // still loading

    const { result } = renderHook(() => useMyTeacher());

    expect(result.current.isLoading).toBe(true);
  });
});
