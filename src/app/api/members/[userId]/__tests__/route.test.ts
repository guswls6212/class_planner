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
  getServiceRoleClient: () => ({
    from: mockFrom,
  }),
}));

import { DELETE, PATCH } from "../route";

// PATCH는 actor의 academy_members 행 조회(target 검증) → academy_members.update 두 단계.
// mockFrom은 .select / .update 호출에 따라 다른 빌더를 반환하도록 구성한다.
function buildSelectChain(role: string | null) {
  if (role === null) {
    return {
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: { message: "not found" } }),
        }),
      }),
    };
  }
  return {
    eq: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { role }, error: null }),
      }),
    }),
  };
}

function buildUpdateChain(error: unknown = null, rows: unknown[] = [{ user_id: "u-target", role: "member" }]) {
  return {
    eq: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: error ? null : rows, error }),
      }),
    }),
  };
}

function configureFrom({
  targetRole,
  updateError = null,
}: {
  targetRole: string | null;
  updateError?: unknown;
}) {
  mockFrom.mockImplementation(() => ({
    select: vi.fn().mockReturnValue(buildSelectChain(targetRole)),
    update: vi.fn().mockReturnValue(buildUpdateChain(updateError)),
  }));
}

function createPatchRequest(targetUserId: string, actorUserId: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost/api/members/${targetUserId}?userId=${actorUserId}`, {
    method: "PATCH",
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
  });
}

describe("PATCH /api/members/[userId] — role change", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("owner가 member를 admin으로 승격하면 200을 반환한다", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "owner" });
    configureFrom({ targetRole: "member" });

    const req = createPatchRequest("u-target", "u-owner", { role: "admin" });
    const res = await PATCH(req, { params: Promise.resolve({ userId: "u-target" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("owner가 admin을 member로 강등하면 200을 반환한다", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "owner" });
    configureFrom({ targetRole: "admin" });

    const req = createPatchRequest("u-target", "u-owner", { role: "member" });
    const res = await PATCH(req, { params: Promise.resolve({ userId: "u-target" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data?.role).toBe("member");
  });

  it("admin이 역할 변경을 시도하면 403을 반환한다", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "admin" });
    configureFrom({ targetRole: "member" });

    const req = createPatchRequest("u-target", "u-admin", { role: "admin" });
    const res = await PATCH(req, { params: Promise.resolve({ userId: "u-target" }) });
    expect(res.status).toBe(403);
  });

  it("member가 역할 변경을 시도하면 403을 반환한다", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "member" });
    configureFrom({ targetRole: "member" });

    const req = createPatchRequest("u-target", "u-member", { role: "admin" });
    const res = await PATCH(req, { params: Promise.resolve({ userId: "u-target" }) });
    expect(res.status).toBe(403);
  });

  it("owner가 본인 역할 변경을 시도하면 400을 반환한다", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "owner" });
    configureFrom({ targetRole: "owner" });

    const req = createPatchRequest("u-owner", "u-owner", { role: "admin" });
    const res = await PATCH(req, { params: Promise.resolve({ userId: "u-owner" }) });
    expect(res.status).toBe(400);
  });

  it("owner가 다른 owner를 강등하려 하면 403을 반환한다", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "owner" });
    configureFrom({ targetRole: "owner" });

    const req = createPatchRequest("u-other-owner", "u-owner", { role: "admin" });
    const res = await PATCH(req, { params: Promise.resolve({ userId: "u-other-owner" }) });
    expect(res.status).toBe(403);
  });

  it("body의 role이 'admin' 또는 'member'가 아니면 400을 반환한다", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "owner" });
    configureFrom({ targetRole: "member" });

    const req = createPatchRequest("u-target", "u-owner", { role: "owner" });
    const res = await PATCH(req, { params: Promise.resolve({ userId: "u-target" }) });
    expect(res.status).toBe(400);
  });

  it("body의 role이 누락되면 400을 반환한다", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "owner" });
    configureFrom({ targetRole: "member" });

    const req = createPatchRequest("u-target", "u-owner", {});
    const res = await PATCH(req, { params: Promise.resolve({ userId: "u-target" }) });
    expect(res.status).toBe(400);
  });

  it("쿼리 파라미터 userId가 누락되면 401을 반환한다", async () => {
    const req = new NextRequest("http://localhost/api/members/u-target", {
      method: "PATCH",
      body: JSON.stringify({ role: "admin" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PATCH(req, { params: Promise.resolve({ userId: "u-target" }) });
    expect(res.status).toBe(401);
  });

  it("타겟 멤버가 학원에 존재하지 않으면 404를 반환한다", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "owner" });
    configureFrom({ targetRole: null });

    const req = createPatchRequest("u-missing", "u-owner", { role: "admin" });
    const res = await PATCH(req, { params: Promise.resolve({ userId: "u-missing" }) });
    expect(res.status).toBe(404);
  });
});

// ────────────────────────────────────────────────────────────
// DELETE — Variant B 멤버 제거. owner 모두 / admin 은 member 만 / 자기 자신 차단 +
// owner target 차단(last_owner_check 동시 충족) + teachers.user_id NULL 복원.
// ────────────────────────────────────────────────────────────

function configureDeleteFrom({
  targetRole,
  deleteError = null,
  teacherUpdateError = null,
}: {
  targetRole: string | null;
  deleteError?: unknown;
  teacherUpdateError?: unknown;
}) {
  const teachersUpdateMock = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: teacherUpdateError }),
    }),
  });
  const membersDeleteMock = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: deleteError }),
    }),
  });

  mockFrom.mockImplementation((table: string) => {
    if (table === "academy_members") {
      return {
        select: vi.fn().mockReturnValue(buildSelectChain(targetRole)),
        delete: membersDeleteMock,
      };
    }
    if (table === "teachers") {
      return { update: teachersUpdateMock };
    }
    return {};
  });

  return { teachersUpdateMock, membersDeleteMock };
}

function createDeleteRequest(targetUserId: string, actorUserId: string | null): NextRequest {
  const url = actorUserId
    ? `http://localhost/api/members/${targetUserId}?userId=${actorUserId}`
    : `http://localhost/api/members/${targetUserId}`;
  return new NextRequest(url, { method: "DELETE" });
}

describe("DELETE /api/members/[userId] — kick", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requesterId 누락 시 401", async () => {
    const req = createDeleteRequest("u-target", null);
    const res = await DELETE(req, { params: Promise.resolve({ userId: "u-target" }) });
    expect(res.status).toBe(401);
  });

  it("자기 자신 제거 시도 시 400", async () => {
    const req = createDeleteRequest("u-self", "u-self");
    const res = await DELETE(req, { params: Promise.resolve({ userId: "u-self" }) });
    expect(res.status).toBe(400);
  });

  it("member 권한은 403", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "member" });
    const req = createDeleteRequest("u-target", "u-actor");
    const res = await DELETE(req, { params: Promise.resolve({ userId: "u-target" }) });
    expect(res.status).toBe(403);
  });

  it("target 멤버 부재 시 404", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "owner" });
    configureDeleteFrom({ targetRole: null });
    const req = createDeleteRequest("u-missing", "u-owner");
    const res = await DELETE(req, { params: Promise.resolve({ userId: "u-missing" }) });
    expect(res.status).toBe(404);
  });

  it("owner target 은 제거 불가 (last_owner_check 동시 충족) → 403", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "owner" });
    configureDeleteFrom({ targetRole: "owner" });
    const req = createDeleteRequest("u-target-owner", "u-actor-owner");
    const res = await DELETE(req, { params: Promise.resolve({ userId: "u-target-owner" }) });
    expect(res.status).toBe(403);
  });

  it("admin 은 다른 admin 제거 불가 → 403", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "admin" });
    configureDeleteFrom({ targetRole: "admin" });
    const req = createDeleteRequest("u-admin", "u-actor-admin");
    const res = await DELETE(req, { params: Promise.resolve({ userId: "u-admin" }) });
    expect(res.status).toBe(403);
  });

  it("owner 가 admin 제거 → 200 + teachers.user_id NULL 복원 호출", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "owner" });
    const { membersDeleteMock, teachersUpdateMock } = configureDeleteFrom({ targetRole: "admin" });

    const req = createDeleteRequest("u-target", "u-owner");
    const res = await DELETE(req, { params: Promise.resolve({ userId: "u-target" }) });
    expect(res.status).toBe(200);

    expect(membersDeleteMock).toHaveBeenCalledTimes(1);
    expect(teachersUpdateMock).toHaveBeenCalledTimes(1);
    expect(teachersUpdateMock.mock.calls[0][0]).toEqual({ user_id: null });
  });

  it("admin 이 member 제거 → 200", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "admin" });
    configureDeleteFrom({ targetRole: "member" });
    const req = createDeleteRequest("u-target", "u-actor-admin");
    const res = await DELETE(req, { params: Promise.resolve({ userId: "u-target" }) });
    expect(res.status).toBe(200);
  });

  it("teachers update 실패해도 200 (graceful — academy_members DELETE 는 이미 commit)", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "owner" });
    configureDeleteFrom({
      targetRole: "admin",
      teacherUpdateError: { message: "teachers update failed" },
    });
    const req = createDeleteRequest("u-target", "u-owner");
    const res = await DELETE(req, { params: Promise.resolve({ userId: "u-target" }) });
    expect(res.status).toBe(200);
  });
});
