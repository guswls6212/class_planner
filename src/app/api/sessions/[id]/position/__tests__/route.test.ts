/**
 * Sessions Position API Routes 테스트
 */

import { AppError } from "@/lib/errors/AppError";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
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

  it("PUT: userId 없으면 400을 반환해야 한다", async () => {
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
    expect(response.status).toBe(400);
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
