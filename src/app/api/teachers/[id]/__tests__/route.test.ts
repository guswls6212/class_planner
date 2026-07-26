import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// 세션 가드 스텁 — 라우트 로직 검증용. 실제 토큰 검증만 우회한다.
//   - 호출부가 userId 를 넘기면 그 값을 세션 사용자로 취급 (기존 단정 유지)
//   - 넘기지 않으면 "신원 없음" → 401. 라우트의 옛 계약은 "?userId= 없으면 400"
//     이었는데, 이제 신원 부재는 인증 실패이므로 401 이 맞다.
// 가드의 실제 정책은 아래 두 곳이 검증한다:
//   - src/lib/auth/__tests__/apiAuth.test.ts (가드 단위 — 401/403)
//   - src/app/api/__tests__/session-authz.integration.test.ts (라우트가 가드를 진짜 호출하는지)
vi.mock("@/lib/auth/apiAuth", () => {
  const unauthorized = () =>
    new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });

  return {
    requireSessionUser: vi.fn(
      async (_request: unknown, claimedUserId?: string | null) =>
        claimedUserId
          ? { ok: true as const, userId: claimedUserId }
          : { ok: false as const, response: unauthorized() }
    ),
    verifyBearerUser: vi.fn(async () => ({
      id: "test-user-id",
      email: "test@example.com",
    })),
    getAuthenticatedUserId: vi.fn(async () => "test-user-id"),
  };
});


process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

const { mockMembership, mockFrom } = vi.hoisted(() => ({
  mockMembership: vi.fn(),
  mockFrom: vi.fn(),
}));

vi.mock("@/lib/resolveAcademyMembership", () => ({
  resolveAcademyMembership: mockMembership,
}));

vi.mock("@/lib/supabaseServiceRole", () => ({
  getServiceRoleClient: () => ({ from: mockFrom }),
}));

import { PATCH } from "../route";

describe("PATCH /api/teachers/[id]", () => {
  const baseTeacher = {
    id: "teacher-1",
    name: "김강사",
    color: "#ff0000",
    email: "kim@example.com",
    phone: "010-1234-5678",
    notes: null,
    user_id: "user-1",
    academy_id: "acad-1",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("owner가 name 변경하면 200 반환", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "owner" });

    const updatedTeacher = { ...baseTeacher, name: "이강사" };

    mockFrom.mockImplementation((table: string) => {
      if (table === "teachers") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: baseTeacher,
                  error: null,
                }),
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: updatedTeacher,
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === "audit_log") {
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      return {};
    });

    const req = new NextRequest("http://localhost/api/teachers/teacher-1?userId=user-1", {
      method: "PATCH",
      body: JSON.stringify({ name: "이강사" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "teacher-1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.teacher.name).toBe("이강사");
  });

  it("admin이 name 변경하면 200 반환", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "admin" });

    const updatedTeacher = { ...baseTeacher, name: "새이름" };

    mockFrom.mockImplementation((table: string) => {
      if (table === "teachers") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: baseTeacher,
                  error: null,
                }),
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: updatedTeacher,
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === "audit_log") {
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      return {};
    });

    const req = new NextRequest("http://localhost/api/teachers/teacher-1?userId=user-1", {
      method: "PATCH",
      body: JSON.stringify({ name: "새이름" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "teacher-1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.teacher.name).toBe("새이름");
  });

  it("member가 name 변경 시도하면 403", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "member" });

    mockFrom.mockImplementation((table: string) => {
      if (table === "teachers") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: baseTeacher,
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      return {};
    });

    const req = new NextRequest("http://localhost/api/teachers/teacher-1?userId=user-2", {
      method: "PATCH",
      body: JSON.stringify({ name: "이강사" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "teacher-1" }) });
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toMatch(/orbidden/i);
  });

  it("member가 본인 email 변경하면 200", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "member" });

    const updatedTeacher = { ...baseTeacher, email: "new@example.com", user_id: "user-1" };

    mockFrom.mockImplementation((table: string) => {
      if (table === "teachers") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  // teacher.user_id === userId
                  data: { ...baseTeacher, user_id: "user-1" },
                  error: null,
                }),
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: updatedTeacher,
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === "audit_log") {
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      return {};
    });

    const req = new NextRequest("http://localhost/api/teachers/teacher-1?userId=user-1", {
      method: "PATCH",
      body: JSON.stringify({ email: "new@example.com" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "teacher-1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.teacher.email).toBe("new@example.com");
  });

  it("member가 다른 teacher 수정 시도하면 403", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "member" });

    mockFrom.mockImplementation((table: string) => {
      if (table === "teachers") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  // teacher.user_id !== userId
                  data: { ...baseTeacher, user_id: "another-user" },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      return {};
    });

    const req = new NextRequest("http://localhost/api/teachers/teacher-1?userId=user-1", {
      method: "PATCH",
      body: JSON.stringify({ email: "hack@example.com" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "teacher-1" }) });
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toMatch(/orbidden/i);
  });

  it("존재하지 않는 teacher_id는 404", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "owner" });

    mockFrom.mockImplementation((table: string) => {
      if (table === "teachers") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { code: "PGRST116", message: "Row not found" },
                }),
              }),
            }),
          }),
        };
      }
      return {};
    });

    const req = new NextRequest("http://localhost/api/teachers/nonexistent?userId=user-1", {
      method: "PATCH",
      body: JSON.stringify({ name: "이강사" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "nonexistent" }) });

    expect(res.status).toBe(404);
  });
});
