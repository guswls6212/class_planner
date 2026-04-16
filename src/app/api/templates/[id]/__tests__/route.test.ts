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

describe("DELETE /api/templates/[id]", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("owner가 템플릿을 삭제할 수 있다", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "owner" });
    mockFrom.mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    });

    const req = new NextRequest("http://localhost/api/templates/tpl-1?userId=user-1", {
      method: "DELETE",
    });
    const res = await DELETE(req, { params: Promise.resolve({ id: "tpl-1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("member는 403을 받는다", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "member" });
    const req = new NextRequest("http://localhost/api/templates/tpl-1?userId=user-1", {
      method: "DELETE",
    });
    const res = await DELETE(req, { params: Promise.resolve({ id: "tpl-1" }) });
    expect(res.status).toBe(403);
  });

  it("userId 없으면 400", async () => {
    const req = new NextRequest("http://localhost/api/templates/tpl-1", {
      method: "DELETE",
    });
    const res = await DELETE(req, { params: Promise.resolve({ id: "tpl-1" }) });
    expect(res.status).toBe(400);
  });
});
