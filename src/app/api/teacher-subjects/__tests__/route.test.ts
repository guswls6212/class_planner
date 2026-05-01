import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET, POST } from "../route";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

vi.mock("@/lib/resolveAcademyId", () => ({
  resolveAcademyId: vi.fn().mockResolvedValue("test-academy-id"),
}));

const mockGetTeacherSubjects = vi.hoisted(() => vi.fn().mockResolvedValue(["subject-1", "subject-2"]));
const mockAddTeacherSubject = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockRemoveTeacherSubject = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock("@/lib/server/teacherServiceFactory", () => ({
  getTeacherService: () => ({
    getTeacherSubjects: mockGetTeacherSubjects,
    addTeacherSubject: mockAddTeacherSubject,
    removeTeacherSubject: mockRemoveTeacherSubject,
  }),
}));

describe("/api/teacher-subjects API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetTeacherSubjects.mockResolvedValue(["subject-1", "subject-2"]);
    mockAddTeacherSubject.mockResolvedValue(undefined);
    mockRemoveTeacherSubject.mockResolvedValue(undefined);
  });

  describe("GET /api/teacher-subjects", () => {
    it("올바른 과목 목록을 반환해야 한다", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/teacher-subjects?userId=test-user&teacherId=teacher-1"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(["subject-1", "subject-2"]);
      expect(mockGetTeacherSubjects).toHaveBeenCalledWith("teacher-1");
    });

    it("userId 또는 teacherId 누락 시 400을 반환해야 한다", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/teacher-subjects?userId=test-user"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe("userId and teacherId are required");
    });
  });

  describe("POST /api/teacher-subjects", () => {
    it("강사-과목 연결을 생성해야 한다", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/teacher-subjects?userId=test-user",
        {
          method: "POST",
          body: JSON.stringify({ teacherId: "teacher-1", subjectId: "subject-1" }),
          headers: { "Content-Type": "application/json" },
        }
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(mockAddTeacherSubject).toHaveBeenCalledWith("teacher-1", "subject-1", "test-academy-id");
    });

    it("필수 파라미터 누락 시 400을 반환해야 한다", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/teacher-subjects?userId=test-user",
        {
          method: "POST",
          body: JSON.stringify({ teacherId: "teacher-1" }),
          headers: { "Content-Type": "application/json" },
        }
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe("userId, teacherId, subjectId required");
    });
  });

  describe("DELETE /api/teacher-subjects", () => {
    it("강사-과목 연결을 삭제해야 한다", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/teacher-subjects?userId=test-user",
        {
          method: "DELETE",
          body: JSON.stringify({ teacherId: "teacher-1", subjectId: "subject-1" }),
          headers: { "Content-Type": "application/json" },
        }
      );
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockRemoveTeacherSubject).toHaveBeenCalledWith("teacher-1", "subject-1");
    });

    it("필수 파라미터 누락 시 400을 반환해야 한다", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/teacher-subjects?userId=test-user",
        {
          method: "DELETE",
          body: JSON.stringify({ teacherId: "teacher-1" }),
          headers: { "Content-Type": "application/json" },
        }
      );
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe("userId, teacherId, subjectId required");
    });
  });
});
