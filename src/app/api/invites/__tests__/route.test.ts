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

describe("GET /api/invites", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("owner가 pending 초대 목록을 조회할 수 있다", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "owner" });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            gt: vi.fn().mockResolvedValue({
              data: [
                { id: "tok-1", token: "abc123", role: "admin", expires_at: "2099-01-01", created_at: "2026-04-14", teachers: null, teacher_id: null },
              ],
              error: null,
            }),
          }),
        }),
      }),
    });

    const req = new NextRequest("http://localhost/api/invites?userId=user-1");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].role).toBe("admin");
    expect(body.data[0].expiresAt).toBe("2099-01-01");
    expect(body.data[0].expires_at).toBeUndefined();
    expect(body.data[0].teacherName).toBeNull();
    expect(body.data[0].teacherId).toBeNull();
  });

  it("강사 연동된 초대는 teacherName을 포함한다", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "owner" });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            gt: vi.fn().mockResolvedValue({
              data: [
                { id: "tok-2", token: "def456", role: "member", expires_at: "2099-01-01", created_at: "2026-04-14", teachers: { name: "김강사" }, teacher_id: "teacher-1" },
              ],
              error: null,
            }),
          }),
        }),
      }),
    });

    const req = new NextRequest("http://localhost/api/invites?userId=user-1");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data[0].teacherName).toBe("김강사");
    expect(body.data[0].teacherId).toBe("teacher-1");
  });

  it("member는 403을 받는다", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "member" });
    const req = new NextRequest("http://localhost/api/invites?userId=user-1");
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it("userId 없으면 400을 반환한다", async () => {
    const req = new NextRequest("http://localhost/api/invites");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });
});

describe("POST /api/invites", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("owner가 admin 역할 초대 토큰을 생성할 수 있다", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "owner" });
    mockFrom.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: "tok-1", token: "abc123", role: "admin", expires_at: "2099-01-01", created_at: "2026-04-14" },
            error: null,
          }),
        }),
      }),
    });

    const req = new NextRequest("http://localhost/api/invites?userId=user-1", {
      method: "POST",
      body: JSON.stringify({ role: "admin" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.token).toBe("abc123");
  });

  it("role=member + teacherId 없으면 400을 반환한다", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "owner" });
    const req = new NextRequest("http://localhost/api/invites?userId=user-1", {
      method: "POST",
      body: JSON.stringify({ role: "member" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("INVITE_MEMBER_REQUIRES_TEACHER");
  });

  it("유효한 teacherId로 member 초대를 생성할 수 있다", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "owner" });
    mockFrom.mockImplementation((table: string) => {
      if (table === "teachers") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: "teacher-1", user_id: null },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      return {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: "tok-2", token: "xyz789", role: "member", expires_at: "2099-01-01", created_at: "2026-04-14" },
              error: null,
            }),
          }),
        }),
      };
    });

    const req = new NextRequest("http://localhost/api/invites?userId=user-1", {
      method: "POST",
      body: JSON.stringify({ role: "member", teacherId: "teacher-1" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
  });

  it("이미 연동된 강사에 초대하면 400을 반환한다", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "owner" });
    mockFrom.mockImplementation((table: string) => {
      if (table === "teachers") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: "teacher-1", user_id: "existing-user" },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      return {};
    });

    const req = new NextRequest("http://localhost/api/invites?userId=user-1", {
      method: "POST",
      body: JSON.stringify({ role: "member", teacherId: "teacher-1" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("TEACHER_ALREADY_LINKED");
  });

  it("존재하지 않는 teacherId는 400을 반환한다", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "owner" });
    mockFrom.mockImplementation((table: string) => {
      if (table === "teachers") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { code: "PGRST116" },
                }),
              }),
            }),
          }),
        };
      }
      return {};
    });

    const req = new NextRequest("http://localhost/api/invites?userId=user-1", {
      method: "POST",
      body: JSON.stringify({ role: "member", teacherId: "nonexistent" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("TEACHER_NOT_FOUND");
  });

  it("잘못된 role은 400을 반환한다", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "owner" });
    const req = new NextRequest("http://localhost/api/invites?userId=user-1", {
      method: "POST",
      body: JSON.stringify({ role: "owner" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("member는 403을 받는다", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "member" });
    const req = new NextRequest("http://localhost/api/invites?userId=user-1", {
      method: "POST",
      body: JSON.stringify({ role: "admin" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });
});
