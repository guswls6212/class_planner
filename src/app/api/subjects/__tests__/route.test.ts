import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET, POST } from "../route";

// Mock the RepositoryFactory
const mockSubjectRepository = {
  getAll: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

vi.mock("@/infrastructure/RepositoryFactory", () => ({
  createSubjectRepository: vi.fn(() => mockSubjectRepository),
}));

describe("/api/subjects API Routes", () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    // Reset mock implementations
    mockSubjectRepository.getAll.mockReset();
    mockSubjectRepository.getById.mockReset();
    mockSubjectRepository.create.mockReset();
    mockSubjectRepository.update.mockReset();
    mockSubjectRepository.delete.mockReset();
  });

  describe("GET /api/subjects", () => {
    it("모든 과목을 성공적으로 조회해야 한다", async () => {
      const mockSubjects = [
        {
          id: "550e8400-e29b-41d4-a716-446655440101",
          name: "수학",
          color: "#FF0000",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "550e8400-e29b-41d4-a716-446655440102",
          name: "영어",
          color: "#00FF00",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockSubjectRepository.getAll.mockResolvedValue(mockSubjects);

      const request = new NextRequest("http://localhost:3000/api/subjects");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(data.data[0].name).toBe("수학");
      expect(data.data[1].name).toBe("영어");
    });

    it("과목이 없을 때 빈 배열을 반환해야 한다", async () => {
      mockSubjectRepository.getAll.mockResolvedValue([]);

      const request = new NextRequest("http://localhost:3000/api/subjects");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual([]);
    });

    it("서비스 에러 시 빈 배열을 반환해야 한다", async () => {
      mockSubjectRepository.getAll.mockRejectedValue(
        new Error("데이터베이스 연결 실패")
      );

      const request = new NextRequest("http://localhost:3000/api/subjects");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual([]);
    });
  });

  describe("POST /api/subjects", () => {
    it("새로운 과목을 성공적으로 추가해야 한다", async () => {
      const newSubject = {
        id: "550e8400-e29b-41d4-a716-446655440103",
        name: "과학",
        color: "#0000FF",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // 중복 체크를 위해 빈 배열 반환 (중복 없음)
      mockSubjectRepository.getAll.mockResolvedValue([]);
      mockSubjectRepository.create.mockResolvedValue(newSubject);

      const request = new NextRequest("http://localhost:3000/api/subjects", {
        method: "POST",
        body: JSON.stringify({ name: "과학", color: "#0000FF" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe("과학");
      expect(mockSubjectRepository.getAll).toHaveBeenCalledTimes(1);
      expect(mockSubjectRepository.create).toHaveBeenCalledWith({
        name: "과학",
        color: "#0000FF",
      });
    });

    it("유효하지 않은 데이터로 과목 추가 시 400 에러를 반환해야 한다", async () => {
      const request = new NextRequest("http://localhost:3000/api/subjects", {
        method: "POST",
        body: JSON.stringify({ name: "", color: "#FF0000" }), // 빈 이름
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Name and color are required");
    });

    it("중복된 과목 이름으로 추가 시 500 에러를 반환해야 한다", async () => {
      mockSubjectRepository.create.mockRejectedValue(
        new Error("이미 존재하는 과목 이름입니다.")
      );

      const request = new NextRequest("http://localhost:3000/api/subjects", {
        method: "POST",
        body: JSON.stringify({ name: "수학", color: "#FF0000" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Failed to add subject");
    });

    it("잘못된 JSON 형식으로 요청 시 500 에러를 반환해야 한다", async () => {
      const request = new NextRequest("http://localhost:3000/api/subjects", {
        method: "POST",
        body: "invalid json",
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Failed to add subject");
    });
  });

  describe("DELETE /api/subjects", () => {
    it("과목을 성공적으로 삭제해야 한다", async () => {
      const subjectId = "550e8400-e29b-41d4-a716-44665544010123";
      mockSubjectRepository.delete.mockResolvedValue(undefined);

      const request = new NextRequest(
        `http://localhost:3000/api/subjects?id=${subjectId}`,
        {
          method: "DELETE",
        }
      );

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe("Subject deleted successfully");
      expect(mockSubjectRepository.delete).toHaveBeenCalledWith(subjectId);
    });

    it("ID가 없을 때 400 에러를 반환해야 한다", async () => {
      const request = new NextRequest("http://localhost:3000/api/subjects", {
        method: "DELETE",
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Subject ID is required");
    });

    it("존재하지 않는 과목 삭제 시 500 에러를 반환해야 한다", async () => {
      const subjectId = "non-existent-subject";
      mockSubjectRepository.delete.mockRejectedValue(
        new Error("과목을 찾을 수 없습니다.")
      );

      const request = new NextRequest(
        `http://localhost:3000/api/subjects?id=${subjectId}`,
        {
          method: "DELETE",
        }
      );

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Failed to delete subject");
    });
  });
});
