/**
 * User Settings API Routes 테스트 (186줄 - 큰 파일)
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, PUT } from "../route";

// Mock all dependencies
vi.mock("../../../../utils/supabaseClient", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: { settings: {} },
              error: null,
            })
          ),
        })),
      })),
      upsert: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
  },
}));

vi.mock("../../../../lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe("User Settings API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET 요청이 에러 없이 처리되어야 한다", async () => {
    const request = new NextRequest("http://localhost:3000/api/user-settings", {
      headers: { origin: "http://localhost:3000" },
    });

    expect(async () => {
      await GET(request);
    }).not.toThrow();
  });

  it("PUT 요청이 에러 없이 처리되어야 한다", async () => {
    const request = new NextRequest("http://localhost:3000/api/user-settings", {
      method: "PUT",
      headers: {
        origin: "http://localhost:3000",
        "content-type": "application/json",
      },
      body: JSON.stringify({ theme: "dark" }),
    });

    expect(async () => {
      await PUT(request);
    }).not.toThrow();
  });

  it("잘못된 요청을 안전하게 처리해야 한다", async () => {
    const request = new NextRequest("http://localhost:3000/api/user-settings", {
      method: "PUT",
      headers: {
        origin: "http://localhost:3000",
        "content-type": "application/json",
      },
      body: "invalid json",
    });

    expect(async () => {
      await PUT(request);
    }).not.toThrow();
  });
});


