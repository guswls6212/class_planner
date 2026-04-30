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

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}));

import { GET } from "../route";

const FUTURE = new Date(Date.now() + 86400 * 1000 * 30).toISOString();
const PAST = new Date(Date.now() - 1000).toISOString();

const SCHEDULE_UPDATED_AT = "2026-04-10T10:00:00.000Z";

function makeTokenRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "share-1",
    token: "abc123",
    academy_id: "acad-1",
    label: "테스트 링크",
    filter_student_id: null,
    expires_at: FUTURE,
    revoked_at: null,
    last_viewed_at: null,
    ...overrides,
  };
}

function buildFromMock(
  tokenRow: Record<string, unknown> | null,
  academyRow = { name: "테스트학원", schedule_updated_at: SCHEDULE_UPDATED_AT }
) {
  return (table: string) => {
    if (table === "share_tokens") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: tokenRow,
              error: tokenRow ? null : { message: "not found" },
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
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
    // Support chained .eq() calls (eq().eq() for sessions: academy_id + week_start_date)
    const resolved = { data: [], error: null };
    const makeEq = (): Record<string, unknown> => ({
      eq: vi.fn().mockImplementation(() => makeEq()),
      in: vi.fn().mockResolvedValue(resolved),
      // Make thenable so Promise.all() can await it
      then: (resolve: (v: typeof resolved) => unknown) => Promise.resolve(resolved).then(resolve),
      catch: (reject: (e: unknown) => unknown) => Promise.resolve(resolved).catch(reject),
    });
    return {
      select: vi.fn().mockReturnValue(makeEq()),
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
    expect(body.data.currentWeek).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("최초 방문(last_viewed_at=null)이면 hasChanges=false — 배너 미표시 의도", async () => {
    mockFrom.mockImplementation(buildFromMock(makeTokenRow({ last_viewed_at: null })));

    const req = new NextRequest("http://localhost/api/share/abc123");
    const res = await GET(req, { params: Promise.resolve({ token: "abc123" }) });
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.data.hasChanges).toBe(false);
    expect(body.data.lastViewedAt).toBeNull();
    expect(body.data.scheduleUpdatedAt).toBe(SCHEDULE_UPDATED_AT);
  });

  it("schedule_updated_at > last_viewed_at 이면 hasChanges=true", async () => {
    mockFrom.mockImplementation(
      buildFromMock(makeTokenRow({ last_viewed_at: "2026-04-09T00:00:00.000Z" }))
    );

    const req = new NextRequest("http://localhost/api/share/abc123");
    const res = await GET(req, { params: Promise.resolve({ token: "abc123" }) });
    const body = await res.json();

    expect(body.data.hasChanges).toBe(true);
    expect(body.data.lastViewedAt).toBe("2026-04-09T00:00:00.000Z");
  });

  it("schedule_updated_at <= last_viewed_at 이면 hasChanges=false", async () => {
    mockFrom.mockImplementation(
      buildFromMock(makeTokenRow({ last_viewed_at: "2026-04-11T00:00:00.000Z" }))
    );

    const req = new NextRequest("http://localhost/api/share/abc123");
    const res = await GET(req, { params: Promise.resolve({ token: "abc123" }) });
    const body = await res.json();

    expect(body.data.hasChanges).toBe(false);
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
