import { AppError } from "@/lib/errors/AppError";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PUT } from "../[id]/route";
import { GET, POST } from "../route";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

vi.mock("@/lib/resolveAcademyId", () => ({
  resolveAcademyId: vi.fn().mockResolvedValue("test-academy-id"),
}));

const mockGetAllTeachers = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const mockAddTeacher = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    id: "test-teacher-id",
    name: "김강사",
    color: "#6366f1",
    email: null,
    phone: null,
    role: null,
    notes: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
);
const mockUpdateTeacher = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    id: "test-teacher-id",
    name: "김강사",
    color: "#6366f1",
    email: "teacher@test.com",
    phone: "010-1234-5678",
    role: "member",
    notes: "메모",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
);

vi.mock("@/application/services/ServiceFactory", () => ({
  ServiceFactory: {
    createTeacherService: () => ({
      getAllTeachers: mockGetAllTeachers,
      addTeacher: mockAddTeacher,
      updateTeacher: mockUpdateTeacher,
    }),
  },
}));

describe("/api/teachers API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAllTeachers.mockResolvedValue([]);
    mockAddTeacher.mockResolvedValue({
      id: "test-teacher-id",
      name: "김강사",
      color: "#6366f1",
      email: null,
      phone: null,
      role: null,
      notes: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  describe("GET /api/teachers", () => {
    it("올바른 응답 구조를 반환해야 한다", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/teachers?userId=test-user"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("success");
      expect(data).toHaveProperty("data");
    });

    it("userId가 없으면 400을 반환해야 한다", async () => {
      const request = new NextRequest("http://localhost:3000/api/teachers");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe("User ID is required");
    });

    it("unlinked=true 파라미터 전달 시 userId가 null인 강사만 반환해야 한다", async () => {
      const linkedTeacher = {
        id: "linked-teacher",
        name: "연결된강사",
        userId: "some-user-id",
        toJSON: () => ({ id: "linked-teacher", name: "연결된강사", userId: "some-user-id" }),
      };
      const unlinkedTeacher = {
        id: "unlinked-teacher",
        name: "미연결강사",
        userId: null,
        toJSON: () => ({ id: "unlinked-teacher", name: "미연결강사", userId: null }),
      };
      mockGetAllTeachers.mockResolvedValueOnce([linkedTeacher, unlinkedTeacher]);

      const request = new NextRequest(
        "http://localhost:3000/api/teachers?userId=test-user&unlinked=true"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].id).toBe("unlinked-teacher");
    });
  });

  describe("POST /api/teachers", () => {
    it("새 강사를 생성해야 한다", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/teachers?userId=test-user",
        {
          method: "POST",
          body: JSON.stringify({ name: "김강사", color: "#6366f1" }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data).toHaveProperty("data");
      expect(mockAddTeacher).toHaveBeenCalledWith(
        expect.objectContaining({ name: "김강사", color: "#6366f1" }),
        "test-academy-id"
      );
    });

    it("email/phone/role/notes 포함 생성이 가능해야 한다", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/teachers?userId=test-user",
        {
          method: "POST",
          body: JSON.stringify({
            name: "김강사",
            color: "#6366f1",
            email: "teacher@test.com",
            phone: "010-1234-5678",
            role: "member",
            notes: "메모",
          }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(mockAddTeacher).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "김강사",
          color: "#6366f1",
          email: "teacher@test.com",
          phone: "010-1234-5678",
          role: "member",
          notes: "메모",
        }),
        "test-academy-id"
      );
    });

    it("name 또는 color 누락 시 400을 반환해야 한다", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/teachers?userId=test-user",
        {
          method: "POST",
          body: JSON.stringify({ name: "김강사" }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Name and color are required");
    });

    it("중복 강사 시 409를 반환해야 한다", async () => {
      mockAddTeacher.mockRejectedValueOnce(
        new AppError("TEACHER_NAME_DUPLICATE", { statusHint: 409 })
      );

      const request = new NextRequest(
        "http://localhost:3000/api/teachers?userId=test-user",
        {
          method: "POST",
          body: JSON.stringify({ name: "김강사", color: "#6366f1" }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe("TEACHER_NAME_DUPLICATE");
    });
  });

  describe("PUT /api/teachers/[id]", () => {
    it("강사 정보를 업데이트해야 한다", async () => {
      const teacherId = "test-teacher-id";
      const request = new NextRequest(
        `http://localhost:3000/api/teachers/${teacherId}?userId=test-user`,
        {
          method: "PUT",
          body: JSON.stringify({
            name: "김강사",
            color: "#6366f1",
            email: "teacher@test.com",
            phone: "010-1234-5678",
            role: "member",
            notes: "메모",
          }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await PUT(request, {
        params: Promise.resolve({ id: teacherId }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockUpdateTeacher).toHaveBeenCalledWith(
        teacherId,
        expect.objectContaining({
          email: "teacher@test.com",
          phone: "010-1234-5678",
          role: "member",
          notes: "메모",
        }),
        "test-academy-id"
      );
    });
  });
});
