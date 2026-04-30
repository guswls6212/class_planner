import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

const { mockMembership, mockFrom, mockGetUserById } = vi.hoisted(() => ({
  mockMembership: vi.fn(),
  mockFrom: vi.fn(),
  mockGetUserById: vi.fn(),
}));

vi.mock("@/lib/resolveAcademyMembership", () => ({
  resolveAcademyMembership: mockMembership,
}));

vi.mock("@/lib/supabaseServiceRole", () => ({
  getServiceRoleClient: () => ({
    from: mockFrom,
    auth: {
      admin: {
        getUserById: mockGetUserById,
      },
    },
  }),
}));

import { GET } from "../route";
import { DELETE } from "../[userId]/route";

describe("GET /api/members", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("멤버 목록을 반환하고 hasAcademy:true를 포함한다", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "owner" });
    mockFrom.mockImplementation((table: string) => {
      if (table === "academies") {
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { name: "테스트 학원" } }) }) }) };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [
                { user_id: "u1", role: "owner", joined_at: "2026-04-01" },
                { user_id: "u2", role: "admin", joined_at: "2026-04-10" },
              ],
              error: null,
            }),
          }),
        }),
      };
    });
    mockGetUserById
      .mockResolvedValueOnce({ data: { user: { email: "owner@test.com", user_metadata: { full_name: "김원장" } } } })
      .mockResolvedValueOnce({ data: { user: { email: "admin@test.com", user_metadata: { full_name: "박강사" } } } });

    const req = new NextRequest("http://localhost/api/members?userId=u1");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.hasAcademy).toBe(true);
    expect(body.data).toHaveLength(2);
    expect(body.data[0].role).toBe("owner");
    expect(body.data[0].email).toBe("owner@test.com");
    expect(body.data[0].name).toBe("김원장");
  });

  it("academy_members에 row가 없으면 200 + hasAcademy:false + 빈 배열을 반환한다", async () => {
    mockMembership.mockRejectedValue(new Error("온보딩이 완료되지 않은 사용자"));

    const req = new NextRequest("http://localhost/api/members?userId=u-new");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.hasAcademy).toBe(false);
    expect(body.data).toEqual([]);
  });

  it("admin API 실패 시 email/name을 null로 반환한다", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "owner" });
    mockFrom.mockImplementation((table: string) => {
      if (table === "academies") {
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { name: "테스트" } }) }) }) };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [{ user_id: "u1", role: "owner", joined_at: "2026-04-01" }],
              error: null,
            }),
          }),
        }),
      };
    });
    mockGetUserById.mockRejectedValue(new Error("admin API 실패"));

    const req = new NextRequest("http://localhost/api/members?userId=u1");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data[0].email).toBeNull();
    expect(body.data[0].name).toBeNull();
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
