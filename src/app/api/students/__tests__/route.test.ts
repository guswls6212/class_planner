import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE } from "../[id]/route";
import { GET, POST } from "../route";

// Mock environment variables for tests
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

// Simple mock for ServiceFactory
vi.mock("@/application/services/ServiceFactory", () => ({
  ServiceFactory: {
    createStudentService: () => ({
      getAllStudents: vi.fn().mockResolvedValue([]),
      addStudent: vi.fn().mockResolvedValue({
        id: "test-student-id",
        name: "김철수",
        createdAt: new Date().toISOString(),
      }),
      updateStudent: vi.fn().mockResolvedValue({
        id: "test-student-id",
        name: "김철수",
        createdAt: new Date().toISOString(),
      }),
      deleteStudent: vi.fn().mockResolvedValue(true),
    }),
  },
}));

describe("/api/students API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/students", () => {
    it("올바른 응답 구조를 반환해야 한다", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/students?userId=test-user"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("success");
      expect(data).toHaveProperty("data");
    });
  });

  describe("POST /api/students", () => {
    it("올바른 응답 구조를 반환해야 한다", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/students?userId=test-user",
        {
          method: "POST",
          body: JSON.stringify({ name: "김철수" }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toHaveProperty("success");
      expect(data).toHaveProperty("data");
    });

    it("잘못된 요청 데이터에 대해 400 에러를 반환해야 한다", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/students?userId=test-user",
        {
          method: "POST",
          body: JSON.stringify({}), // name 누락
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Name is required");
    });
  });

  describe("DELETE /api/students/[id]", () => {
    it("올바른 응답 구조를 반환해야 한다", async () => {
      const studentId = "550e8400-e29b-41d4-a716-446655440001";
      const userId = "test-user-id";
      const request = new NextRequest(
        `http://localhost:3000/api/students/${studentId}?userId=${userId}`,
        { method: "DELETE" }
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ id: studentId }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("success");
      expect(data).toHaveProperty("message");
    });

    it("userId가 없으면 400 에러를 반환해야 한다", async () => {
      const studentId = "550e8400-e29b-41d4-a716-446655440001";
      const request = new NextRequest(
        `http://localhost:3000/api/students/${studentId}`, // userId 누락
        { method: "DELETE" }
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ id: studentId }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe("User ID is required");
    });
  });
});
