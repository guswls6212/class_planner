import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

const { mockFrom, mockResolveAcademyId } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockResolveAcademyId: vi.fn(),
}));

vi.mock("@/lib/supabaseServiceRole", () => ({
  getServiceRoleClient: () => ({ from: mockFrom }),
}));

vi.mock("@/lib/resolveAcademyId", () => ({
  resolveAcademyId: mockResolveAcademyId,
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}));

import { GET } from "../route";

const ACADEMY_ID = "acad-1";
const USER_ID = "user-1";

function buildAcademyMock(row: Record<string, unknown> | null) {
  return () => ({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: row,
          error: row ? null : { message: "not found" },
        }),
      }),
    }),
  });
}

describe("GET /api/academies/active/schedule-meta", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("userId 없으면 400", async () => {
    const req = new NextRequest("http://localhost/api/academies/active/schedule-meta");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("정상 — academyId, academyName, scheduleUpdatedAt 반환", async () => {
    mockResolveAcademyId.mockResolvedValueOnce(ACADEMY_ID);
    mockFrom.mockImplementation(
      buildAcademyMock({
        id: ACADEMY_ID,
        name: "현진학원",
        schedule_updated_at: "2026-05-04T10:00:00.000Z",
      }),
    );

    const req = new NextRequest(
      `http://localhost/api/academies/active/schedule-meta?userId=${USER_ID}`,
    );
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({
      academyId: ACADEMY_ID,
      academyName: "현진학원",
      scheduleUpdatedAt: "2026-05-04T10:00:00.000Z",
    });
  });

  it("user에 매핑된 academy 없음 → 404", async () => {
    mockResolveAcademyId.mockRejectedValueOnce(new Error("no mapping"));

    const req = new NextRequest(
      `http://localhost/api/academies/active/schedule-meta?userId=${USER_ID}`,
    );
    const res = await GET(req);
    expect(res.status).toBe(404);
  });

  it("academy row 못 찾음 → 404", async () => {
    mockResolveAcademyId.mockResolvedValueOnce(ACADEMY_ID);
    mockFrom.mockImplementation(buildAcademyMock(null));

    const req = new NextRequest(
      `http://localhost/api/academies/active/schedule-meta?userId=${USER_ID}`,
    );
    const res = await GET(req);
    expect(res.status).toBe(404);
  });
});
