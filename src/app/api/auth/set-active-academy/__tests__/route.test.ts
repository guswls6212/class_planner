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

const { mockFrom } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
}));

vi.mock("@/lib/supabaseServiceRole", () => ({
  getServiceRoleClient: () => ({ from: mockFrom }),
}));

import { POST } from "../route";

describe("POST /api/auth/set-active-academy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("userId가 없으면 401을 반환한다", async () => {
    const req = new NextRequest("http://localhost/api/auth/set-active-academy", {
      method: "POST",
      body: JSON.stringify({ academyId: "acad-1" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  // academyId 검증은 인증 통과 후에만 도달하므로 400 그대로다.
  it("academyId가 없으면 400을 반환한다", async () => {
    const req = new NextRequest("http://localhost/api/auth/set-active-academy", {
      method: "POST",
      body: JSON.stringify({ userId: "user-1" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("academyId required");
  });

  it("body가 비어있으면 401을 반환한다", async () => {
    const req = new NextRequest("http://localhost/api/auth/set-active-academy", {
      method: "POST",
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("해당 학원의 멤버가 아니면 403을 반환한다", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null }),
          }),
        }),
      }),
    });

    const req = new NextRequest("http://localhost/api/auth/set-active-academy", {
      method: "POST",
      body: JSON.stringify({ userId: "user-1", academyId: "not-member-acad" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("해당 학원의 멤버가 아닙니다.");
  });

  it("멤버이면 200과 함께 active_academy_id 쿠키를 설정한다", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { role: "owner" } }),
          }),
        }),
      }),
    });

    const req = new NextRequest("http://localhost/api/auth/set-active-academy", {
      method: "POST",
      body: JSON.stringify({ userId: "user-1", academyId: "acad-1" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);

    const cookie = res.cookies.get("active_academy_id");
    expect(cookie?.value).toBe("acad-1");
  });
});
