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

import { GET, POST } from "../route";

const SAMPLE_ATTENDANCE = {
  id: "att-1",
  session_id: "sess-1",
  student_id: "stu-1",
  academy_id: "acad-1",
  date: "2026-04-17",
  status: "present",
  notes: null,
  marked_by: "user-1",
  marked_at: "2026-04-17T00:00:00Z",
  created_at: "2026-04-17T00:00:00Z",
};

describe("GET /api/attendance", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("sessionId + date로 출석 목록을 조회할 수 있다", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "member" });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [SAMPLE_ATTENDANCE], error: null }),
          }),
        }),
      }),
    });

    const req = new NextRequest(
      "http://localhost/api/attendance?userId=user-1&sessionId=sess-1&date=2026-04-17"
    );
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
  });

  it("sessionId 없으면 400", async () => {
    const req = new NextRequest(
      "http://localhost/api/attendance?userId=user-1&date=2026-04-17"
    );
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("userId 없으면 400", async () => {
    const req = new NextRequest(
      "http://localhost/api/attendance?sessionId=sess-1&date=2026-04-17"
    );
    const res = await GET(req);
    expect(res.status).toBe(400);
  });
});

describe("POST /api/attendance", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("출석 기록을 upsert할 수 있다", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "member" });
    mockFrom.mockReturnValue({
      upsert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: SAMPLE_ATTENDANCE, error: null }),
        }),
      }),
    });

    const req = new NextRequest("http://localhost/api/attendance?userId=user-1", {
      method: "POST",
      body: JSON.stringify({
        sessionId: "sess-1",
        studentId: "stu-1",
        date: "2026-04-17",
        status: "present",
      }),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.status).toBe("present");
  });

  it("필수 필드 없으면 400", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "member" });
    const req = new NextRequest("http://localhost/api/attendance?userId=user-1", {
      method: "POST",
      body: JSON.stringify({ sessionId: "sess-1" }), // studentId, date 누락
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
