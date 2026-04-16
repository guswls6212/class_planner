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

const SAMPLE_TOKEN = {
  id: "tok-1",
  token: "abc123abc123",
  label: "학부모 공유",
  filter_student_id: null,
  expires_at: "2099-01-01T00:00:00Z",
  created_at: "2026-04-17T00:00:00Z",
  revoked_at: null,
};

describe("GET /api/share-tokens", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("owner가 공유 링크 목록을 조회할 수 있다", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "owner" });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockResolvedValue({ data: [SAMPLE_TOKEN], error: null }),
        }),
      }),
    });

    const req = new NextRequest("http://localhost/api/share-tokens?userId=user-1");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
  });

  it("member는 403을 받는다", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "member" });
    const req = new NextRequest("http://localhost/api/share-tokens?userId=user-1");
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it("userId 없으면 400", async () => {
    const req = new NextRequest("http://localhost/api/share-tokens");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });
});

describe("POST /api/share-tokens", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("owner가 공유 토큰을 생성할 수 있다", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "owner" });
    mockFrom.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: SAMPLE_TOKEN, error: null }),
        }),
      }),
    });

    const req = new NextRequest("http://localhost/api/share-tokens?userId=user-1", {
      method: "POST",
      body: JSON.stringify({ label: "학부모 공유" }),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.token).toBe("abc123abc123");
  });

  it("member는 403을 받는다", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "member" });
    const req = new NextRequest("http://localhost/api/share-tokens?userId=user-1", {
      method: "POST",
      body: JSON.stringify({ label: "test" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });
});
