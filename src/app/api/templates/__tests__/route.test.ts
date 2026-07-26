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

import { GET, POST } from "../route";

import { FIXTURE_TEMPLATE_DATA } from "@/__tests__/fixtures/template.fixture";

const SAMPLE_TEMPLATE = {
  id: "tpl-1",
  academy_id: "acad-1",
  name: "기본 시간표",
  description: "주 5일 기본 커리큘럼",
  template_data: FIXTURE_TEMPLATE_DATA,
  slot_index: 0,
  created_by: "user-1",
  created_at: "2026-04-17T00:00:00Z",
  updated_at: "2026-04-17T00:00:00Z",
};

describe("GET /api/templates", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("owner가 템플릿 목록을 조회할 수 있다", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "owner" });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [SAMPLE_TEMPLATE], error: null }),
        }),
      }),
    });

    const req = new NextRequest("http://localhost/api/templates?userId=user-1");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
  });

  it("member도 목록을 조회할 수 있다", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "member" });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    });

    const req = new NextRequest("http://localhost/api/templates?userId=user-1");
    const res = await GET(req);
    expect(res.status).toBe(200);
  });

  it("userId 없으면 401", async () => {
    const req = new NextRequest("http://localhost/api/templates");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });
});

describe("POST /api/templates", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("owner가 템플릿을 생성할 수 있다 (slot 0 자동 부여)", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "owner" });
    // T2: quota check SELECT (빈 academy) + INSERT 둘 다 mock
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: SAMPLE_TEMPLATE, error: null }),
        }),
      }),
    });

    const req = new NextRequest("http://localhost/api/templates?userId=user-1", {
      method: "POST",
      body: JSON.stringify({
        name: "기본 시간표",
        description: "주 5일 기본 커리큘럼",
        templateData: SAMPLE_TEMPLATE.template_data,
      }),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.name).toBe("기본 시간표");
    expect(body.data.template_data.sessions[0].teacherId).toBe("tc-1");
    expect(body.data.template_data.sessions[0].teacherName).toBe("김선생");
  });

  it("T2: quota 초과 시 403 + TEMPLATES_QUOTA_EXCEEDED 반환", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "owner" });
    // 이미 slot 0, 1 둘 다 차있는 상태
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [{ slot_index: 0 }, { slot_index: 1 }],
          error: null,
        }),
      }),
      insert: vi.fn(), // 호출되지 않음 (quota 에서 reject)
    });

    const req = new NextRequest("http://localhost/api/templates?userId=user-1", {
      method: "POST",
      body: JSON.stringify({
        name: "셋째 슬롯 시도",
        templateData: SAMPLE_TEMPLATE.template_data,
      }),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.success).toBe(false);
    expect(body.error).toBe("TEMPLATES_QUOTA_EXCEEDED");
  });

  it("name 없으면 400", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "owner" });

    const req = new NextRequest("http://localhost/api/templates?userId=user-1", {
      method: "POST",
      body: JSON.stringify({ templateData: SAMPLE_TEMPLATE.template_data }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("member는 403을 받는다", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "member" });
    const req = new NextRequest("http://localhost/api/templates?userId=user-1", {
      method: "POST",
      body: JSON.stringify({ name: "test", templateData: SAMPLE_TEMPLATE.template_data }),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });
});
