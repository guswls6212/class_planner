import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

import { PATCH } from "../route";

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

function buildUpdateChain(error: unknown = null) {
  return {
    eq: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error }),
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

  it("owner가 다른 owner를 강등하려 하면 410을 반환한다", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "owner" });
    configureFrom({ targetRole: "owner" });

    const req = createPatchRequest("u-other-owner", "u-owner", { role: "admin" });
    const res = await PATCH(req, { params: Promise.resolve({ userId: "u-other-owner" }) });
    expect(res.status).toBe(410);
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

  it("쿼리 파라미터 userId가 누락되면 400을 반환한다", async () => {
    const req = new NextRequest("http://localhost/api/members/u-target", {
      method: "PATCH",
      body: JSON.stringify({ role: "admin" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PATCH(req, { params: Promise.resolve({ userId: "u-target" }) });
    expect(res.status).toBe(400);
  });

  it("타겟 멤버가 학원에 존재하지 않으면 404를 반환한다", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "owner" });
    configureFrom({ targetRole: null });

    const req = createPatchRequest("u-missing", "u-owner", { role: "admin" });
    const res = await PATCH(req, { params: Promise.resolve({ userId: "u-missing" }) });
    expect(res.status).toBe(404);
  });
});
