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

    it("userId가 없으면 401 에러를 반환해야 한다", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/enrollments"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Unauthorized");
    });
  });

  describe("POST /api/enrollments", () => {
    // status 200: idempotent — repo가 새로 만들었든 (student_id, subject_id) 충돌로
    // 기존 row를 반환했든 동일 응답. 클라이언트는 data.id로 localStorage reconcile.
    it("올바른 응답 구조를 반환해야 한다 (idempotent 200)", async () => {
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

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("data");
      expect(data.data).toHaveProperty("id");
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

    it("userId가 없으면 401 에러를 반환해야 한다", async () => {
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

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Unauthorized");
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

    it("userId가 없으면 401 에러를 반환해야 한다", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/enrollments?id=test-enrollment-id",
        { method: "DELETE" }
      );

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Unauthorized");
    });
  });
});
