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

vi.mock("@/lib/resolveAcademyMembership", () => ({
  resolveAcademyMembership: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}));

import { POST } from "../route";

const USER_ID = "user-abc";
const ACADEMY_ID = "acad-new";

/**
 * POST 의 academies INSERT + academy_members INSERT 두 단계 mock.
 * table 이름으로 chain 분기.
 */
function setupMockTables(opts: {
  academyInsertResult: { id: string; name: string } | null;
  memberInsertOk: boolean;
}) {
  const academyChain = {
    insert: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: opts.academyInsertResult,
          error: opts.academyInsertResult ? null : { message: "insert failed" },
        }),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }),
  };
  const memberChain = {
    insert: vi.fn().mockResolvedValue({
      error: opts.memberInsertOk ? null : { message: "member insert failed" },
    }),
  };
  mockFrom.mockImplementation((table: string) => {
    if (table === "academies") return academyChain;
    if (table === "academy_members") return memberChain;
    throw new Error(`unexpected table: ${table}`);
  });
  return { academyChain, memberChain };
}

describe("POST /api/academies — 다중 학원 추가 (ADR-023)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("userId 없으면 401", async () => {
    const req = new NextRequest("http://localhost/api/academies", {
      method: "POST",
      body: JSON.stringify({ name: "분점" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("정상 — academies INSERT + owner role 으로 academy_members INSERT", async () => {
    const { academyChain, memberChain } = setupMockTables({
      academyInsertResult: { id: ACADEMY_ID, name: "분점 영어전문관" },
      memberInsertOk: true,
    });

    const req = new NextRequest(
      `http://localhost/api/academies?userId=${USER_ID}`,
      {
        method: "POST",
        body: JSON.stringify({ name: "분점 영어전문관" }),
      },
    );
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body).toEqual({
      success: true,
      academy: { id: ACADEMY_ID, name: "분점 영어전문관" },
    });
    // owner role 강제 검증 — ADR-019 정책 1 유지
    expect(memberChain.insert).toHaveBeenCalledWith({
      academy_id: ACADEMY_ID,
      user_id: USER_ID,
      role: "owner",
      invited_by: null,
    });
  });

  it("학원명 검증 실패 — 1자 입력 시 400", async () => {
    setupMockTables({
      academyInsertResult: { id: ACADEMY_ID, name: "x" },
      memberInsertOk: true,
    });

    const req = new NextRequest(
      `http://localhost/api/academies?userId=${USER_ID}`,
      {
        method: "POST",
        body: JSON.stringify({ name: "x" }),
      },
    );
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("학원명 빈 값 — 400", async () => {
    const req = new NextRequest(
      `http://localhost/api/academies?userId=${USER_ID}`,
      {
        method: "POST",
        body: JSON.stringify({ name: "" }),
      },
    );
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("academies INSERT 실패 — 500 + cleanup 호출 안 함", async () => {
    setupMockTables({
      academyInsertResult: null,
      memberInsertOk: true,
    });

    const req = new NextRequest(
      `http://localhost/api/academies?userId=${USER_ID}`,
      {
        method: "POST",
        body: JSON.stringify({ name: "분점" }),
      },
    );
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it("academy_members INSERT 실패 — 500 + academies cleanup (유령 학원 회피)", async () => {
    const { academyChain } = setupMockTables({
      academyInsertResult: { id: ACADEMY_ID, name: "분점" },
      memberInsertOk: false,
    });

    const req = new NextRequest(
      `http://localhost/api/academies?userId=${USER_ID}`,
      {
        method: "POST",
        body: JSON.stringify({ name: "분점" }),
      },
    );
    const res = await POST(req);
    expect(res.status).toBe(500);
    // 유령 academy row cleanup 검증
    expect(academyChain.delete).toHaveBeenCalled();
  });
});
