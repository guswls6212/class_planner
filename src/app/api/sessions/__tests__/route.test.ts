import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET, POST } from "../route";

// Mock environment variables for tests
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

// Simple mock for ServiceFactory
vi.mock("@/application/services/ServiceFactory", () => ({
  ServiceFactory: {
    createSessionService: () => ({
      getAllSessions: vi.fn().mockResolvedValue([]),
      addSession: vi.fn().mockResolvedValue({
        id: "test-session-id",
        subjectId: "550e8400-e29b-41d4-a716-446655440101",
        startsAt: "09:00",
        endsAt: "10:00",
        enrollmentIds: ["550e8400-e29b-41d4-a716-446655440301"],
        weekday: 0,
        createdAt: new Date(),
      }),
      deleteSession: vi.fn().mockResolvedValue(true),
    }),
  },
}));

describe("/api/sessions API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/sessions", () => {
    it("기본 응답 구조를 확인한다", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/sessions?userId=test-user"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(typeof response.status).toBe("number");
      expect(data).toHaveProperty("success");
    });
  });

  describe("POST /api/sessions", () => {
    it("필수 필드 검증을 수행한다", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/sessions?userId=test-user",
        {
          method: "POST",
          body: JSON.stringify({}), // 필수 필드 누락
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  describe("DELETE /api/sessions", () => {
    it("ID 필수 검증을 수행한다", async () => {
      const request = new NextRequest("http://localhost:3000/api/sessions"); // id 누락

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain("required");
    });
  });
});
