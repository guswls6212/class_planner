/**
 * Sessions Position API Routes 테스트
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

import { ServiceFactory } from "../../../../../../application/services/ServiceFactory";
import { PUT } from "../route";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

const mockRequireRole = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ academyId: "test-academy-id", role: "owner" })
);

vi.mock("../../../../../../lib/auth/permissions", () => ({
  requireRole: mockRequireRole,
  requireOwnTeacher: vi.fn().mockResolvedValue("test-teacher-id"),
  pickAllowedFields: (body: Record<string, unknown>, fields: string[]) =>
    Object.fromEntries(Object.entries(body).filter(([k]) => fields.includes(k))),
}));

// Mock all dependencies
vi.mock("../../../../../../application/services/ServiceFactory", () => ({
  ServiceFactory: {
    createSessionService: vi.fn(() => ({
      updateSessionPosition: vi.fn(() => Promise.resolve({ id: "test-id" })),
    })),
  },
}));

vi.mock("../../../../../../lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Sessions Position API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRole.mockResolvedValue({ academyId: "test-academy-id", role: "owner" });
  });

  it("PUT 요청이 에러 없이 처리되어야 한다 (owner)", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/sessions/test-id/position?userId=owner-user",
      {
        method: "PUT",
        headers: {
          origin: "http://localhost:3000",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          weekday: 1,
          time: "09:00",
          endTime: "10:00",
          yPosition: 1,
        }),
      }
    );

    const response = await PUT(request, { params: Promise.resolve({ id: "test-id" }) });
    expect(response.status).toBe(200);
  });

  it("PUT: userId 없으면 401을 반환해야 한다", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/sessions/test-id/position",
      {
        method: "PUT",
        headers: {
          origin: "http://localhost:3000",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          weekday: 1,
          time: "09:00",
          endTime: "10:00",
          yPosition: 1,
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
      "http://localhost:3000/api/sessions/test-id/position?userId=member-user",
      {
        method: "PUT",
        headers: {
          origin: "http://localhost:3000",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          weekday: 1,
          time: "09:00",
          endTime: "10:00",
          yPosition: 1,
        }),
      }
    );

    const response = await PUT(request, { params: Promise.resolve({ id: "test-id" }) });
    expect(response.status).toBe(403);
  });

  it("잘못된 요청을 안전하게 처리해야 한다", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/sessions/test-id/position?userId=owner-user",
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

  it("SESSION_NOT_FOUND AppError 시 404와 구조화된 에러 포맷을 반환해야 한다", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(ServiceFactory.createSessionService).mockReturnValueOnce({
      updateSessionPosition: vi.fn().mockRejectedValue(
        new AppError("SESSION_NOT_FOUND", { statusHint: 404 })
      ),
      getAllSessions: vi.fn(),
      getSessionById: vi.fn(),
      addSession: vi.fn(),
      updateSession: vi.fn(),
      deleteSession: vi.fn(),
    } as any);

    const request = new NextRequest(
      "http://localhost:3000/api/sessions/non-existent/position?userId=owner-user",
      {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ weekday: 1, time: "09:00", endTime: "10:00" }),
      }
    );

    const response = await PUT(request, {
      params: Promise.resolve({ id: "non-existent" }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe("SESSION_NOT_FOUND");
    expect(typeof data.error.message).toBe("string");
  });

  it("다양한 yPosition 값을 처리해야 한다", async () => {
    const positions = [0, 1, 2, 3, 4, 5];

    for (const yPosition of positions) {
      const request = new NextRequest(
        "http://localhost:3000/api/sessions/test-id/position?userId=owner-user",
        {
          method: "PUT",
          headers: {
            origin: "http://localhost:3000",
            "content-type": "application/json",
          },
          body: JSON.stringify({ weekday: 1, time: "09:00", endTime: "10:00", yPosition }),
        }
      );

      expect(async () => {
        await PUT(request, { params: Promise.resolve({ id: "test-id" }) });
      }).not.toThrow();
    }
  });
});
