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

describe("GET /api/academies/mine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("userId가 없으면 400을 반환한다", async () => {
    const req = new NextRequest("http://localhost/api/academies/mine");
    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("userId required");
  });

  it("학원 목록을 role 우선순위로 정렬하여 반환한다", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [
            {
              role: "member",
              academies: { id: "acad-3", name: "세 번째 학원", slug: "third" },
            },
            {
              role: "owner",
              academies: { id: "acad-1", name: "첫 번째 학원", slug: "first" },
            },
            {
              role: "admin",
              academies: { id: "acad-2", name: "두 번째 학원", slug: "second" },
            },
          ],
          error: null,
        }),
      }),
    });

    const req = new NextRequest("http://localhost/api/academies/mine?userId=user-1");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.academies).toHaveLength(3);
    expect(body.academies[0].role).toBe("owner");
    expect(body.academies[0].id).toBe("acad-1");
    expect(body.academies[1].role).toBe("admin");
    expect(body.academies[2].role).toBe("member");
  });

  it("학원이 없으면 빈 배열을 반환한다", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }),
    });

    const req = new NextRequest("http://localhost/api/academies/mine?userId=user-no-academy");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.academies).toEqual([]);
  });

  it("DB 에러 시 500을 반환한다", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: new Error("DB error"),
        }),
      }),
    });

    const req = new NextRequest("http://localhost/api/academies/mine?userId=user-1");
    const res = await GET(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("fetch failed");
  });

  it("slug가 null인 학원도 포함하여 반환한다", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [
            {
              role: "owner",
              academies: { id: "acad-1", name: "슬러그 없는 학원", slug: null },
            },
          ],
          error: null,
        }),
      }),
    });

    const req = new NextRequest("http://localhost/api/academies/mine?userId=user-1");
    const res = await GET(req);
    const body = await res.json();
    expect(body.academies[0].slug).toBeNull();
  });
});
