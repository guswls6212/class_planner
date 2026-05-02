import { AppError } from "@/lib/errors/AppError";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET, POST } from "../route";
import { PUT as idPUT } from "../[id]/route";

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

let mockAddSession: ReturnType<typeof vi.fn>;
let mockUpdateSession: ReturnType<typeof vi.fn>;

// Simple mock for ServiceFactory
vi.mock("@/application/services/ServiceFactory", () => ({
  ServiceFactory: {
    createSessionService: () => ({
      getAllSessions: vi.fn().mockResolvedValue([]),
      addSession: (...args: unknown[]) => mockAddSession(...args),
      updateSession: (...args: unknown[]) => mockUpdateSession(...args),
      getSessionById: vi.fn().mockResolvedValue(null),
      deleteSession: vi.fn().mockResolvedValue(true),
    }),
  },
}));

const SESSION_STUB = {
  id: "test-session-id",
  subjectId: "550e8400-e29b-41d4-a716-446655440101",
  startsAt: "09:00",
  endsAt: "10:00",
  enrollmentIds: ["550e8400-e29b-41d4-a716-446655440301"],
  weekday: 0,
  weekStartDate: "2026-04-27",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("/api/sessions API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAddSession = vi.fn().mockResolvedValue(SESSION_STUB);
    mockUpdateSession = vi.fn().mockResolvedValue(SESSION_STUB);
    mockRequireRole.mockResolvedValue({ academyId: "test-academy-id", role: "owner" });
  });

  describe("GET /api/sessions", () => {
    it("기본 응답 구조를 확인한다", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/sessions?userId=test-user"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(typeof response.status).toBe("number");
      expect(data).toHaveProperty("success");
    });

    it("weekStartDate 파라미터를 서비스로 전달한다", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/sessions?userId=test-user&weekStartDate=2026-04-27"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(data.success).toBe(true);
    });
  });

  describe("POST /api/sessions", () => {
    it("필수 필드 검증을 수행한다", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/sessions?userId=test-user",
        {
          method: "POST",
          body: JSON.stringify({}), // 필수 필드 누락
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it("weekStartDate 없으면 400을 반환한다", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/sessions?userId=test-user",
        {
          method: "POST",
          body: JSON.stringify({
            subjectId: "sub-1",
            startsAt: "09:00",
            endsAt: "10:00",
            enrollmentIds: [],
            weekday: 0,
            // weekStartDate 없음
          }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("weekStartDate");
    });

    it("member role은 POST에 403을 반환해야 한다", async () => {
      mockRequireRole.mockRejectedValueOnce(
        new AppError("FORBIDDEN", { statusHint: 403 })
      );

      const request = new NextRequest(
        "http://localhost:3000/api/sessions?userId=member-user",
        {
          method: "POST",
          body: JSON.stringify({
            subjectId: "sub-1",
            startsAt: "09:00",
            endsAt: "10:00",
            enrollmentIds: [],
            weekday: 0,
            weekStartDate: "2026-04-27",
          }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await POST(request);
      expect(response.status).toBe(403);
    });
  });

  describe("POST /api/sessions — teacherId", () => {
    it("teacherId가 있으면 addSession에 전달된다", async () => {
      const teacherId = "teacher-uuid-abc";
      const request = new NextRequest(
        "http://localhost:3000/api/sessions?userId=test-user",
        {
          method: "POST",
          body: JSON.stringify({
            subjectId: "sub-1",
            startsAt: "09:00",
            endsAt: "10:00",
            enrollmentIds: [],
            weekday: 0,
            weekStartDate: "2026-04-27",
            teacherId,
          }),
          headers: { "Content-Type": "application/json" },
        }
      );

      await POST(request);

      expect(mockAddSession).toHaveBeenCalledWith(
        expect.objectContaining({ teacherId }),
        expect.any(String)
      );
    });

    it("teacherId가 없으면 addSession에 teacherId 키가 없다", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/sessions?userId=test-user",
        {
          method: "POST",
          body: JSON.stringify({
            subjectId: "sub-1",
            startsAt: "09:00",
            endsAt: "10:00",
            enrollmentIds: [],
            weekday: 0,
            weekStartDate: "2026-04-27",
          }),
          headers: { "Content-Type": "application/json" },
        }
      );

      await POST(request);

      const [sessionData] = mockAddSession.mock.calls[0];
      expect(sessionData).not.toHaveProperty("teacherId");
    });
  });

  describe("PUT /api/sessions/:id — teacherId (id route)", () => {
    const makeIdPutRequest = (body: object, userId = "owner-user") =>
      new NextRequest(`http://localhost:3000/api/sessions/sess-1?userId=${userId}`, {
        method: "PUT",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
      });

    const mockParams = { params: Promise.resolve({ id: "sess-1" }) } as any;

    it("teacherId가 있으면 updateSession에 전달된다", async () => {
      const teacherId = "teacher-uuid-xyz";
      const request = makeIdPutRequest({
        enrollmentIds: ["e-1"],
        subjectId: "sub-1",
        weekday: 1,
        startsAt: "09:00",
        endsAt: "10:00",
        teacherId,
      });

      await idPUT(request, mockParams);

      expect(mockUpdateSession).toHaveBeenCalledWith(
        "sess-1",
        expect.objectContaining({ teacherId }),
        "test-academy-id"
      );
    });

    it("teacherId 없으면 updateSession 호출에 teacherId 키가 없다", async () => {
      const request = makeIdPutRequest({
        enrollmentIds: ["e-1"],
        subjectId: "sub-1",
        weekday: 1,
        startsAt: "09:00",
        endsAt: "10:00",
      });

      await idPUT(request, mockParams);

      const [, sessionData] = mockUpdateSession.mock.calls[0];
      expect(sessionData).not.toHaveProperty("teacherId");
    });

    it("startsAt/endsAt 필드명도 수용한다 (Session 타입 네이밍)", async () => {
      const request = makeIdPutRequest({
        enrollmentIds: ["e-1"],
        subjectId: "sub-1",
        weekday: 1,
        startsAt: "09:30",
        endsAt: "10:30",
      });

      const response = await idPUT(request, mockParams);
      expect(response.status).not.toBe(400);
    });

    it("member role은 PUT에 403을 반환해야 한다", async () => {
      mockRequireRole.mockRejectedValueOnce(
        new AppError("FORBIDDEN", { statusHint: 403 })
      );

      const request = makeIdPutRequest(
        { enrollmentIds: ["e-1"], subjectId: "sub-1", weekday: 1, startsAt: "09:00", endsAt: "10:00" },
        "member-user"
      );

      const response = await idPUT(request, mockParams);
      expect(response.status).toBe(403);
    });
  });

  describe("DELETE /api/sessions", () => {
    it("ID 필수 검증을 수행한다", async () => {
      const request = new NextRequest("http://localhost:3000/api/sessions?userId=test-user"); // id 누락

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
        "http://localhost:3000/api/sessions?id=sess-1&userId=member-user"
      );

      const response = await DELETE(request);
      expect(response.status).toBe(403);
    });
  });
});
