import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

const { mockFrom } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
}));

vi.mock("@/lib/supabaseServiceRole", () => ({
  getServiceRoleClient: () => ({ from: mockFrom }),
}));

import { GET } from "../route";

const FUTURE = new Date(Date.now() + 86400 * 1000 * 30).toISOString();
const PAST = new Date(Date.now() - 1000).toISOString();

function makeTokenRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "share-1",
    token: "abc123",
    academy_id: "acad-1",
    label: "테스트 링크",
    filter_student_id: null,
    expires_at: FUTURE,
    revoked_at: null,
    ...overrides,
  };
}

function buildFromMock(tokenRow: Record<string, unknown> | null, academyRow = { name: "테스트학원" }) {
  return (table: string) => {
    if (table === "share_tokens") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: tokenRow, error: tokenRow ? null : { message: "not found" } }),
          }),
        }),
      };
    }
    if (table === "academies") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: academyRow, error: null }),
          }),
        }),
      };
    }
    // sessions, students, subjects, enrollments, teachers
    return {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    };
  };
}

describe("GET /api/share/[token]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("유효한 토큰으로 공개 데이터를 반환한다", async () => {
    mockFrom.mockImplementation(buildFromMock(makeTokenRow()));

    const req = new NextRequest("http://localhost/api/share/abc123");
    const res = await GET(req, { params: Promise.resolve({ token: "abc123" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    expect(body.data.academyName).toBe("테스트학원");
  });

  it("존재하지 않는 토큰 → 404", async () => {
    mockFrom.mockImplementation(buildFromMock(null));

    const req = new NextRequest("http://localhost/api/share/invalid");
    const res = await GET(req, { params: Promise.resolve({ token: "invalid" }) });

    expect(res.status).toBe(404);
  });

  it("만료된 토큰 → 410", async () => {
    mockFrom.mockImplementation(buildFromMock(makeTokenRow({ expires_at: PAST })));

    const req = new NextRequest("http://localhost/api/share/abc123");
    const res = await GET(req, { params: Promise.resolve({ token: "abc123" }) });

    expect(res.status).toBe(410);
  });

  it("취소된 토큰 → 410", async () => {
    mockFrom.mockImplementation(
      buildFromMock(makeTokenRow({ revoked_at: PAST }))
    );

    const req = new NextRequest("http://localhost/api/share/abc123");
    const res = await GET(req, { params: Promise.resolve({ token: "abc123" }) });

    expect(res.status).toBe(410);
  });
});
