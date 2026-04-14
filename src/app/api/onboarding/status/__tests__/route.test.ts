import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "../route";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

const mockMemberSelect = vi.fn();

vi.mock("@/lib/supabaseServiceRole", () => ({
  getServiceRoleClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          limit: () => ({
            single: mockMemberSelect,
          }),
        }),
      }),
    }),
  }),
}));

vi.mock("@/lib/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe("GET /api/onboarding/status", () => {
  beforeEach(() => vi.clearAllMocks());

  it("userId가 없으면 400을 반환한다", async () => {
    const req = new NextRequest("http://localhost:3000/api/onboarding/status");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("academy가 있는 사용자는 hasAcademy: true + Set-Cookie를 반환한다", async () => {
    mockMemberSelect.mockResolvedValue({
      data: { academy_id: "academy-123" },
      error: null,
    });

    const req = new NextRequest(
      "http://localhost:3000/api/onboarding/status?userId=user-123"
    );
    const res = await GET(req);
    const data = await res.json();

    expect(data.hasAcademy).toBe(true);
    expect(data.academyId).toBe("academy-123");
    expect(res.headers.get("set-cookie")).toContain("onboarded=1");
  });

  it("academy가 없는 사용자는 hasAcademy: false를 반환한다", async () => {
    mockMemberSelect.mockResolvedValue({ data: null, error: { code: "PGRST116" } });

    const req = new NextRequest(
      "http://localhost:3000/api/onboarding/status?userId=new-user"
    );
    const res = await GET(req);
    const data = await res.json();

    expect(data.hasAcademy).toBe(false);
    expect(res.headers.get("set-cookie")).toBeNull();
  });
});
