/**
 * Students ID API Routes 테스트
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

vi.mock("../../../../../lib/resolveAcademyId", () => ({
  resolveAcademyId: vi.fn().mockResolvedValue("test-academy-id"),
}));

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
    mockRequireRole.mockResolvedValue({ academyId: "test-academy-id", role: "owner" });
  });

  it("GET 요청이 에러 없이 처리되어야 한다", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/students/test-id?userId=owner-user",
      {
        headers: { origin: "http://localhost:3000" },
      }
    );

    const response = await GET(request, { params: Promise.resolve({ id: "test-id" }) });
    expect(response.status).toBe(200);
  });

  it("GET: userId 없으면 400을 반환해야 한다", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/students/test-id",
      {
        headers: { origin: "http://localhost:3000" },
      }
    );

    const response = await GET(request, { params: Promise.resolve({ id: "test-id" }) });
    expect(response.status).toBe(400);
  });

  it("GET: 다른 academy의 학생은 404를 반환해야 한다", async () => {
    const { ServiceFactory } = await import(
      "../../../../../application/services/ServiceFactory"
    );
    vi.mocked(ServiceFactory.createStudentService).mockReturnValueOnce({
      getStudentById: vi.fn().mockResolvedValue(null),
      updateStudent: vi.fn(),
      deleteStudent: vi.fn(),
      getAllStudents: vi.fn(),
      addStudent: vi.fn(),
    } as never);

    const request = new NextRequest(
      "http://localhost:3000/api/students/other-academy-student?userId=owner-user",
      {
        headers: { origin: "http://localhost:3000" },
      }
    );

    const response = await GET(request, {
      params: Promise.resolve({ id: "other-academy-student" }),
    });
    expect(response.status).toBe(404);
  });

  it("PUT 요청이 에러 없이 처리되어야 한다 (owner)", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/students/test-id?userId=owner-user",
      {
        method: "PUT",
        headers: {
          origin: "http://localhost:3000",
          "content-type": "application/json",
        },
        body: JSON.stringify({ name: "수정된 이름" }),
      }
    );

    const response = await PUT(request, { params: Promise.resolve({ id: "test-id" }) });
    expect(response.status).toBe(200);
  });

  it("PUT: member role은 403을 반환해야 한다", async () => {
    mockRequireRole.mockRejectedValueOnce(
      new AppError("FORBIDDEN", { statusHint: 403 })
    );

    const request = new NextRequest(
      "http://localhost:3000/api/students/test-id?userId=member-user",
      {
        method: "PUT",
        headers: {
          origin: "http://localhost:3000",
          "content-type": "application/json",
        },
        body: JSON.stringify({ name: "수정된 이름" }),
      }
    );

    const response = await PUT(request, { params: Promise.resolve({ id: "test-id" }) });
    expect(response.status).toBe(403);
  });

  it("DELETE 요청이 에러 없이 처리되어야 한다 (owner)", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/students/test-id?userId=owner-user",
      {
        method: "DELETE",
        headers: { origin: "http://localhost:3000" },
      }
    );

    const response = await DELETE(request, { params: Promise.resolve({ id: "test-id" }) });
    expect(response.status).toBe(200);
  });

  it("DELETE: member role은 403을 반환해야 한다", async () => {
    mockRequireRole.mockRejectedValueOnce(
      new AppError("FORBIDDEN", { statusHint: 403 })
    );

    const request = new NextRequest(
      "http://localhost:3000/api/students/test-id?userId=member-user",
      {
        method: "DELETE",
        headers: { origin: "http://localhost:3000" },
      }
    );

    const response = await DELETE(request, { params: Promise.resolve({ id: "test-id" }) });
    expect(response.status).toBe(403);
  });
});
