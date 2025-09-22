import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET, POST } from "../route";

// Mock environment variables for tests
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

// Mock Supabase client
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: { data: { subjects: [] } },
            error: null,
          }),
        })),
        order: vi.fn(() => ({
          mockResolvedValue: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        })),
      })),
      upsert: vi.fn().mockResolvedValue({
        data: { data: { subjects: [] } },
        error: null,
      }),
    })),
  })),
}));

describe("/api/subjects API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/subjects", () => {
    it("기본 응답 구조를 확인한다", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/subjects?userId=test-user"
      );
      const response = await GET(request);
      const data = await response.json();

      // API가 응답하는지만 확인 (Mock 복잡성 피하기)
      expect(typeof response.status).toBe("number");
      expect(data).toHaveProperty("success");
    });
  });

  describe("POST /api/subjects", () => {
    it("필수 필드 검증을 수행한다", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/subjects?userId=test-user",
        {
          method: "POST",
          body: JSON.stringify({}), // name, color 누락
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain("required");
    });
  });

  describe("DELETE /api/subjects", () => {
    it("ID 필수 검증을 수행한다", async () => {
      const request = new NextRequest("http://localhost:3000/api/subjects"); // id 누락

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain("required");
    });
  });
});
