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

describe("DELETE /api/share-tokens/[id]", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("owner가 공유 토큰을 취소(revoke)할 수 있다", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "owner" });
    mockFrom.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    });

    const req = new NextRequest("http://localhost/api/share-tokens/tok-1?userId=user-1", {
      method: "DELETE",
    });
    const res = await DELETE(req, { params: Promise.resolve({ id: "tok-1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("member는 403을 받는다", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "member" });
    const req = new NextRequest("http://localhost/api/share-tokens/tok-1?userId=user-1", {
      method: "DELETE",
    });
    const res = await DELETE(req, { params: Promise.resolve({ id: "tok-1" }) });
    expect(res.status).toBe(403);
  });

  it("userId 없으면 400", async () => {
    const req = new NextRequest("http://localhost/api/share-tokens/tok-1", {
      method: "DELETE",
    });
    const res = await DELETE(req, { params: Promise.resolve({ id: "tok-1" }) });
    expect(res.status).toBe(400);
  });
});
