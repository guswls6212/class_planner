/**
 * Sessions ID API Routes 테스트
 */

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

import { DELETE, GET, PUT } from "../route";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

const mockRequireRole = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ academyId: "test-academy-id", role: "owner" })
);

vi.mock("../../../../../lib/auth/permissions", () => ({
  requireRole: mockRequireRole,
  requireOwnTeacher: vi.fn().mockResolvedValue("test-teacher-id"),
  pickAllowedFields: (body: Record<string, unknown>, fields: string[]) =>
    Object.fromEntries(Object.entries(body).filter(([k]) => fields.includes(k))),
}));

vi.mock("../../../../../lib/resolveAcademyId", () => ({
  resolveAcademyId: vi.fn().mockResolvedValue("test-academy-id"),
}));

// Mock all dependencies
vi.mock("../../../../../application/services/ServiceFactory", () => ({
  ServiceFactory: {
    createSessionService: vi.fn(() => ({
      getSessionById: vi.fn(() =>
        Promise.resolve({
          id: "test-id",
          subjectId: "subject-1",
          startsAt: "09:00",
          endsAt: "10:00",
          enrollmentIds: ["e-1"],
          weekday: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      ),
      updateSession: vi.fn(() => Promise.resolve({ id: "test-id" })),
      deleteSession: vi.fn(() => Promise.resolve()),
    })),
  },
}));

vi.mock("../../../../../lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Sessions ID API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRole.mockResolvedValue({ academyId: "test-academy-id", role: "owner" });
  });

  it("GET 요청이 에러 없이 처리되어야 한다", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/sessions/test-id?userId=owner-user",
      {
        headers: { origin: "http://localhost:3000" },
      }
    );

    const response = await GET(request, { params: Promise.resolve({ id: "test-id" }) });
    expect(response.status).toBe(200);
  });

  it("GET: userId 없으면 401을 반환해야 한다", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/sessions/test-id",
      {
        headers: { origin: "http://localhost:3000" },
      }
    );

    const response = await GET(request, { params: Promise.resolve({ id: "test-id" }) });
    expect(response.status).toBe(401);
  });

  it("GET: 다른 academy의 세션은 404를 반환해야 한다", async () => {
    const { ServiceFactory } = await import(
      "../../../../../application/services/ServiceFactory"
    );
    vi.mocked(ServiceFactory.createSessionService).mockReturnValueOnce({
      getSessionById: vi.fn().mockResolvedValue(null),
      updateSession: vi.fn(),
      deleteSession: vi.fn(),
      getAllSessions: vi.fn(),
      addSession: vi.fn(),
      updateSessionPosition: vi.fn(),
    } as never);

    const request = new NextRequest(
      "http://localhost:3000/api/sessions/other-academy-session?userId=owner-user",
      {
        headers: { origin: "http://localhost:3000" },
      }
    );

    const response = await GET(request, {
      params: Promise.resolve({ id: "other-academy-session" }),
    });
    expect(response.status).toBe(404);
  });

  it("PUT 요청이 에러 없이 처리되어야 한다 (owner)", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/sessions/test-id?userId=owner-user",
      {
        method: "PUT",
        headers: {
          origin: "http://localhost:3000",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          subjectId: "subject-1",
          startsAt: "09:00",
          endsAt: "10:00",
          enrollmentIds: ["e-1"],
          weekday: 0,
        }),
      }
    );

    const response = await PUT(request, { params: Promise.resolve({ id: "test-id" }) });
    expect(response.status).not.toBe(400);
  });

  it("PUT: userId 없으면 401을 반환해야 한다", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/sessions/test-id",
      {
        method: "PUT",
        headers: {
          origin: "http://localhost:3000",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          subjectId: "subject-1",
          startsAt: "09:00",
          endsAt: "10:00",
          enrollmentIds: ["e-1"],
          weekday: 0,
        }),
      }
    );

    const response = await PUT(request, { params: Promise.resolve({ id: "test-id" }) });
    expect(response.status).toBe(401);
  });

  it("PUT: member role은 403을 반환해야 한다", async () => {
    mockRequireRole.mockRejectedValueOnce(
      new AppError("FORBIDDEN", { statusHint: 403 })
    );

    const request = new NextRequest(
      "http://localhost:3000/api/sessions/test-id?userId=member-user",
      {
        method: "PUT",
        headers: {
          origin: "http://localhost:3000",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          subjectId: "subject-1",
          startsAt: "09:00",
          endsAt: "10:00",
          enrollmentIds: ["e-1"],
          weekday: 0,
        }),
      }
    );

    const response = await PUT(request, { params: Promise.resolve({ id: "test-id" }) });
    expect(response.status).toBe(403);
  });

  it("PUT: requireRole에 member를 허용 역할로 넘기지 않는다 (강사 세션 편집 차단)", async () => {
    // 실제 보호선 검증 — 허용 역할 목록에 member 가 없어야 함.
    // (mock reject 만 검증하면 route 가 ["owner","admin","member"] 로 넘겨도 통과하는 false-positive)
    const request = new NextRequest(
      "http://localhost:3000/api/sessions/test-id?userId=owner-user",
      {
        method: "PUT",
        headers: {
          origin: "http://localhost:3000",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          subjectId: "subject-1",
          startsAt: "09:00",
          endsAt: "10:00",
          enrollmentIds: ["e-1"],
          weekday: 0,
        }),
      }
    );

    await PUT(request, { params: Promise.resolve({ id: "test-id" }) });
    expect(mockRequireRole).toHaveBeenCalledWith("owner-user", ["owner", "admin"]);
  });

  it("DELETE 요청이 에러 없이 처리되어야 한다 (owner)", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/sessions/test-id?userId=owner-user",
      {
        method: "DELETE",
        headers: { origin: "http://localhost:3000" },
      }
    );

    const response = await DELETE(request, { params: Promise.resolve({ id: "test-id" }) });
    expect(response.status).toBe(200);
  });

  it("DELETE: userId 없으면 401을 반환해야 한다", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/sessions/test-id",
      {
        method: "DELETE",
        headers: { origin: "http://localhost:3000" },
      }
    );

    const response = await DELETE(request, { params: Promise.resolve({ id: "test-id" }) });
    expect(response.status).toBe(401);
  });

  it("DELETE: member role은 403을 반환해야 한다", async () => {
    mockRequireRole.mockRejectedValueOnce(
      new AppError("FORBIDDEN", { statusHint: 403 })
    );

    const request = new NextRequest(
      "http://localhost:3000/api/sessions/test-id?userId=member-user",
      {
        method: "DELETE",
        headers: { origin: "http://localhost:3000" },
      }
    );

    const response = await DELETE(request, { params: Promise.resolve({ id: "test-id" }) });
    expect(response.status).toBe(403);
  });

  it("잘못된 요청을 안전하게 처리해야 한다", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/sessions/test-id?userId=owner-user",
      {
        method: "PUT",
        headers: {
          origin: "http://localhost:3000",
          "content-type": "application/json",
        },
        body: "invalid json",
      }
    );

    expect(async () => {
      await PUT(request, { params: Promise.resolve({ id: "test-id" }) });
    }).not.toThrow();
  });

  it("존재하지 않는 세션을 안전하게 처리해야 한다", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/sessions/nonexistent?userId=owner-user",
      {
        headers: { origin: "http://localhost:3000" },
      }
    );

    expect(async () => {
      await GET(request, { params: Promise.resolve({ id: "nonexistent" }) });
    }).not.toThrow();
  });
});
