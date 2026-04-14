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

import { GET } from "../route";
import { DELETE } from "../[userId]/route";

describe("GET /api/members", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("멤버 목록을 반환한다", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "owner" });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [
              { user_id: "u1", role: "owner", joined_at: "2026-04-01", users: { email: "owner@test.com", raw_user_meta_data: { full_name: "김원장" } } },
              { user_id: "u2", role: "admin", joined_at: "2026-04-10", users: { email: "admin@test.com", raw_user_meta_data: { full_name: "박강사" } } },
            ],
            error: null,
          }),
        }),
      }),
    });

    const req = new NextRequest("http://localhost/api/members?userId=u1");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(2);
    expect(body.data[0].role).toBe("owner");
  });
});

describe("DELETE /api/members/[userId]", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("owner가 다른 멤버를 제거할 수 있다", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "owner" });
    mockFrom.mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    });

    const req = new NextRequest("http://localhost/api/members/u2?userId=u1");
    const res = await DELETE(req, { params: Promise.resolve({ userId: "u2" }) });
    expect(res.status).toBe(200);
  });

  it("owner가 본인을 제거하려 하면 400을 반환한다", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "owner" });

    const req = new NextRequest("http://localhost/api/members/u1?userId=u1");
    const res = await DELETE(req, { params: Promise.resolve({ userId: "u1" }) });
    expect(res.status).toBe(400);
  });

  it("owner가 아니면 403을 반환한다", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "admin" });

    const req = new NextRequest("http://localhost/api/members/u2?userId=u1");
    const res = await DELETE(req, { params: Promise.resolve({ userId: "u2" }) });
    expect(res.status).toBe(403);
  });
});
