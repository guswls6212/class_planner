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

import { GET } from "../route";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

const mockMemberSelect = vi.fn();

vi.mock("@/lib/supabaseServiceRole", () => ({
  getServiceRoleClient: () => ({
    from: () => ({
      select: () => ({
        eq: mockMemberSelect,
      }),
    }),
  }),
}));

vi.mock("@/lib/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe("GET /api/onboarding/status", () => {
  beforeEach(() => vi.clearAllMocks());

  it("userId가 없으면 401을 반환한다", async () => {
    const req = new NextRequest("http://localhost:3000/api/onboarding/status");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("academy가 있는 사용자는 hasAcademy: true + Set-Cookie를 반환한다", async () => {
    mockMemberSelect.mockResolvedValue({
      data: [{ academy_id: "academy-123" }, { academy_id: "academy-456" }],
      error: null,
    });

    const req = new NextRequest(
      "http://localhost:3000/api/onboarding/status?userId=user-123"
    );
    const res = await GET(req);
    const data = await res.json();

    expect(data.hasAcademy).toBe(true);
    expect(data.academyId).toBe("academy-123"); // backward compat (첫 학원)
    expect(data.academyIds).toEqual(["academy-123", "academy-456"]); // 전체 멤버십
    expect(res.headers.get("set-cookie")).toContain("onboarded=1");
  });

  it("academy가 없는 사용자는 hasAcademy: false를 반환한다", async () => {
    mockMemberSelect.mockResolvedValue({ data: [], error: null });

    const req = new NextRequest(
      "http://localhost:3000/api/onboarding/status?userId=new-user"
    );
    const res = await GET(req);
    const data = await res.json();

    expect(data.hasAcademy).toBe(false);
    expect(res.headers.get("set-cookie")).toBeNull();
  });
});
