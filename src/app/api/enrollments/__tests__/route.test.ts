import { AppError } from "@/lib/errors/AppError";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET, POST } from "../route";

// Mock environment variables for tests
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

vi.mock("@/lib/resolveAcademyId", () => ({
  resolveAcademyId: vi.fn().mockResolvedValue("test-academy-id"),
}));

const mockRequireRole = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ academyId: "test-academy-id", role: "owner" })
);

vi.mock("@/lib/auth/permissions", () => ({
  requireRole: mockRequireRole,
  requireOwnTeacher: vi.fn().mockResolvedValue("test-teacher-id"),
  pickAllowedFields: (body: Record<string, unknown>, fields: string[]) =>
    Object.fromEntries(Object.entries(body).filter(([k]) => fields.includes(k))),
}));

vi.mock("@/application/services/ServiceFactory", () => ({
  ServiceFactory: {
    createEnrollmentService: () => ({
      getAllEnrollments: vi.fn().mockResolvedValue([]),
      addEnrollment: vi.fn().mockResolvedValue({
        id: "test-enrollment-id",
        studentId: "test-student-id",
        subjectId: "test-subject-id",
        academyId: "test-academy-id",
        createdAt: new Date().toISOString(),
      }),
      deleteEnrollment: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

describe("/api/enrollments API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRole.mockResolvedValue({ academyId: "test-academy-id", role: "owner" });
  });

  describe("GET /api/enrollments", () => {
    it("올바른 응답 구조를 반환해야 한다", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/enrollments?userId=test-user"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("data");
      expect(Array.isArray(data.data)).toBe(true);
    });

    it("userId가 없으면 400 에러를 반환해야 한다", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/enrollments"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe("User ID is required");
    });
  });

  describe("POST /api/enrollments", () => {
    it("올바른 응답 구조를 반환해야 한다", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/enrollments?userId=test-user",
        {
          method: "POST",
          body: JSON.stringify({
            studentId: "test-student-id",
            subjectId: "test-subject-id",
          }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("data");
    });

    it("member role은 POST에 403을 반환해야 한다", async () => {
      mockRequireRole.mockRejectedValueOnce(
        new AppError("FORBIDDEN", { statusHint: 403 })
      );

      const request = new NextRequest(
        "http://localhost:3000/api/enrollments?userId=member-user",
        {
          method: "POST",
          body: JSON.stringify({
            studentId: "test-student-id",
            subjectId: "test-subject-id",
          }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await POST(request);
      expect(response.status).toBe(403);
    });

    it("studentId가 없으면 400 에러를 반환해야 한다", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/enrollments?userId=test-user",
        {
          method: "POST",
          body: JSON.stringify({ subjectId: "test-subject-id" }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe("studentId and subjectId are required");
    });

    it("subjectId가 없으면 400 에러를 반환해야 한다", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/enrollments?userId=test-user",
        {
          method: "POST",
          body: JSON.stringify({ studentId: "test-student-id" }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe("studentId and subjectId are required");
    });

    it("userId가 없으면 400 에러를 반환해야 한다", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/enrollments",
        {
          method: "POST",
          body: JSON.stringify({
            studentId: "test-student-id",
            subjectId: "test-subject-id",
          }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe("User ID is required");
    });
  });

  describe("DELETE /api/enrollments", () => {
    it("올바른 응답 구조를 반환해야 한다", async () => {
      const enrollmentId = "test-enrollment-id";
      const userId = "test-user-id";
      const request = new NextRequest(
        `http://localhost:3000/api/enrollments?id=${enrollmentId}&userId=${userId}`,
        { method: "DELETE" }
      );

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("message");
    });

    it("member role은 DELETE에 403을 반환해야 한다", async () => {
      mockRequireRole.mockRejectedValueOnce(
        new AppError("FORBIDDEN", { statusHint: 403 })
      );

      const request = new NextRequest(
        "http://localhost:3000/api/enrollments?id=enrollment-1&userId=member-user",
        { method: "DELETE" }
      );

      const response = await DELETE(request);
      expect(response.status).toBe(403);
    });

    it("id가 없으면 400 에러를 반환해야 한다", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/enrollments?userId=test-user",
        { method: "DELETE" }
      );

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Enrollment ID is required");
    });

    it("userId가 없으면 400 에러를 반환해야 한다", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/enrollments?id=test-enrollment-id",
        { method: "DELETE" }
      );

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe("User ID is required");
    });
  });
});
