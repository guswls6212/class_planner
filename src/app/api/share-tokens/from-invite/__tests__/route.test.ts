import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
process.env.PUBLIC_BASE_URL = "https://class-planner.info365.studio";

const { mockFrom } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
}));

vi.mock("@/lib/supabaseServiceRole", () => ({
  getServiceRoleClient: () => ({ from: mockFrom }),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

import { POST } from "../route";

const VALID_INVITE = {
  id: "invite-1",
  teacher_id: "teacher-1",
  academy_id: "acad-1",
  used_by: null,
  expires_at: "2099-01-01T00:00:00Z",
  teachers: { name: "김강사" },
};

const SAMPLE_SHARE_TOKEN = {
  id: "share-tok-1",
  token: "sharetoken123",
};

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/share-tokens/from-invite", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/share-tokens/from-invite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("유효한 초대 토큰으로 share_token을 생성하고 shareUrl을 반환한다", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "invite_tokens") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: VALID_INVITE,
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "share_tokens") {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: SAMPLE_SHARE_TOKEN,
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "audit_log") {
        return {
          insert: vi.fn().mockReturnValue({
            then: vi.fn(),
          }),
        };
      }
      return {};
    });

    const req = makeRequest({ inviteToken: "valid-token" });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.shareUrl).toContain("sharetoken123");
    expect(body.shareUrl).toContain("/share/");
    expect(body.token).toBe("sharetoken123");
  });

  it("inviteToken이 없으면 400을 반환한다", async () => {
    const req = makeRequest({});
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
  });

  it("초대를 찾을 수 없으면 404를 반환한다", async () => {
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

    const req = makeRequest({ inviteToken: "nonexistent-token" });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.success).toBe(false);
  });

  it("만료된 초대는 410을 반환한다", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              ...VALID_INVITE,
              expires_at: "2020-01-01T00:00:00Z",
            },
            error: null,
          }),
        }),
      }),
    });

    const req = makeRequest({ inviteToken: "expired-token" });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(410);
    expect(body.success).toBe(false);
  });

  it("teacher_id가 null인 관리자 초대는 400을 반환한다", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              ...VALID_INVITE,
              teacher_id: null,
              teachers: null,
            },
            error: null,
          }),
        }),
      }),
    });

    const req = makeRequest({ inviteToken: "admin-invite-token" });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
  });
});
