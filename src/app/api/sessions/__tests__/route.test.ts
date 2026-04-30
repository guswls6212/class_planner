import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET, POST } from "../route";

// Mock environment variables for tests
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

vi.mock("@/lib/resolveAcademyId", () => ({
  resolveAcademyId: vi.fn().mockResolvedValue("test-academy-id"),
}));

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

    it("weekStartDate 파라미터를 서비스로 전달한다", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/sessions?userId=test-user&weekStartDate=2026-04-27"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(data.success).toBe(true);
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

    it("weekStartDate 없으면 400을 반환한다", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/sessions?userId=test-user",
        {
          method: "POST",
          body: JSON.stringify({
            subjectId: "sub-1",
            startsAt: "09:00",
            endsAt: "10:00",
            enrollmentIds: [],
            weekday: 0,
            // weekStartDate 없음
          }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("weekStartDate");
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
