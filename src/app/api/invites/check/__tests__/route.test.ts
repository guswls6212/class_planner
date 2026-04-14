import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

const { mockFrom } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
}));

vi.mock("@/lib/supabaseServiceRole", () => ({
  getServiceRoleClient: () => ({ from: mockFrom }),
}));

import { GET } from "../route";

describe("GET /api/invites/check", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("유효한 토큰이면 초대 정보를 반환한다", async () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: "tok-1",
              role: "admin",
              expires_at: futureDate,
              used_by: null,
              academies: { name: "수학의 정석" },
            },
            error: null,
          }),
        }),
      }),
    });

    const req = new NextRequest("http://localhost/api/invites/check?token=abc123");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.valid).toBe(true);
    expect(body.academyName).toBe("수학의 정석");
    expect(body.role).toBe("admin");
  });

  it("만료된 토큰은 valid:false를 반환한다", async () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString();
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: "tok-1",
              role: "admin",
              expires_at: pastDate,
              used_by: null,
              academies: { name: "수학의 정석" },
            },
            error: null,
          }),
        }),
      }),
    });

    const req = new NextRequest("http://localhost/api/invites/check?token=abc123");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.valid).toBe(false);
    expect(body.reason).toBe("expired");
  });

  it("없는 토큰은 404를 반환한다", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } }),
        }),
      }),
    });

    const req = new NextRequest("http://localhost/api/invites/check?token=notexist");
    const res = await GET(req);
    expect(res.status).toBe(404);
  });
});
