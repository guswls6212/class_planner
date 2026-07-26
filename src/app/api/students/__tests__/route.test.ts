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

import { DELETE } from "../[id]/route";
import { GET, POST } from "../route";

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

// Use hoisted fn refs so individual tests can override behaviour
const mockGetAllStudents = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const mockAddStudent = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    id: "test-student-id",
    name: "김철수",
    createdAt: new Date().toISOString(),
  })
);
const mockUpdateStudent = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    id: "test-student-id",
    name: "김철수",
    createdAt: new Date().toISOString(),
  })
);
const mockDeleteStudent = vi.hoisted(() => vi.fn().mockResolvedValue(true));

vi.mock("@/application/services/ServiceFactory", () => ({
  ServiceFactory: {
    createStudentService: () => ({
      getAllStudents: mockGetAllStudents,
      addStudent: mockAddStudent,
      updateStudent: mockUpdateStudent,
      deleteStudent: mockDeleteStudent,
    }),
  },
}));

describe("/api/students API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to default successful behavior
    mockGetAllStudents.mockResolvedValue([]);
    mockAddStudent.mockResolvedValue({
      id: "test-student-id",
      name: "김철수",
      createdAt: new Date().toISOString(),
    });
    mockUpdateStudent.mockResolvedValue({
      id: "test-student-id",
      name: "김철수",
      createdAt: new Date().toISOString(),
    });
    mockDeleteStudent.mockResolvedValue(true);
    mockRequireRole.mockResolvedValue({ academyId: "test-academy-id", role: "owner" });
  });

  describe("GET /api/students", () => {
    it("올바른 응답 구조를 반환해야 한다", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/students?userId=test-user"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("success");
      expect(data).toHaveProperty("data");
    });
  });

  describe("POST /api/students", () => {
    it("올바른 응답 구조를 반환해야 한다", async () => {
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

      // 200: idempotent (PR #fix/local-first-id-reconcile) — server가 새로
      // 만들었든 기존 row를 반환했든 동일 status. 클라가 응답 id 비교 후 reconcile.
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("success");
      expect(data).toHaveProperty("data");
    });

    it("잘못된 요청 데이터에 대해 400 에러를 반환해야 한다", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/students?userId=test-user",
        {
          method: "POST",
          body: JSON.stringify({}), // name 누락
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe("STUDENT_NAME_REQUIRED");
    });

    it("member role은 POST에 403을 반환해야 한다", async () => {
      mockRequireRole.mockRejectedValueOnce(
        new AppError("FORBIDDEN", { statusHint: 403 })
      );

      const request = new NextRequest(
        "http://localhost:3000/api/students?userId=member-user",
        {
          method: "POST",
          body: JSON.stringify({ name: "김철수" }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await POST(request);
      expect(response.status).toBe(403);
    });

    it("중복 학생 시 AppError가 구조화된 에러 포맷(409)으로 반환되어야 한다", async () => {
      mockAddStudent.mockRejectedValueOnce(
        new AppError("STUDENT_NAME_DUPLICATE", { statusHint: 409 })
      );

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

      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe("STUDENT_NAME_DUPLICATE");
      expect(typeof data.error.message).toBe("string");
    });
  });

  describe("DELETE /api/students/[id]", () => {
    it("올바른 응답 구조를 반환해야 한다", async () => {
      const studentId = "550e8400-e29b-41d4-a716-446655440001";
      const userId = "test-user-id";
      const request = new NextRequest(
        `http://localhost:3000/api/students/${studentId}?userId=${userId}`,
        { method: "DELETE" }
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ id: studentId }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("success");
      expect(data).toHaveProperty("message");
    });

    it("member role은 DELETE에 403을 반환해야 한다", async () => {
      mockRequireRole.mockRejectedValueOnce(
        new AppError("FORBIDDEN", { statusHint: 403 })
      );

      const studentId = "550e8400-e29b-41d4-a716-446655440001";
      const request = new NextRequest(
        `http://localhost:3000/api/students/${studentId}?userId=member-user`,
        { method: "DELETE" }
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ id: studentId }),
      });
      expect(response.status).toBe(403);
    });

    it("userId가 없으면 401 에러를 반환해야 한다", async () => {
      const studentId = "550e8400-e29b-41d4-a716-446655440001";
      const request = new NextRequest(
        `http://localhost:3000/api/students/${studentId}`, // userId 누락
        { method: "DELETE" }
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ id: studentId }),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Unauthorized");
    });
  });
});
