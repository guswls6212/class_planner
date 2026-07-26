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
    createSubjectService: () => ({
      getAllSubjects: vi.fn().mockResolvedValue([]),
      addSubject: vi.fn().mockResolvedValue({
        id: "test-subject-id",
        name: "수학",
        color: "#ff0000",
        createdAt: new Date().toISOString(),
      }),
      updateSubject: vi.fn().mockResolvedValue({
        id: "test-subject-id",
        name: "수학",
        color: "#ff0000",
        createdAt: new Date().toISOString(),
      }),
      deleteSubject: vi.fn().mockResolvedValue(true),
    }),
  },
}));

describe("/api/subjects API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRole.mockResolvedValue({ academyId: "test-academy-id", role: "owner" });
  });

  describe("GET /api/subjects", () => {
    it("기본 응답 구조를 확인한다", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/subjects?userId=test-user"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("success");
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });

    it("userId가 없으면 401을 반환한다", async () => {
      const request = new NextRequest("http://localhost:3000/api/subjects");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });
  });

  describe("POST /api/subjects", () => {
    it("필수 필드 검증을 수행한다", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/subjects?userId=test-user",
        {
          method: "POST",
          body: JSON.stringify({}), // name, color 누락
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain("required");
    });

    it("member role은 POST에 403을 반환해야 한다", async () => {
      mockRequireRole.mockRejectedValueOnce(
        new AppError("FORBIDDEN", { statusHint: 403 })
      );

      const request = new NextRequest(
        "http://localhost:3000/api/subjects?userId=member-user",
        {
          method: "POST",
          body: JSON.stringify({ name: "수학", color: "#ff0000" }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await POST(request);
      expect(response.status).toBe(403);
    });
  });

  describe("DELETE /api/subjects", () => {
    it("ID 필수 검증을 수행한다", async () => {
      const request = new NextRequest("http://localhost:3000/api/subjects"); // id 누락

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Unauthorized");
    });

    it("member role은 DELETE에 403을 반환해야 한다", async () => {
      mockRequireRole.mockRejectedValueOnce(
        new AppError("FORBIDDEN", { statusHint: 403 })
      );

      const request = new NextRequest(
        "http://localhost:3000/api/subjects?id=subject-1&userId=member-user"
      );

      const response = await DELETE(request);
      expect(response.status).toBe(403);
    });
  });
});
