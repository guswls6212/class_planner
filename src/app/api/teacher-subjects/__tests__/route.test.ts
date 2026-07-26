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

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

vi.mock("@/lib/resolveAcademyId", () => ({
  resolveAcademyId: vi.fn().mockResolvedValue("test-academy-id"),
}));

const mockResolveAcademyMembership = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ academyId: "test-academy-id", role: "owner" })
);
const mockRequireOwnTeacher = vi.hoisted(() => vi.fn().mockResolvedValue("teacher-1"));

vi.mock("@/lib/resolveAcademyMembership", () => ({
  resolveAcademyMembership: mockResolveAcademyMembership,
}));

vi.mock("@/lib/auth/permissions", () => ({
  requireOwnTeacher: mockRequireOwnTeacher,
  requireRole: vi.fn().mockResolvedValue({ academyId: "test-academy-id", role: "owner" }),
  pickAllowedFields: (body: Record<string, unknown>, fields: string[]) =>
    Object.fromEntries(Object.entries(body).filter(([k]) => fields.includes(k))),
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
    mockResolveAcademyMembership.mockResolvedValue({ academyId: "test-academy-id", role: "owner" });
    mockRequireOwnTeacher.mockResolvedValue("teacher-1");
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
    it("owner/admin이 강사-과목 연결을 생성해야 한다", async () => {
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

    it("member role은 자신의 teacherId로 POST할 수 있다", async () => {
      mockResolveAcademyMembership.mockResolvedValueOnce({ academyId: "test-academy-id", role: "member" });
      mockRequireOwnTeacher.mockResolvedValueOnce("teacher-1");

      const request = new NextRequest(
        "http://localhost:3000/api/teacher-subjects?userId=member-user",
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
      expect(mockRequireOwnTeacher).toHaveBeenCalledWith("member-user", "teacher-1");
    });

    it("member role이 다른 사람의 teacherId로 POST하면 403이 된다", async () => {
      mockResolveAcademyMembership.mockResolvedValueOnce({ academyId: "test-academy-id", role: "member" });
      mockRequireOwnTeacher.mockRejectedValueOnce(
        new AppError("FORBIDDEN", { statusHint: 403 })
      );

      const request = new NextRequest(
        "http://localhost:3000/api/teacher-subjects?userId=member-user",
        {
          method: "POST",
          body: JSON.stringify({ teacherId: "other-teacher", subjectId: "subject-1" }),
          headers: { "Content-Type": "application/json" },
        }
      );
      const response = await POST(request);
      expect(response.status).toBe(403);
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
    it("owner/admin이 강사-과목 연결을 삭제해야 한다", async () => {
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
      expect(mockRemoveTeacherSubject).toHaveBeenCalledWith("teacher-1", "subject-1", "test-academy-id");
    });

    it("member role은 자신의 teacherId로 DELETE할 수 있다", async () => {
      mockResolveAcademyMembership.mockResolvedValueOnce({ academyId: "test-academy-id", role: "member" });
      mockRequireOwnTeacher.mockResolvedValueOnce("teacher-1");

      const request = new NextRequest(
        "http://localhost:3000/api/teacher-subjects?userId=member-user",
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
      expect(mockRequireOwnTeacher).toHaveBeenCalledWith("member-user", "teacher-1");
    });

    it("member role이 다른 사람의 teacherId로 DELETE하면 403이 된다", async () => {
      mockResolveAcademyMembership.mockResolvedValueOnce({ academyId: "test-academy-id", role: "member" });
      mockRequireOwnTeacher.mockRejectedValueOnce(
        new AppError("FORBIDDEN", { statusHint: 403 })
      );

      const request = new NextRequest(
        "http://localhost:3000/api/teacher-subjects?userId=member-user",
        {
          method: "DELETE",
          body: JSON.stringify({ teacherId: "other-teacher", subjectId: "subject-1" }),
          headers: { "Content-Type": "application/json" },
        }
      );
      const response = await DELETE(request);
      expect(response.status).toBe(403);
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
