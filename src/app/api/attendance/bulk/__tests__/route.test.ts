import { AppError } from "@/lib/errors/AppError";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

  it("userId 없으면 400", async () => {
    const req = new NextRequest("http://localhost/api/attendance/bulk", {
      method: "POST",
      body: JSON.stringify({ sessionId: "sess-1", date: "2026-04-17", records: [] }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
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
