import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

  it("userId 없으면 400", async () => {
    const req = new NextRequest("http://localhost/api/academies", {
      method: "POST",
      body: JSON.stringify({ name: "분점" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
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
