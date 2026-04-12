import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../route";

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

const mockGetById = vi.fn();
const mockAcademyInsert = vi.fn();
const mockMemberInsert = vi.fn();
const mockMemberSelect = vi.fn();

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
          insert: () => ({ then: mockMemberInsert, error: null }),
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
    auth: {
      admin: {
        getUserById: mockGetById,
      },
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

  it("이미 academy가 있는 사용자는 isNew: false를 반환해야 한다", async () => {
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
  });

  it("신규 사용자는 academy를 생성하고 isNew: true를 반환해야 한다", async () => {
    // academy_member 없음
    mockMemberSelect.mockResolvedValue({ data: null, error: { code: "PGRST116" } });

    // 사용자 메타데이터
    mockGetById.mockResolvedValue({
      data: {
        user: {
          id: "new-user-id",
          email: "newuser@example.com",
          user_metadata: { full_name: "김신규" },
        },
      },
      error: null,
    });

    // academy INSERT 성공
    mockAcademyInsert.mockResolvedValue({
      data: { id: "new-academy-id" },
      error: null,
    });

    // academy_member INSERT 성공
    mockMemberInsert.mockImplementation((fn: (val: { error: null }) => unknown) => fn({ error: null }));

    const request = new NextRequest(
      "http://localhost:3000/api/onboarding?userId=new-user-id",
      { method: "POST" }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.academyId).toBe("new-academy-id");
    expect(data.isNew).toBe(true);
  });
});
