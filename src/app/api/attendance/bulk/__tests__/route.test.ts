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
  getServiceRoleClient: () => ({ from: mockFrom }),
}));

import { POST } from "../route";

describe("POST /api/attendance/bulk", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("여러 출석 기록을 일괄 upsert할 수 있다", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "member" });
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

  it("userId 없으면 400", async () => {
    const req = new NextRequest("http://localhost/api/attendance/bulk", {
      method: "POST",
      body: JSON.stringify({ sessionId: "sess-1", date: "2026-04-17", records: [] }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("sessionId 없으면 400", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "member" });
    const req = new NextRequest("http://localhost/api/attendance/bulk?userId=user-1", {
      method: "POST",
      body: JSON.stringify({ date: "2026-04-17", records: [] }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("records 없으면 400", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "member" });
    const req = new NextRequest("http://localhost/api/attendance/bulk?userId=user-1", {
      method: "POST",
      body: JSON.stringify({ sessionId: "sess-1", date: "2026-04-17" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
