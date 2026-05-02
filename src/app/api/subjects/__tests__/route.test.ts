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
    mockRequireRole.mockResolvedValue({ academyId: "test-academy-id", role: "owner" });
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

    it("member role은 POST에 403을 반환해야 한다", async () => {
      mockRequireRole.mockRejectedValueOnce(
        new AppError("FORBIDDEN", { statusHint: 403 })
      );

      const request = new NextRequest(
        "http://localhost:3000/api/subjects?userId=member-user",
        {
          method: "POST",
          body: JSON.stringify({ name: "수학", color: "#ff0000" }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await POST(request);
      expect(response.status).toBe(403);
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

    it("member role은 DELETE에 403을 반환해야 한다", async () => {
      mockRequireRole.mockRejectedValueOnce(
        new AppError("FORBIDDEN", { statusHint: 403 })
      );

      const request = new NextRequest(
        "http://localhost:3000/api/subjects?id=subject-1&userId=member-user"
      );

      const response = await DELETE(request);
      expect(response.status).toBe(403);
    });
  });
});
