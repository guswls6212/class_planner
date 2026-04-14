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

const VALID_FUTURE = new Date(Date.now() + 86400000).toISOString();

describe("POST /api/invites/accept", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("유효한 토큰으로 멤버 가입 성공", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "invite_tokens") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: "tok-1",
                  academy_id: "acad-1",
                  role: "admin",
                  expires_at: VALID_FUTURE,
                  used_by: null,
                  created_by: "owner-user",
                  academies: { name: "수학의 정석" },
                },
                error: null,
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      if (table === "academy_members") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } }),
              }),
            }),
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      return {};
    });

    const req = new NextRequest("http://localhost/api/invites/accept?userId=new-user", {
      method: "POST",
      body: JSON.stringify({ token: "abc123" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.academyId).toBe("acad-1");
  });

  it("이미 멤버인 경우 멱등 처리", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "invite_tokens") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: "tok-1",
                  academy_id: "acad-1",
                  role: "admin",
                  expires_at: VALID_FUTURE,
                  used_by: null,
                  created_by: "owner-user",
                  academies: { name: "수학의 정석" },
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "academy_members") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { academy_id: "acad-1", role: "admin" },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      return {};
    });

    const req = new NextRequest("http://localhost/api/invites/accept?userId=existing-user", {
      method: "POST",
      body: JSON.stringify({ token: "abc123" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.alreadyMember).toBe(true);
  });

  it("만료된 토큰은 410 반환", async () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString();
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: "tok-1",
              academy_id: "acad-1",
              role: "admin",
              expires_at: pastDate,
              used_by: null,
              created_by: "owner-user",
              academies: { name: "수학의 정석" },
            },
            error: null,
          }),
        }),
      }),
    }));

    const req = new NextRequest("http://localhost/api/invites/accept?userId=new-user", {
      method: "POST",
      body: JSON.stringify({ token: "expired" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(410);
  });

  it("userId 없으면 400 반환", async () => {
    const req = new NextRequest("http://localhost/api/invites/accept", {
      method: "POST",
      body: JSON.stringify({ token: "abc" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
