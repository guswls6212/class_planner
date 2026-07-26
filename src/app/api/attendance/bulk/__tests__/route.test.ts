import { AppError } from "@/lib/errors/AppError";
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

const mockRequireRole = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ academyId: "acad-1", role: "owner" })
);

vi.mock("@/lib/auth/permissions", () => ({
  requireRole: mockRequireRole,
  requireOwnTeacher: vi.fn().mockResolvedValue("test-teacher-id"),
  pickAllowedFields: (body: Record<string, unknown>, fields: string[]) =>
    Object.fromEntries(Object.entries(body).filter(([k]) => fields.includes(k))),
}));

vi.mock("@/lib/supabaseServiceRole", () => ({
  getServiceRoleClient: () => ({ from: mockFrom }),
}));

import { POST } from "../route";

describe("POST /api/attendance/bulk", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRole.mockResolvedValue({ academyId: "acad-1", role: "owner" });
  });

  it("여러 출석 기록을 일괄 upsert할 수 있다 (owner)", async () => {
    mockFrom.mockReturnValue({
      upsert: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [
            { id: "att-1", session_id: "sess-1", student_id: "stu-1", date: "2026-04-17", status: "present" },
            { id: "att-2", session_id: "sess-1", student_id: "stu-2", date: "2026-04-17", status: "absent" },
          ],
          error: null,
        }),
      }),
    });

    const req = new NextRequest("http://localhost/api/attendance/bulk?userId=user-1", {
      method: "POST",
      body: JSON.stringify({
        sessionId: "sess-1",
        date: "2026-04-17",
        records: [
          { studentId: "stu-1", status: "present" },
          { studentId: "stu-2", status: "absent" },
        ],
      }),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(2);
  });

  it("member role은 POST에 403을 반환해야 한다", async () => {
    mockRequireRole.mockRejectedValueOnce(
      new AppError("FORBIDDEN", { statusHint: 403 })
    );

    const req = new NextRequest("http://localhost/api/attendance/bulk?userId=member-user", {
      method: "POST",
      body: JSON.stringify({
        sessionId: "sess-1",
        date: "2026-04-17",
        records: [{ studentId: "stu-1", status: "present" }],
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("userId 없으면 401", async () => {
    const req = new NextRequest("http://localhost/api/attendance/bulk", {
      method: "POST",
      body: JSON.stringify({ sessionId: "sess-1", date: "2026-04-17", records: [] }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("sessionId 없으면 400", async () => {
    const req = new NextRequest("http://localhost/api/attendance/bulk?userId=user-1", {
      method: "POST",
      body: JSON.stringify({ date: "2026-04-17", records: [] }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("records 없으면 400", async () => {
    const req = new NextRequest("http://localhost/api/attendance/bulk?userId=user-1", {
      method: "POST",
      body: JSON.stringify({ sessionId: "sess-1", date: "2026-04-17" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
