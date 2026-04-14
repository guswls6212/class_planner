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

describe("GET /api/invites", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("owner가 pending 초대 목록을 조회할 수 있다", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "owner" });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            gt: vi.fn().mockResolvedValue({
              data: [
                { id: "tok-1", token: "abc123", role: "admin", expires_at: "2099-01-01", created_at: "2026-04-14" },
              ],
              error: null,
            }),
          }),
        }),
      }),
    });

    const req = new NextRequest("http://localhost/api/invites?userId=user-1");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].role).toBe("admin");
  });

  it("member는 403을 받는다", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "member" });
    const req = new NextRequest("http://localhost/api/invites?userId=user-1");
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it("userId 없으면 400을 반환한다", async () => {
    const req = new NextRequest("http://localhost/api/invites");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });
});

describe("POST /api/invites", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("owner가 admin 역할 초대 토큰을 생성할 수 있다", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "owner" });
    mockFrom.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: "tok-1", token: "abc123", role: "admin", expires_at: "2099-01-01", created_at: "2026-04-14" },
            error: null,
          }),
        }),
      }),
    });

    const req = new NextRequest("http://localhost/api/invites?userId=user-1", {
      method: "POST",
      body: JSON.stringify({ role: "admin" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.token).toBe("abc123");
  });

  it("잘못된 role은 400을 반환한다", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "owner" });
    const req = new NextRequest("http://localhost/api/invites?userId=user-1", {
      method: "POST",
      body: JSON.stringify({ role: "owner" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("member는 403을 받는다", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "member" });
    const req = new NextRequest("http://localhost/api/invites?userId=user-1", {
      method: "POST",
      body: JSON.stringify({ role: "admin" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });
});
