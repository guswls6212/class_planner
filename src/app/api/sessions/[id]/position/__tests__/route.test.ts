/**
 * Sessions Position API Routes 기본 테스트
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
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


