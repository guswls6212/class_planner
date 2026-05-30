import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

const { mockMembership, mockFrom } = vi.hoisted(() => ({
  mockMembership: vi.fn(),
  mockFrom: vi.fn(),
}));

vi.mock("@/lib/resolveAcademyMembership", () => ({
  resolveAcademyMembership: mockMembership,
}));

vi.mock("@/lib/supabaseServiceRole", () => ({
  getServiceRoleClient: () => ({ from: mockFrom }),
}));

import { POST } from "../route";

interface TargetRow {
  id: string;
  name: string;
  academy_id: string;
  archived_at: string | null;
}

function configureFrom(opts: {
  targets: TargetRow[] | null;
  sessionsUpdated?: { id: string }[];
  sessionsError?: unknown;
  archiveError?: unknown;
}) {
  const sessionsUpdateMock = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: opts.sessionsError ? null : opts.sessionsUpdated ?? [],
          error: opts.sessionsError ?? null,
        }),
      }),
    }),
  });
  const archiveUpdateMock = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: opts.archiveError ?? null }),
    }),
  });
  mockFrom.mockImplementation((table: string) => {
    if (table === "teachers") {
      return {
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: opts.targets,
              error: opts.targets ? null : { message: "not found" },
            }),
          }),
        }),
        update: archiveUpdateMock,
      };
    }
    if (table === "sessions") {
      return { update: sessionsUpdateMock };
    }
    return {};
  });
  return { sessionsUpdateMock, archiveUpdateMock };
}

function makeRequest(originalId: string, userId: string | null, body: unknown): NextRequest {
  const url = userId
    ? `http://localhost/api/teachers/${originalId}/reassign?userId=${userId}`
    : `http://localhost/api/teachers/${originalId}/reassign`;
  return new NextRequest(url, {
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/teachers/[id]/reassign — 강사 교체", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("userId 누락 시 400", async () => {
    const req = makeRequest("t-old", null, { to: "t-new" });
    const res = await POST(req, { params: Promise.resolve({ id: "t-old" }) });
    expect(res.status).toBe(400);
  });

  it("member 권한 시 403", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "member" });
    const req = makeRequest("t-old", "u-1", { to: "t-new" });
    const res = await POST(req, { params: Promise.resolve({ id: "t-old" }) });
    expect(res.status).toBe(403);
  });

  it("body.to 누락 시 400", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "owner" });
    const req = makeRequest("t-old", "u-1", {});
    const res = await POST(req, { params: Promise.resolve({ id: "t-old" }) });
    expect(res.status).toBe(400);
  });

  it("원 강사와 대체 강사가 같으면 400", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "owner" });
    const req = makeRequest("t-same", "u-1", { to: "t-same" });
    const res = await POST(req, { params: Promise.resolve({ id: "t-same" }) });
    expect(res.status).toBe(400);
  });

  it("강사 부재 시 404", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "owner" });
    configureFrom({ targets: null });
    const req = makeRequest("t-old", "u-1", { to: "t-new" });
    const res = await POST(req, { params: Promise.resolve({ id: "t-old" }) });
    expect(res.status).toBe(404);
  });

  it("대체 강사가 보관 상태면 400", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "owner" });
    configureFrom({
      targets: [
        { id: "t-old", name: "강사A", academy_id: "acad-1", archived_at: null },
        { id: "t-new", name: "강사B(보관)", academy_id: "acad-1", archived_at: "2026-04-01T00:00:00Z" },
      ],
    });
    const req = makeRequest("t-old", "u-1", { to: "t-new" });
    const res = await POST(req, { params: Promise.resolve({ id: "t-old" }) });
    expect(res.status).toBe(400);
  });

  it("성공 — sessions teacher_id 일괄 이전 + 원 강사 자동 보관 (default)", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "owner" });
    const { sessionsUpdateMock, archiveUpdateMock } = configureFrom({
      targets: [
        { id: "t-old", name: "강사A", academy_id: "acad-1", archived_at: null },
        { id: "t-new", name: "박코치", academy_id: "acad-1", archived_at: null },
      ],
      sessionsUpdated: [{ id: "s1" }, { id: "s2" }, { id: "s3" }],
    });

    const req = makeRequest("t-old", "u-1", { to: "t-new" });
    const res = await POST(req, { params: Promise.resolve({ id: "t-old" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.reassignedCount).toBe(3);
    expect(body.data.archiveOriginal).toBe(true);
    expect(body.data.archivedOk).toBe(true);

    expect(sessionsUpdateMock).toHaveBeenCalledWith({ teacher_id: "t-new" });
    expect(archiveUpdateMock).toHaveBeenCalledTimes(1);
    const archivePayload = archiveUpdateMock.mock.calls[0][0];
    expect(typeof archivePayload.archived_at).toBe("string");
  });

  it("archiveOriginal=false 시 sessions 만 이전 + 원 강사 보관 안 함", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "admin" });
    const { sessionsUpdateMock, archiveUpdateMock } = configureFrom({
      targets: [
        { id: "t-old", name: "강사A", academy_id: "acad-1", archived_at: null },
        { id: "t-new", name: "박코치", academy_id: "acad-1", archived_at: null },
      ],
      sessionsUpdated: [{ id: "s1" }],
    });

    const req = makeRequest("t-old", "u-1", { to: "t-new", archiveOriginal: false });
    const res = await POST(req, { params: Promise.resolve({ id: "t-old" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.archiveOriginal).toBe(false);
    expect(sessionsUpdateMock).toHaveBeenCalledTimes(1);
    expect(archiveUpdateMock).not.toHaveBeenCalled();
  });

  it("sessions update 실패 시 500", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "owner" });
    configureFrom({
      targets: [
        { id: "t-old", name: "강사A", academy_id: "acad-1", archived_at: null },
        { id: "t-new", name: "박코치", academy_id: "acad-1", archived_at: null },
      ],
      sessionsError: { message: "db error" },
    });
    const req = makeRequest("t-old", "u-1", { to: "t-new" });
    const res = await POST(req, { params: Promise.resolve({ id: "t-old" }) });
    expect(res.status).toBe(500);
  });

  it("archive 실패해도 sessions 이전 성공 시 200 (graceful)", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "owner" });
    configureFrom({
      targets: [
        { id: "t-old", name: "강사A", academy_id: "acad-1", archived_at: null },
        { id: "t-new", name: "박코치", academy_id: "acad-1", archived_at: null },
      ],
      sessionsUpdated: [{ id: "s1" }],
      archiveError: { message: "archive failed" },
    });
    const req = makeRequest("t-old", "u-1", { to: "t-new" });
    const res = await POST(req, { params: Promise.resolve({ id: "t-old" }) });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.archivedOk).toBe(false);
  });
});
