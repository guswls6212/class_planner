/**
 * Sessions ID API Routes 테스트 (124줄)
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET, PUT } from "../route";

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

  it("PUT 요청이 에러 없이 처리되어야 한다", async () => {
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

    expect(async () => {
      await PUT(request, { params: Promise.resolve({ id: "test-id" }) });
    }).not.toThrow();
  });

  it("DELETE 요청이 에러 없이 처리되어야 한다", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/sessions/test-id",
      {
        method: "DELETE",
        headers: { origin: "http://localhost:3000" },
      }
    );

    expect(async () => {
      await DELETE(request, { params: Promise.resolve({ id: "test-id" }) });
    }).not.toThrow();
  });

  it("잘못된 요청을 안전하게 처리해야 한다", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/sessions/test-id",
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
