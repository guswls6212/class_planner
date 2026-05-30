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

import { POST } from "../route";

describe("POST /api/auth/set-active-academy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("userId가 없으면 400을 반환한다", async () => {
    const req = new NextRequest("http://localhost/api/auth/set-active-academy", {
      method: "POST",
      body: JSON.stringify({ academyId: "acad-1" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("userId and academyId required");
  });

  it("academyId가 없으면 400을 반환한다", async () => {
    const req = new NextRequest("http://localhost/api/auth/set-active-academy", {
      method: "POST",
      body: JSON.stringify({ userId: "user-1" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("userId and academyId required");
  });

  it("body가 비어있으면 400을 반환한다", async () => {
    const req = new NextRequest("http://localhost/api/auth/set-active-academy", {
      method: "POST",
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("해당 학원의 멤버가 아니면 403을 반환한다", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null }),
          }),
        }),
      }),
    });

    const req = new NextRequest("http://localhost/api/auth/set-active-academy", {
      method: "POST",
      body: JSON.stringify({ userId: "user-1", academyId: "not-member-acad" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("해당 학원의 멤버가 아닙니다.");
  });

  it("멤버이면 200과 함께 active_academy_id 쿠키를 설정한다", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { role: "owner" } }),
          }),
        }),
      }),
    });

    const req = new NextRequest("http://localhost/api/auth/set-active-academy", {
      method: "POST",
      body: JSON.stringify({ userId: "user-1", academyId: "acad-1" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);

    const cookie = res.cookies.get("active_academy_id");
    expect(cookie?.value).toBe("acad-1");
  });
});
