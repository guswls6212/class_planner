import { AppError } from "@/lib/errors/AppError";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// 세션 가드 스텁 — 라우트 로직 검증용. 실제 토큰 검증만 우회한다.
//   - 호출부가 userId 를 넘기면 그 값을 세션 사용자로 취급 (기존 단정 유지)
//   - 넘기지 않으면 "신원 없음" → 401. 라우트의 옛 계약은 "?userId= 없으면 400"
//     이었는데, 이제 신원 부재는 인증 실패이므로 401 이 맞다.
// 가드의 실제 정책은 아래 두 곳이 검증한다:
//   - src/lib/auth/__tests__/apiAuth.test.ts (가드 단위 — 401/403)
//   - src/app/api/__tests__/session-authz.integration.test.ts (라우트가 가드를 진짜 호출하는지)
vi.mock("@/lib/auth/apiAuth", () => {
  const unauthorized = () =>
    new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });

  return {
    requireSessionUser: vi.fn(
      async (_request: unknown, claimedUserId?: string | null) =>
        claimedUserId
          ? { ok: true as const, userId: claimedUserId }
          : { ok: false as const, response: unauthorized() }
    ),
    verifyBearerUser: vi.fn(async () => ({
      id: "test-user-id",
      email: "test@example.com",
    })),
    getAuthenticatedUserId: vi.fn(async () => "test-user-id"),
  };
});

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
            enrollmentIds: ["e-1"],
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

    it("enrollmentIds 빈 배열은 400을 반환한다", async () => {
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

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("enrollmentIds");
    });

    it("PUT enrollmentIds 빈 배열은 400을 반환한다", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/sessions/sess-1?userId=test-user",
        {
          method: "PUT",
          body: JSON.stringify({
            enrollmentIds: [],
            subjectId: "sub-1",
            weekday: 0,
            startsAt: "09:00",
            endsAt: "10:00",
          }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await idPUT(request, {
        params: Promise.resolve({ id: "sess-1" }),
      } as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("enrollmentIds");
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
            enrollmentIds: ["e-1"],
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
            enrollmentIds: ["e-1"],
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

    // 2026-05-29 정책 완화 (migration-partial-failure-resilience): 강사 미배정 세션 허용.
    // UI optional + DB nullable + PUT 허용 + 일간뷰 "강사 미배정" 과 일관. 익명 데이터 동기화 누락 해소.
    it("teacherId가 없어도 201 — 강사 미배정 세션 허용", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/sessions?userId=test-user",
        {
          method: "POST",
          body: JSON.stringify({
            subjectId: "sub-1",
            startsAt: "09:00",
            endsAt: "10:00",
            enrollmentIds: ["e-1"],
            weekday: 0,
            weekStartDate: "2026-04-27",
          }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(mockAddSession).toHaveBeenCalled();
    });
  });

  describe("POST /api/sessions — yPosition (사용자 보고 2026-05-16 lane 1 stack 회귀)", () => {
    // 회귀 사고: 멀티선택 복사 → 새로고침 → 모든 sessions lane 1 stack overlap.
    // RC: POST destructure 가 yPosition 무시 → Repository default 1 만 저장.
    // 본 test 는 그 회귀 방지.

    it("yPosition 이 number 면 addSession 에 전달된다", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/sessions?userId=test-user",
        {
          method: "POST",
          body: JSON.stringify({
            subjectId: "sub-1",
            startsAt: "09:00",
            endsAt: "10:00",
            enrollmentIds: ["e-1"],
            weekday: 0,
            weekStartDate: "2026-04-27",
            teacherId: "teacher-uuid-fixture",
            yPosition: 5,
          }),
          headers: { "Content-Type": "application/json" },
        }
      );
      await POST(request);
      expect(mockAddSession).toHaveBeenCalledWith(
        expect.objectContaining({ yPosition: 5 }),
        expect.any(String)
      );
    });

    it("yPosition 이 없으면 addSession 호출에 yPosition 키가 없다 (Repository default 1)", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/sessions?userId=test-user",
        {
          method: "POST",
          body: JSON.stringify({
            subjectId: "sub-1",
            startsAt: "09:00",
            endsAt: "10:00",
            enrollmentIds: ["e-1"],
            weekday: 0,
            weekStartDate: "2026-04-27",
            teacherId: "teacher-uuid-fixture",
          }),
          headers: { "Content-Type": "application/json" },
        }
      );
      await POST(request);
      const [sessionData] = mockAddSession.mock.calls[0];
      expect(sessionData).not.toHaveProperty("yPosition");
    });

    it("yPosition 이 non-number 면 무시 (NaN / string 가드)", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/sessions?userId=test-user",
        {
          method: "POST",
          body: JSON.stringify({
            subjectId: "sub-1",
            startsAt: "09:00",
            endsAt: "10:00",
            enrollmentIds: ["e-1"],
            weekday: 0,
            weekStartDate: "2026-04-27",
            teacherId: "teacher-uuid-fixture",
            yPosition: "invalid",
          }),
          headers: { "Content-Type": "application/json" },
        }
      );
      await POST(request);
      const [sessionData] = mockAddSession.mock.calls[0];
      expect(sessionData).not.toHaveProperty("yPosition");
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

  describe("POST /api/sessions — note fields", () => {
    const makePostRequest = (body: object, userId = "test-user") =>
      new NextRequest(`http://localhost:3000/api/sessions?userId=${userId}`, {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
      });

    const baseBody = {
      subjectId: "sub-1",
      startsAt: "09:00",
      endsAt: "10:00",
      enrollmentIds: ["e-1"],
      weekday: 0,
      weekStartDate: "2026-04-27",
      teacherId: "teacher-uuid-fixture",
    };

    it("member가 public_description 설정하면 403", async () => {
      mockRequireRole.mockResolvedValueOnce({ academyId: "test-academy-id", role: "member" });

      const request = makePostRequest({
        ...baseBody,
        public_description: "test note",
      });

      const response = await POST(request);
      expect(response.status).toBe(403);
    });

    it("owner가 public_description 설정하면 200", async () => {
      mockRequireRole.mockResolvedValueOnce({ academyId: "test-academy-id", role: "owner" });
      mockAddSession.mockResolvedValueOnce({
        ...SESSION_STUB,
        public_description: "test note",
      });

      const request = makePostRequest({
        ...baseBody,
        public_description: "test note",
      });

      const response = await POST(request);
      const data = await response.json();
      expect(response.status).toBe(201);
      expect(data.data.public_description).toBe("test note");
    });

    it("member가 internal_note 설정하면 200", async () => {
      mockRequireRole.mockResolvedValueOnce({ academyId: "test-academy-id", role: "member" });
      mockAddSession.mockResolvedValueOnce({
        ...SESSION_STUB,
        internal_note: "my note",
      });

      const request = makePostRequest({
        ...baseBody,
        internal_note: "my note",
      });

      const response = await POST(request);
      const data = await response.json();
      expect(response.status).toBe(201);
      expect(data.data.internal_note).toBe("my note");
    });

    it("member가 public_description을 null로 보내면 200 (명시적 null은 허용)", async () => {
      mockRequireRole.mockResolvedValueOnce({ academyId: "test-academy-id", role: "member" });
      mockAddSession.mockResolvedValueOnce(SESSION_STUB);

      const request = makePostRequest({
        ...baseBody,
        public_description: null,
      });

      const response = await POST(request);
      expect(response.status).toBe(201);
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
