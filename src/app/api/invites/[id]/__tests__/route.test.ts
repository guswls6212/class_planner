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

import { DELETE } from "../route";

describe("DELETE /api/invites/[id]", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("owner가 초대를 취소할 수 있다", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "owner" });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: "tok-1", academy_id: "acad-1", used_by: null },
            error: null,
          }),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });

    const req = new NextRequest("http://localhost/api/invites/tok-1?userId=user-1");
    const res = await DELETE(req, { params: Promise.resolve({ id: "tok-1" }) });
    expect(res.status).toBe(200);
  });

  it("이미 사용된 초대는 410을 반환한다", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "owner" });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: "tok-1", academy_id: "acad-1", used_by: "some-user" },
            error: null,
          }),
        }),
      }),
    });

    const req = new NextRequest("http://localhost/api/invites/tok-1?userId=user-1");
    const res = await DELETE(req, { params: Promise.resolve({ id: "tok-1" }) });
    expect(res.status).toBe(410);
  });

  it("member는 403을 받는다", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "member" });
    const req = new NextRequest("http://localhost/api/invites/tok-1?userId=user-1");
    const res = await DELETE(req, { params: Promise.resolve({ id: "tok-1" }) });
    expect(res.status).toBe(403);
  });
});
