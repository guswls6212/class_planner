import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET, POST } from "../route";

// Mock environment variables for tests
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

vi.mock("@/lib/resolveAcademyId", () => ({
  resolveAcademyId: vi.fn().mockResolvedValue("test-academy-id"),
}));

vi.mock("@/application/services/ServiceFactory", () => ({
  ServiceFactory: {
    createSubjectService: () => ({
      getAllSubjects: vi.fn().mockResolvedValue([]),
      addSubject: vi.fn().mockResolvedValue({
        id: "test-subject-id",
        name: "수학",
        color: "#ff0000",
        createdAt: new Date().toISOString(),
      }),
      updateSubject: vi.fn().mockResolvedValue({
        id: "test-subject-id",
        name: "수학",
        color: "#ff0000",
        createdAt: new Date().toISOString(),
      }),
      deleteSubject: vi.fn().mockResolvedValue(true),
    }),
  },
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

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("success");
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });

    it("userId가 없으면 400을 반환한다", async () => {
      const request = new NextRequest("http://localhost:3000/api/subjects");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
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
