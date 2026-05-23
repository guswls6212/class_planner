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

import { POST } from "../route";

describe("POST /api/invites/[id]/regenerate", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("owner가 미사용 초대를 재발급할 수 있다 (token + expires_at 갱신)", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "owner" });

    const updateMock = vi.fn();

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: "inv-1", academy_id: "acad-1", used_by: null, role: "admin" },
            error: null,
          }),
        }),
      }),
      update: updateMock.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: "inv-1",
                token: "new-hex-token",
                role: "admin",
                expires_at: "2099-01-01",
                created_at: "2026-05-23",
                invitee_label: "박원장님",
              },
              error: null,
            }),
          }),
        }),
      }),
    });

    const req = new NextRequest("http://localhost/api/invites/inv-1/regenerate?userId=user-1", {
      method: "POST",
    });
    const res = await POST(req, { params: Promise.resolve({ id: "inv-1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.token).toBe("new-hex-token");
    expect(body.data.id).toBe("inv-1");

    expect(updateMock).toHaveBeenCalledTimes(1);
    const updatePayload = updateMock.mock.calls[0][0];
    expect(typeof updatePayload.token).toBe("string");
    expect(updatePayload.token.length).toBe(64);
    expect(updatePayload.created_by).toBe("user-1");
    expect(updatePayload.expires_at).toBeDefined();
  });

  it("admin도 재발급 권한이 있다", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "admin" });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: "inv-1", academy_id: "acad-1", used_by: null, role: "member" },
            error: null,
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: "inv-1", token: "t", role: "member", expires_at: "2099-01-01", created_at: "2026-05-23", invitee_label: null },
              error: null,
            }),
          }),
        }),
      }),
    });

    const req = new NextRequest("http://localhost/api/invites/inv-1/regenerate?userId=user-1", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ id: "inv-1" }) });
    expect(res.status).toBe(200);
  });

  it("member는 403을 받는다", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "member" });
    const req = new NextRequest("http://localhost/api/invites/inv-1/regenerate?userId=user-1", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ id: "inv-1" }) });
    expect(res.status).toBe(403);
  });

  it("userId 없으면 400을 반환한다", async () => {
    const req = new NextRequest("http://localhost/api/invites/inv-1/regenerate", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ id: "inv-1" }) });
    expect(res.status).toBe(400);
  });

  it("존재하지 않는 초대는 404를 반환한다", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "owner" });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: "PGRST116" },
          }),
        }),
      }),
    });

    const req = new NextRequest("http://localhost/api/invites/missing/regenerate?userId=user-1", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ id: "missing" }) });
    expect(res.status).toBe(404);
  });

  it("다른 academy의 초대는 403을 반환한다", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "owner" });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: "inv-2", academy_id: "other-acad", used_by: null, role: "admin" },
            error: null,
          }),
        }),
      }),
    });

    const req = new NextRequest("http://localhost/api/invites/inv-2/regenerate?userId=user-1", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ id: "inv-2" }) });
    expect(res.status).toBe(403);
  });

  it("이미 사용된 초대는 410을 반환한다", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "owner" });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: "inv-3", academy_id: "acad-1", used_by: "some-user", role: "admin" },
            error: null,
          }),
        }),
      }),
    });

    const req = new NextRequest("http://localhost/api/invites/inv-3/regenerate?userId=user-1", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ id: "inv-3" }) });
    expect(res.status).toBe(410);
  });

  it("재발급 시 expires_at이 24시간 이후로 갱신된다", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "owner" });

    const updateMock = vi.fn();

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: "inv-4", academy_id: "acad-1", used_by: null, role: "admin" },
            error: null,
          }),
        }),
      }),
      update: updateMock.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: "inv-4", token: "t", role: "admin", expires_at: "2099-01-01", created_at: "2026-05-23", invitee_label: null },
              error: null,
            }),
          }),
        }),
      }),
    });

    const before = Date.now();
    const req = new NextRequest("http://localhost/api/invites/inv-4/regenerate?userId=user-1", { method: "POST" });
    await POST(req, { params: Promise.resolve({ id: "inv-4" }) });

    const updatePayload = updateMock.mock.calls[0][0];
    const expiresAtMs = new Date(updatePayload.expires_at).getTime();
    const oneHour = 60 * 60 * 1000;
    expect(expiresAtMs).toBeGreaterThan(before + 23 * oneHour);
    expect(expiresAtMs).toBeLessThan(before + 25 * oneHour);
  });
});
