import { AppError } from "@/lib/errors/AppError";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE } from "../[id]/route";
import { GET, POST } from "../route";

// Mock environment variables for tests
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

vi.mock("@/lib/resolveAcademyId", () => ({
  resolveAcademyId: vi.fn().mockResolvedValue("test-academy-id"),
}));

// Use hoisted fn refs so individual tests can override behaviour
const mockGetAllStudents = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const mockAddStudent = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    id: "test-student-id",
    name: "김철수",
    createdAt: new Date().toISOString(),
  })
);
const mockUpdateStudent = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    id: "test-student-id",
    name: "김철수",
    createdAt: new Date().toISOString(),
  })
);
const mockDeleteStudent = vi.hoisted(() => vi.fn().mockResolvedValue(true));

vi.mock("@/application/services/ServiceFactory", () => ({
  ServiceFactory: {
    createStudentService: () => ({
      getAllStudents: mockGetAllStudents,
      addStudent: mockAddStudent,
      updateStudent: mockUpdateStudent,
      deleteStudent: mockDeleteStudent,
    }),
  },
}));

describe("/api/students API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to default successful behavior
    mockGetAllStudents.mockResolvedValue([]);
    mockAddStudent.mockResolvedValue({
      id: "test-student-id",
      name: "김철수",
      createdAt: new Date().toISOString(),
    });
    mockUpdateStudent.mockResolvedValue({
      id: "test-student-id",
      name: "김철수",
      createdAt: new Date().toISOString(),
    });
    mockDeleteStudent.mockResolvedValue(true);
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

    it("중복 학생 시 AppError가 구조화된 에러 포맷(409)으로 반환되어야 한다", async () => {
      mockAddStudent.mockRejectedValueOnce(
        new AppError("STUDENT_NAME_DUPLICATE", { statusHint: 409 })
      );

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

      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe("STUDENT_NAME_DUPLICATE");
      expect(typeof data.error.message).toBe("string");
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
