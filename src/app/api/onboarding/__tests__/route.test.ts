import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../route";

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

const mockAcademyInsert = vi.fn();
const mockMemberInsert = vi.fn();
const mockMemberSelect = vi.fn();
const mockMemberInsertArgs = vi.fn(); // ADR-019: INSERT body capture (role 검증용)

vi.mock("@/lib/supabaseServiceRole", () => ({
  getServiceRoleClient: () => ({
    from: (table: string) => {
      if (table === "academy_members") {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: mockMemberSelect,
              }),
            }),
          }),
          insert: (args: unknown) => {
            mockMemberInsertArgs(args);
            return { then: mockMemberInsert, error: null };
          },
        };
      }
      if (table === "academies") {
        return {
          insert: () => ({
            select: () => ({
              single: mockAcademyInsert,
            }),
          }),
        };
      }
      return {};
    },
  }),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("POST /api/onboarding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("userId가 없으면 400을 반환해야 한다", async () => {
    const request = new NextRequest("http://localhost:3000/api/onboarding", {
      method: "POST",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe("User ID is required");
  });

  it("academyName이 없으면 400을 반환해야 한다", async () => {
    mockMemberSelect.mockResolvedValue({ data: null, error: { code: "PGRST116" } });

    const request = new NextRequest(
      "http://localhost:3000/api/onboarding?userId=new-user-id",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }
    );

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("이미 academy가 있는 사용자는 isNew: false + Set-Cookie를 반환해야 한다", async () => {
    mockMemberSelect.mockResolvedValue({
      data: { academy_id: "existing-academy-id" },
      error: null,
    });

    const request = new NextRequest(
      "http://localhost:3000/api/onboarding?userId=existing-user",
      { method: "POST" }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.academyId).toBe("existing-academy-id");
    expect(data.isNew).toBe(false);
    expect(response.headers.get("set-cookie")).toContain("onboarded=1");
  });

  it("신규 사용자는 academy를 생성하고 isNew: true + Set-Cookie를 반환해야 한다", async () => {
    mockMemberSelect.mockResolvedValue({ data: null, error: { code: "PGRST116" } });
    mockAcademyInsert.mockResolvedValue({
      data: { id: "new-academy-id" },
      error: null,
    });
    mockMemberInsert.mockImplementation((fn: (val: { error: null }) => unknown) => fn({ error: null }));

    const request = new NextRequest(
      "http://localhost:3000/api/onboarding?userId=new-user-id",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ academyName: "테스트학원" }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.academyId).toBe("new-academy-id");
    expect(data.isNew).toBe(true);
    expect(response.headers.get("set-cookie")).toContain("onboarded=1");
  });

  // ──────────────────────────────────────────────────────────────────────
  // ADR-019: first-user owner-enforcement 회귀 가드
  // ──────────────────────────────────────────────────────────────────────

  it("ADR-019: body에 role이 없어도 owner로 INSERT 되어야 한다", async () => {
    mockMemberSelect.mockResolvedValue({ data: null, error: { code: "PGRST116" } });
    mockAcademyInsert.mockResolvedValue({
      data: { id: "new-academy-id" },
      error: null,
    });
    mockMemberInsert.mockImplementation((fn: (val: { error: null }) => unknown) => fn({ error: null }));

    const request = new NextRequest(
      "http://localhost:3000/api/onboarding?userId=new-user-id",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ academyName: "테스트학원" }), // role 없음
      }
    );

    await POST(request);

    expect(mockMemberInsertArgs).toHaveBeenCalledTimes(1);
    const insertedRow = mockMemberInsertArgs.mock.calls[0][0] as { role: string };
    expect(insertedRow.role).toBe("owner");
  });

  it("ADR-019: body.role='admin' 보내도 server-side에서 owner 강제", async () => {
    mockMemberSelect.mockResolvedValue({ data: null, error: { code: "PGRST116" } });
    mockAcademyInsert.mockResolvedValue({
      data: { id: "new-academy-id" },
      error: null,
    });
    mockMemberInsert.mockImplementation((fn: (val: { error: null }) => unknown) => fn({ error: null }));

    const request = new NextRequest(
      "http://localhost:3000/api/onboarding?userId=new-user-id",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ academyName: "유령학원", role: "admin" }), // attacker가 admin 시도
      }
    );

    const response = await POST(request);

    expect(response.status).toBe(201);
    expect(mockMemberInsertArgs).toHaveBeenCalledTimes(1);
    const insertedRow = mockMemberInsertArgs.mock.calls[0][0] as { role: string };
    expect(insertedRow.role).toBe("owner"); // admin이 아닌 owner로 INSERT
  });

  it("ADR-019: body.role='member' 보내도 server-side에서 owner 강제", async () => {
    mockMemberSelect.mockResolvedValue({ data: null, error: { code: "PGRST116" } });
    mockAcademyInsert.mockResolvedValue({
      data: { id: "new-academy-id" },
      error: null,
    });
    mockMemberInsert.mockImplementation((fn: (val: { error: null }) => unknown) => fn({ error: null }));

    const request = new NextRequest(
      "http://localhost:3000/api/onboarding?userId=new-user-id",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ academyName: "테스트", role: "member" }),
      }
    );

    await POST(request);

    const insertedRow = mockMemberInsertArgs.mock.calls[0][0] as { role: string };
    expect(insertedRow.role).toBe("owner");
  });
});
