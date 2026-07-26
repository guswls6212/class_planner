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

const { mockFrom, mockResolveAcademyId } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockResolveAcademyId: vi.fn(),
}));

vi.mock("@/lib/supabaseServiceRole", () => ({
  getServiceRoleClient: () => ({ from: mockFrom }),
}));

vi.mock("@/lib/resolveAcademyId", () => ({
  resolveAcademyId: mockResolveAcademyId,
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}));

import { GET } from "../route";

const ACADEMY_ID = "acad-1";
const USER_ID = "user-1";

/**
 * route.ts 가 academies + academy_members 두 테이블을 Promise.all 로 조회.
 * mockFrom 은 table name 으로 분기해서 각 chain (single / maybeSingle) 반환.
 */
function setupMockTables(opts: {
  academyRow: Record<string, unknown> | null;
  memberRow: { joined_at: string } | null;
}) {
  const academyChain = {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: opts.academyRow,
          error: opts.academyRow ? null : { message: "not found" },
        }),
      }),
    }),
  };
  const memberChain = {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: opts.memberRow,
            error: null,
          }),
        }),
      }),
    }),
  };
  mockFrom.mockImplementation((table: string) => {
    if (table === "academies") return academyChain;
    if (table === "academy_members") return memberChain;
    throw new Error(`unexpected table: ${table}`);
  });
}

describe("GET /api/academies/active/schedule-meta", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("userId 없으면 401", async () => {
    const req = new NextRequest("http://localhost/api/academies/active/schedule-meta");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("정상 (legacy, academyId 미명시) — resolveAcademyId 호출 + academy 정보 + memberJoinedAt 반환", async () => {
    mockResolveAcademyId.mockResolvedValueOnce(ACADEMY_ID);
    setupMockTables({
      academyRow: {
        id: ACADEMY_ID,
        name: "현진학원",
        schedule_updated_at: "2026-05-04T10:00:00.000Z",
      },
      memberRow: { joined_at: "2026-05-01T00:00:00.000Z" },
    });

    const req = new NextRequest(
      `http://localhost/api/academies/active/schedule-meta?userId=${USER_ID}`,
    );
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({
      academyId: ACADEMY_ID,
      academyName: "현진학원",
      scheduleUpdatedAt: "2026-05-04T10:00:00.000Z",
      memberJoinedAt: "2026-05-01T00:00:00.000Z",
    });
    expect(mockResolveAcademyId).toHaveBeenCalledWith(USER_ID);
  });

  it("academyId 명시 시 resolveAcademyId 우회 + 그 academy 의 schedule_updated_at + joined_at 반환", async () => {
    setupMockTables({
      academyRow: {
        id: ACADEMY_ID,
        name: "UAT Test Academy",
        schedule_updated_at: "2026-05-23T13:57:49.709Z",
      },
      memberRow: { joined_at: "2026-05-23T13:58:44.719Z" },
    });

    const req = new NextRequest(
      `http://localhost/api/academies/active/schedule-meta?userId=${USER_ID}&academyId=${ACADEMY_ID}`,
    );
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.memberJoinedAt).toBe("2026-05-23T13:58:44.719Z");
    expect(body.scheduleUpdatedAt).toBe("2026-05-23T13:57:49.709Z");
    // resolveAcademyId 안 부름 — 클라이언트가 명시한 academyId 그대로 사용
    expect(mockResolveAcademyId).not.toHaveBeenCalled();
  });

  it("멤버 행 없음 → memberJoinedAt: null (비멤버 academy 조회 보호)", async () => {
    mockResolveAcademyId.mockResolvedValueOnce(ACADEMY_ID);
    setupMockTables({
      academyRow: {
        id: ACADEMY_ID,
        name: "현진학원",
        schedule_updated_at: "2026-05-04T10:00:00.000Z",
      },
      memberRow: null,
    });

    const req = new NextRequest(
      `http://localhost/api/academies/active/schedule-meta?userId=${USER_ID}`,
    );
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.memberJoinedAt).toBeNull();
  });

  it("user에 매핑된 academy 없음 → 404", async () => {
    mockResolveAcademyId.mockRejectedValueOnce(new Error("no mapping"));

    const req = new NextRequest(
      `http://localhost/api/academies/active/schedule-meta?userId=${USER_ID}`,
    );
    const res = await GET(req);
    expect(res.status).toBe(404);
  });

  it("academy row 못 찾음 → 404", async () => {
    mockResolveAcademyId.mockResolvedValueOnce(ACADEMY_ID);
    setupMockTables({
      academyRow: null,
      memberRow: null,
    });

    const req = new NextRequest(
      `http://localhost/api/academies/active/schedule-meta?userId=${USER_ID}`,
    );
    const res = await GET(req);
    expect(res.status).toBe(404);
  });
});
