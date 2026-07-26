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

import { POST } from "../route";

function configureFrom({
  existingRow,
  updateError = null,
}: {
  existingRow: { id: string; name: string; academy_id: string; archived_at: string | null } | null;
  updateError?: unknown;
}) {
  const updateMock = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: existingRow && !updateError ? { id: existingRow.id, name: existingRow.name, archived_at: existingRow.archived_at } : null,
            error: updateError,
          }),
        }),
      }),
    }),
  });
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: existingRow,
            error: existingRow ? null : { code: "PGRST116" },
          }),
        }),
      }),
    }),
    update: updateMock,
  });
  return { updateMock };
}

function makeRequest(id: string, userId: string | null, body: unknown): NextRequest {
  const url = userId
    ? `http://localhost/api/teachers/${id}/archive?userId=${userId}`
    : `http://localhost/api/teachers/${id}/archive`;
  return new NextRequest(url, {
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/teachers/[id]/archive — 보관/복구 토글", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("userId 누락 시 401", async () => {
    const req = makeRequest("t1", null, { archived: true });
    const res = await POST(req, { params: Promise.resolve({ id: "t1" }) });
    expect(res.status).toBe(401);
  });

  it("member 권한 시 403", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "member" });
    const req = makeRequest("t1", "u-1", { archived: true });
    const res = await POST(req, { params: Promise.resolve({ id: "t1" }) });
    expect(res.status).toBe(403);
  });

  it("body.archived 가 boolean 이 아니면 400", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "owner" });
    const req = makeRequest("t1", "u-1", { archived: "yes" });
    const res = await POST(req, { params: Promise.resolve({ id: "t1" }) });
    expect(res.status).toBe(400);
  });

  it("강사 부재 시 404", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "owner" });
    configureFrom({ existingRow: null });
    const req = makeRequest("t-missing", "u-1", { archived: true });
    const res = await POST(req, { params: Promise.resolve({ id: "t-missing" }) });
    expect(res.status).toBe(404);
  });

  it("owner 가 archived: true 로 보관하면 archived_at = NOW() 로 UPDATE", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "owner" });
    const { updateMock } = configureFrom({
      existingRow: { id: "t1", name: "강사_uat", academy_id: "acad-1", archived_at: null },
    });

    const req = makeRequest("t1", "u-1", { archived: true });
    const res = await POST(req, { params: Promise.resolve({ id: "t1" }) });
    expect(res.status).toBe(200);

    expect(updateMock).toHaveBeenCalledTimes(1);
    const payload = updateMock.mock.calls[0][0];
    expect(typeof payload.archived_at).toBe("string");
    expect(new Date(payload.archived_at).getTime()).not.toBeNaN();
  });

  it("admin 이 archived: false 로 복구하면 archived_at = NULL", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "admin" });
    const { updateMock } = configureFrom({
      existingRow: { id: "t2", name: "박코치", academy_id: "acad-1", archived_at: "2026-04-01T00:00:00Z" },
    });

    const req = makeRequest("t2", "u-1", { archived: false });
    const res = await POST(req, { params: Promise.resolve({ id: "t2" }) });
    expect(res.status).toBe(200);

    const payload = updateMock.mock.calls[0][0];
    expect(payload.archived_at).toBeNull();
  });

  it("update 실패 시 500", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "owner" });
    configureFrom({
      existingRow: { id: "t3", name: "이선생", academy_id: "acad-1", archived_at: null },
      updateError: { message: "db error" },
    });
    const req = makeRequest("t3", "u-1", { archived: true });
    const res = await POST(req, { params: Promise.resolve({ id: "t3" }) });
    expect(res.status).toBe(500);
  });
});
