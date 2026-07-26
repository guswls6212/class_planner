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

const { mockFrom, mockGetUserById } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockGetUserById: vi.fn(),
}));

vi.mock("@/lib/supabaseServiceRole", () => ({
  getServiceRoleClient: () => ({
    from: mockFrom,
    auth: { admin: { getUserById: mockGetUserById } },
  }),
}));

import { POST } from "../route";

const VALID_FUTURE = new Date(Date.now() + 86400000).toISOString();

describe("POST /api/invites/accept", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("유효한 토큰으로 멤버 가입 성공", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "invite_tokens") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: "tok-1",
                  academy_id: "acad-1",
                  role: "admin",
                  expires_at: VALID_FUTURE,
                  used_by: null,
                  created_by: "owner-user",
                  teacher_id: null,
                  academies: { name: "수학의 정석" },
                },
                error: null,
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      if (table === "academy_members") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } }),
              }),
            }),
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      return {};
    });

    const req = new NextRequest("http://localhost/api/invites/accept?userId=new-user", {
      method: "POST",
      body: JSON.stringify({ token: "abc123" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.academyId).toBe("acad-1");
  });

  it("teacher_id가 있으면 teachers.user_id를 업데이트한다", async () => {
    const mockTeachersUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        is: vi.fn().mockResolvedValue({ error: null }),
      }),
    });
    const mockInviteTokensUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "invite_tokens") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: "tok-2",
                  academy_id: "acad-1",
                  role: "member",
                  expires_at: VALID_FUTURE,
                  used_by: null,
                  created_by: "owner-user",
                  teacher_id: "teacher-1",
                  academies: { name: "수학의 정석" },
                },
                error: null,
              }),
            }),
          }),
          update: mockInviteTokensUpdate,
        };
      }
      if (table === "academy_members") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } }),
              }),
            }),
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      if (table === "teachers") {
        return { update: mockTeachersUpdate };
      }
      return {};
    });

    const req = new NextRequest("http://localhost/api/invites/accept?userId=new-member", {
      method: "POST",
      body: JSON.stringify({ token: "teacher-invite" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockTeachersUpdate).toHaveBeenCalled();
  });

  it("이미 연동된 강사에 수락하면 409를 반환한다", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "invite_tokens") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: "tok-3",
                  academy_id: "acad-1",
                  role: "member",
                  expires_at: VALID_FUTURE,
                  used_by: null,
                  created_by: "owner-user",
                  teacher_id: "teacher-1",
                  academies: { name: "수학의 정석" },
                },
                error: null,
              }),
            }),
          }),
          // token is consumed even when link fails (Fix 1)
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      if (table === "academy_members") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } }),
              }),
            }),
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      if (table === "teachers") {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockResolvedValue({ error: { code: "23505" } }),
            }),
          }),
        };
      }
      return {};
    });

    const req = new NextRequest("http://localhost/api/invites/accept?userId=another-user", {
      method: "POST",
      body: JSON.stringify({ token: "race-token" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error).toBe("TEACHER_ALREADY_LINKED");
  });

  it("이미 멤버인 경우 멱등 처리", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "invite_tokens") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: "tok-1",
                  academy_id: "acad-1",
                  role: "admin",
                  expires_at: VALID_FUTURE,
                  used_by: null,
                  created_by: "owner-user",
                  teacher_id: null,
                  academies: { name: "수학의 정석" },
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "academy_members") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { academy_id: "acad-1", role: "admin" },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      return {};
    });

    const req = new NextRequest("http://localhost/api/invites/accept?userId=existing-user", {
      method: "POST",
      body: JSON.stringify({ token: "abc123" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.alreadyMember).toBe(true);
  });

  it("만료된 토큰은 410 반환", async () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString();
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: "tok-1",
              academy_id: "acad-1",
              role: "admin",
              expires_at: pastDate,
              used_by: null,
              created_by: "owner-user",
              teacher_id: null,
              academies: { name: "수학의 정석" },
            },
            error: null,
          }),
        }),
      }),
    }));

    const req = new NextRequest("http://localhost/api/invites/accept?userId=new-user", {
      method: "POST",
      body: JSON.stringify({ token: "expired" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(410);
  });

  it("userId 없으면 401 반환", async () => {
    const req = new NextRequest("http://localhost/api/invites/accept", {
      method: "POST",
      body: JSON.stringify({ token: "abc" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  // M4 — email matching validation
  it("초대 이메일과 사용자 이메일이 일치하면 200", async () => {
    mockGetUserById.mockResolvedValue({
      data: { user: { email: "park@example.com" } },
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "invite_tokens") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: "tok-m4-1",
                  academy_id: "acad-1",
                  role: "member",
                  expires_at: VALID_FUTURE,
                  used_by: null,
                  created_by: "owner-user",
                  teacher_id: null,
                  email: "park@example.com",
                  academies: { name: "수학의 정석" },
                },
                error: null,
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      if (table === "academy_members") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } }),
              }),
            }),
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      return {};
    });

    const req = new NextRequest("http://localhost/api/invites/accept?userId=user-park", {
      method: "POST",
      body: JSON.stringify({ token: "m4-token" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockGetUserById).toHaveBeenCalledWith("user-park");
  });

  it("초대 이메일과 사용자 이메일이 불일치하면 403", async () => {
    mockGetUserById.mockResolvedValue({
      data: { user: { email: "other@example.com" } },
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "invite_tokens") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: "tok-m4-2",
                  academy_id: "acad-1",
                  role: "member",
                  expires_at: VALID_FUTURE,
                  used_by: null,
                  created_by: "owner-user",
                  teacher_id: null,
                  email: "park@example.com",
                  academies: { name: "수학의 정석" },
                },
                error: null,
              }),
            }),
          }),
        };
      }
      return {};
    });

    const req = new NextRequest("http://localhost/api/invites/accept?userId=user-other", {
      method: "POST",
      body: JSON.stringify({ token: "m4-wrong-email" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.success).toBe(false);
    expect(body.error_code).toBe("email_mismatch");
  });

  it("초대에 email이 없으면 이메일 검증 없이 수락된다", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "invite_tokens") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: "tok-m4-3",
                  academy_id: "acad-1",
                  role: "admin",
                  expires_at: VALID_FUTURE,
                  used_by: null,
                  created_by: "owner-user",
                  teacher_id: null,
                  email: null,
                  academies: { name: "수학의 정석" },
                },
                error: null,
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      if (table === "academy_members") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } }),
              }),
            }),
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      return {};
    });

    const req = new NextRequest("http://localhost/api/invites/accept?userId=any-user", {
      method: "POST",
      body: JSON.stringify({ token: "no-email-token" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    // auth.admin.getUserById must NOT be called when invite.email is null
    expect(mockGetUserById).not.toHaveBeenCalled();
  });
});
