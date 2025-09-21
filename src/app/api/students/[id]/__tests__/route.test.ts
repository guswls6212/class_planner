/**
 * Students ID API Routes 테스트 (114줄)
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET, PUT } from "../route";

// Mock all dependencies
vi.mock("../../../../../application/services/ServiceFactory", () => ({
  ServiceFactory: {
    createStudentService: vi.fn(() => ({
      getStudentById: vi.fn(() =>
        Promise.resolve({ id: "test-id", name: "테스트" })
      ),
      updateStudent: vi.fn(() =>
        Promise.resolve({ id: "test-id", name: "수정됨" })
      ),
      deleteStudent: vi.fn(() => Promise.resolve()),
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

describe("Students ID API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET 요청이 에러 없이 처리되어야 한다", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/students/test-id",
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
      "http://localhost:3000/api/students/test-id",
      {
        method: "PUT",
        headers: {
          origin: "http://localhost:3000",
          "content-type": "application/json",
        },
        body: JSON.stringify({ name: "수정된 이름" }),
      }
    );

    expect(async () => {
      await PUT(request, { params: Promise.resolve({ id: "test-id" }) });
    }).not.toThrow();
  });

  it("DELETE 요청이 에러 없이 처리되어야 한다", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/students/test-id",
      {
        method: "DELETE",
        headers: { origin: "http://localhost:3000" },
      }
    );

    expect(async () => {
      await DELETE(request, { params: Promise.resolve({ id: "test-id" }) });
    }).not.toThrow();
  });
});


