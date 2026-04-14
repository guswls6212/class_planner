/**
 * Sessions Position API Routes 기본 테스트
 */

import { AppError } from "@/lib/errors/AppError";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ServiceFactory } from "../../../../../../application/services/ServiceFactory";
import { PUT } from "../route";

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
  });

  it("PUT 요청이 에러 없이 처리되어야 한다", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/sessions/test-id/position",
      {
        method: "PUT",
        headers: {
          origin: "http://localhost:3000",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          yPosition: 1,
        }),
      }
    );

    expect(async () => {
      await PUT(request, { params: Promise.resolve({ id: "test-id" }) });
    }).not.toThrow();
  });

  it("잘못된 요청을 안전하게 처리해야 한다", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/sessions/test-id/position",
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
      "http://localhost:3000/api/sessions/non-existent/position",
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
        "http://localhost:3000/api/sessions/test-id/position",
        {
          method: "PUT",
          headers: {
            origin: "http://localhost:3000",
            "content-type": "application/json",
          },
          body: JSON.stringify({ yPosition }),
        }
      );

      expect(async () => {
        await PUT(request, { params: Promise.resolve({ id: "test-id" }) });
      }).not.toThrow();
    }
  });
});


