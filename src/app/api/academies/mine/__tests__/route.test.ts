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

import { GET } from "../route";

describe("GET /api/academies/mine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("userId가 없으면 401을 반환한다", async () => {
    const req = new NextRequest("http://localhost/api/academies/mine");
    const res = await GET(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("학원 목록을 role 우선순위로 정렬하여 반환한다", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [
            {
              role: "member",
              academies: { id: "acad-3", name: "세 번째 학원", slug: "third" },
            },
            {
              role: "owner",
              academies: { id: "acad-1", name: "첫 번째 학원", slug: "first" },
            },
            {
              role: "admin",
              academies: { id: "acad-2", name: "두 번째 학원", slug: "second" },
            },
          ],
          error: null,
        }),
      }),
    });

    const req = new NextRequest("http://localhost/api/academies/mine?userId=user-1");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.academies).toHaveLength(3);
    expect(body.academies[0].role).toBe("owner");
    expect(body.academies[0].id).toBe("acad-1");
    expect(body.academies[1].role).toBe("admin");
    expect(body.academies[2].role).toBe("member");
  });

  it("학원이 없으면 빈 배열을 반환한다", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }),
    });

    const req = new NextRequest("http://localhost/api/academies/mine?userId=user-no-academy");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.academies).toEqual([]);
  });

  it("DB 에러 시 500을 반환한다", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: new Error("DB error"),
        }),
      }),
    });

    const req = new NextRequest("http://localhost/api/academies/mine?userId=user-1");
    const res = await GET(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("fetch failed");
  });

  it("slug가 null인 학원도 포함하여 반환한다", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [
            {
              role: "owner",
              academies: { id: "acad-1", name: "슬러그 없는 학원", slug: null },
            },
          ],
          error: null,
        }),
      }),
    });

    const req = new NextRequest("http://localhost/api/academies/mine?userId=user-1");
    const res = await GET(req);
    const body = await res.json();
    expect(body.academies[0].slug).toBeNull();
  });
});
