import { Session } from "@/entities";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET, POST } from "../route";

// Mock the RepositoryFactory
const mockSessionRepository = {
  getAll: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

// Mock the ServiceFactory
const mockSessionService = {
  getAllSessions: vi.fn(),
  getSessionById: vi.fn(),
  addSession: vi.fn(),
  updateSession: vi.fn(),
  deleteSession: vi.fn(),
};

vi.mock("@/infrastructure/RepositoryFactory", () => ({
  createSessionRepository: vi.fn(() => mockSessionRepository),
}));

vi.mock("@/application/services/ServiceFactory", () => ({
  ServiceFactory: {
    createSessionService: vi.fn(() => mockSessionService),
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

describe("/api/sessions API Routes", () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    // Reset mock implementations
    mockSessionRepository.getAll.mockReset();
    mockSessionRepository.getById.mockReset();
    mockSessionRepository.create.mockReset();
    mockSessionRepository.update.mockReset();
    mockSessionRepository.delete.mockReset();

    mockSessionService.getAllSessions.mockReset();
    mockSessionService.getSessionById.mockReset();
    mockSessionService.addSession.mockReset();
    mockSessionService.updateSession.mockReset();
    mockSessionService.deleteSession.mockReset();
  });

  describe("GET /api/sessions", () => {
    it("모든 세션을 성공적으로 조회해야 한다", async () => {
      const mockSessions: Session[] = [
        {
          id: "550e8400-e29b-41d4-a716-446655440201",
          subjectId: "550e8400-e29b-41d4-a716-446655440101",
          startsAt: new Date("2024-01-01T09:00:00"),
          endsAt: new Date("2024-01-01T10:00:00"),
          enrollmentIds: ["550e8400-e29b-41d4-a716-446655440301"],
          weekday: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "550e8400-e29b-41d4-a716-446655440202",
          subjectId: "550e8400-e29b-41d4-a716-446655440102",
          startsAt: new Date("2024-01-01T10:00:00"),
          endsAt: new Date("2024-01-01T11:00:00"),
          enrollmentIds: ["550e8400-e29b-41d4-a716-446655440302"],
          weekday: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockSessionService.getAllSessions.mockResolvedValue(mockSessions);

      const request = new NextRequest("http://localhost:3000/api/sessions");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(data.data[0].subjectId).toBe(
        "550e8400-e29b-41d4-a716-446655440101"
      );
      expect(data.data[1].subjectId).toBe(
        "550e8400-e29b-41d4-a716-446655440102"
      );
    });

    it("세션이 없을 때 빈 배열을 반환해야 한다", async () => {
      mockSessionService.getAllSessions.mockResolvedValue([]);

      const request = new NextRequest("http://localhost:3000/api/sessions");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual([]);
    });

    it("서비스 에러 시 500 에러를 반환해야 한다", async () => {
      mockSessionRepository.getAll.mockRejectedValue(
        new Error("데이터베이스 연결 실패")
      );

      const request = new NextRequest("http://localhost:3000/api/sessions");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Failed to fetch sessions");
    });
  });

  describe("POST /api/sessions", () => {
    it("새로운 세션을 성공적으로 추가해야 한다", async () => {
      const newSession: Session = {
        id: "session-new",
        subjectId: "550e8400-e29b-41d4-a716-446655440101",
        startsAt: new Date("2024-01-01T09:00:00"),
        endsAt: new Date("2024-01-01T10:00:00"),
        enrollmentIds: ["550e8400-e29b-41d4-a716-446655440301"],
        weekday: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockSessionRepository.create.mockResolvedValue(newSession);

      const request = new NextRequest("http://localhost:3000/api/sessions", {
        method: "POST",
        body: JSON.stringify({
          subjectId: "550e8400-e29b-41d4-a716-446655440101",
          startsAt: "2024-01-01T09:00:00",
          endsAt: "2024-01-01T10:00:00",
          enrollmentIds: ["550e8400-e29b-41d4-a716-446655440301"],
          weekday: 0,
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.subjectId).toBe("550e8400-e29b-41d4-a716-446655440101");
      expect(mockSessionRepository.create).toHaveBeenCalledWith({
        subjectId: "550e8400-e29b-41d4-a716-446655440101",
        startsAt: new Date("2024-01-01T09:00:00"),
        endsAt: new Date("2024-01-01T10:00:00"),
        enrollmentIds: ["550e8400-e29b-41d4-a716-446655440301"],
        weekday: 0,
      });
    });

    it("유효하지 않은 데이터로 세션 추가 시 400 에러를 반환해야 한다", async () => {
      const request = new NextRequest("http://localhost:3000/api/sessions", {
        method: "POST",
        body: JSON.stringify({
          subjectId: "",
          startsAt: "2024-01-01T09:00:00",
          endsAt: "2024-01-01T10:00:00",
          enrollmentIds: ["550e8400-e29b-41d4-a716-446655440301"],
        }), // 빈 subjectId
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Missing required fields for session");
    });

    it("잘못된 JSON 형식으로 요청 시 500 에러를 반환해야 한다", async () => {
      const request = new NextRequest("http://localhost:3000/api/sessions", {
        method: "POST",
        body: "invalid json",
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Failed to add session");
    });
  });

  describe("DELETE /api/sessions", () => {
    it("세션을 성공적으로 삭제해야 한다", async () => {
      const sessionId = "550e8400-e29b-41d4-a716-44665544020123";
      mockSessionRepository.delete.mockResolvedValue(undefined);

      const request = new NextRequest(
        `http://localhost:3000/api/sessions?id=${sessionId}`,
        {
          method: "DELETE",
        }
      );

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe("Session deleted successfully");
      expect(mockSessionRepository.delete).toHaveBeenCalledWith(sessionId);
    });

    it("ID가 없을 때 400 에러를 반환해야 한다", async () => {
      const request = new NextRequest("http://localhost:3000/api/sessions", {
        method: "DELETE",
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Session ID is required");
    });

    it("존재하지 않는 세션 삭제 시 500 에러를 반환해야 한다", async () => {
      const sessionId = "non-existent-session";
      mockSessionRepository.delete.mockRejectedValue(
        new Error("세션을 찾을 수 없습니다.")
      );

      const request = new NextRequest(
        `http://localhost:3000/api/sessions?id=${sessionId}`,
        {
          method: "DELETE",
        }
      );

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Failed to delete session");
    });
  });
});
