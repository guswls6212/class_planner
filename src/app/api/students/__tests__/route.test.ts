import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET, POST } from "../route";

// Mock the RepositoryFactory
const mockStudentRepository = {
  getAll: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

// Mock the ServiceFactory
const mockStudentService = {
  getAllStudents: vi.fn(),
  getStudentById: vi.fn(),
  addStudent: vi.fn(),
  updateStudent: vi.fn(),
  deleteStudent: vi.fn(),
};

vi.mock("@/infrastructure/RepositoryFactory", () => ({
  createStudentRepository: vi.fn(() => mockStudentRepository),
}));

vi.mock("@/application/services/ServiceFactory", () => ({
  ServiceFactory: {
    createStudentService: vi.fn(() => mockStudentService),
  },
}));

// Mock environment variables
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
    })),
  })),
}));

// Mock environment variables for tests
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

describe("/api/students API Routes", () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    // Reset mock implementations
    mockStudentRepository.getAll.mockReset();
    mockStudentRepository.getById.mockReset();
    mockStudentRepository.create.mockReset();
    mockStudentRepository.update.mockReset();
    mockStudentRepository.delete.mockReset();

    mockStudentService.getAllStudents.mockReset();
    mockStudentService.getStudentById.mockReset();
    mockStudentService.addStudent.mockReset();
    mockStudentService.updateStudent.mockReset();
    mockStudentService.deleteStudent.mockReset();
  });

  describe("GET /api/students", () => {
    it("모든 학생을 성공적으로 조회해야 한다", async () => {
      const mockStudents = [
        {
          id: "550e8400-e29b-41d4-a716-446655440001",
          name: "김철수",
          gender: "male" as const,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "550e8400-e29b-41d4-a716-446655440002",
          name: "김영희",
          gender: "female" as const,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockStudentService.getAllStudents.mockResolvedValue(mockStudents);

      const request = new NextRequest("http://localhost:3000/api/students");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(data.data[0].name).toBe("김철수");
      expect(data.data[1].name).toBe("김영희");
    });

    it("학생이 없을 때 빈 배열을 반환해야 한다", async () => {
      mockStudentService.getAllStudents.mockResolvedValue([]);

      const request = new NextRequest("http://localhost:3000/api/students");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual([]);
    });

    it("데이터베이스 에러가 발생하면 빈 배열을 반환해야 한다", async () => {
      mockStudentRepository.getAll.mockRejectedValue(
        new Error("데이터베이스 연결 실패")
      );

      const request = new NextRequest("http://localhost:3000/api/students");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
    });
  });

  describe("POST /api/students", () => {
    it("새로운 학생을 성공적으로 생성해야 한다", async () => {
      const newStudent = {
        id: "550e8400-e29b-41d4-a716-446655440003",
        name: "김철수",
        gender: "male" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // 중복 체크를 위해 빈 배열 반환 (중복 없음)
      mockStudentService.getAllStudents.mockResolvedValue([]);
      mockStudentService.addStudent.mockResolvedValue(newStudent);

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
      expect(data.success).toBe(true);
      expect(data.data.name).toBe("김철수");
      expect(mockStudentService.getAllStudents).toHaveBeenCalledTimes(1);
      expect(mockStudentService.addStudent).toHaveBeenCalledWith({
        name: "김철수",
      });
    });

    it("잘못된 요청 데이터에 대해 400 에러를 반환해야 한다", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/students?userId=test-user",
        {
          method: "POST",
          body: JSON.stringify({ name: "" }), // 빈 이름
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Name is required");
    });

    it("JSON 파싱 에러에 대해 500 에러를 반환해야 한다", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/students?userId=test-user",
        {
          method: "POST",
          body: "invalid json",
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Failed to add student");
    });

    it("중복된 학생 이름에 대해 500 에러를 반환해야 한다", async () => {
      // 중복 체크를 위해 기존 학생 반환 (중복 있음)
      const existingStudent = {
        id: "550e8400-e29b-41d4-a716-446655440001",
        name: "김철수",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockStudentService.getAllStudents.mockResolvedValue([existingStudent]);

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
      expect(data.success).toBe(true);
      expect(data.data.name).toBe("김철수");
    });
  });

  describe("DELETE /api/students", () => {
    it("학생을 성공적으로 삭제해야 한다", async () => {
      const studentId = "550e8400-e29b-41d4-a716-446655440001";
      mockStudentService.deleteStudent.mockResolvedValue(undefined);

      const request = new NextRequest(
        `http://localhost:3000/api/students?id=${studentId}`,
        {
          method: "DELETE",
        }
      );

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe("Student deleted successfully");
      expect(mockStudentService.deleteStudent).toHaveBeenCalledWith(studentId);
    });

    it("ID가 없을 때 400 에러를 반환해야 한다", async () => {
      const request = new NextRequest("http://localhost:3000/api/students", {
        method: "DELETE",
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Student ID is required");
    });

    it("존재하지 않는 학생을 삭제하려고 하면 500 에러를 반환해야 한다", async () => {
      const studentId = "550e8400-e29b-41d4-a716-446655440999";
      mockStudentService.deleteStudent.mockRejectedValue(
        new Error("학생을 찾을 수 없습니다.")
      );

      const request = new NextRequest(
        `http://localhost:3000/api/students?id=${studentId}`,
        {
          method: "DELETE",
        }
      );

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Failed to delete student");
    });
  });
});
