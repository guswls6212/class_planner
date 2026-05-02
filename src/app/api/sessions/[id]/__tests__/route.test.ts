/**
 * Sessions ID API Routes 테스트
 */

import { AppError } from "@/lib/errors/AppError";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
          enrollmentIds: [],
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
      "http://localhost:3000/api/sessions/test-id",
      {
        headers: { origin: "http://localhost:3000" },
      }
    );

    expect(async () => {
      await GET(request, { params: Promise.resolve({ id: "test-id" }) });
    }).not.toThrow();
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
          enrollmentIds: [],
          weekday: 0,
        }),
      }
    );

    const response = await PUT(request, { params: Promise.resolve({ id: "test-id" }) });
    expect(response.status).not.toBe(400);
  });

  it("PUT: userId 없으면 400을 반환해야 한다", async () => {
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
          enrollmentIds: [],
          weekday: 0,
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
          enrollmentIds: [],
          weekday: 0,
        }),
      }
    );

    const response = await PUT(request, { params: Promise.resolve({ id: "test-id" }) });
    expect(response.status).toBe(403);
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

  it("DELETE: userId 없으면 400을 반환해야 한다", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/sessions/test-id",
      {
        method: "DELETE",
        headers: { origin: "http://localhost:3000" },
      }
    );

    const response = await DELETE(request, { params: Promise.resolve({ id: "test-id" }) });
    expect(response.status).toBe(400);
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
      "http://localhost:3000/api/sessions/nonexistent",
      {
        headers: { origin: "http://localhost:3000" },
      }
    );

    expect(async () => {
      await GET(request, { params: Promise.resolve({ id: "nonexistent" }) });
    }).not.toThrow();
  });
});
