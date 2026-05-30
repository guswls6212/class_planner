import { beforeEach, describe, expect, it, vi } from "vitest";

// Set env vars before module loads
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

// ── Supabase mock ──────────────────────────────────────────────────────────────

const mockSingle = vi.fn();

// Build a chainable builder where every terminal is `single`
function makeBuilder(singleImpl: typeof mockSingle) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const builder: any = {
    single: singleImpl,
  };
  builder.eq = () => builder;
  builder.limit = () => builder;
  builder.select = () => builder;
  return builder;
}

const mockFrom = vi.fn();

vi.mock("@/lib/supabaseServiceRole", () => ({
  getServiceRoleClient: () => ({ from: mockFrom }),
}));

// ── resolveAcademyMembership mock ─────────────────────────────────────────────

const mockResolveAcademyMembership = vi.fn();

vi.mock("@/lib/resolveAcademyMembership", () => ({
  resolveAcademyMembership: (...args: unknown[]) =>
    mockResolveAcademyMembership(...args),
}));

// ── Subject under test ────────────────────────────────────────────────────────

import {
  getMyTeacherId,
  pickAllowedFields,
  requireOwnTeacher,
  requireRole,
} from "../permissions";

// ─────────────────────────────────────────────────────────────────────────────

describe("requireRole", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("허용된 역할이면 academyId와 role을 반환한다", async () => {
    mockResolveAcademyMembership.mockResolvedValue({
      academyId: "academy-1",
      role: "owner",
    });

    const result = await requireRole("user-1", ["owner", "admin"]);

    expect(result).toEqual({ academyId: "academy-1", role: "owner" });
  });

  it("허용되지 않은 역할이면 403 AppError를 던진다", async () => {
    mockResolveAcademyMembership.mockResolvedValue({
      academyId: "academy-1",
      role: "member",
    });

    await expect(requireRole("user-1", ["owner"])).rejects.toMatchObject({
      name: "AppError",
      statusHint: 403,
    });
  });

  it("resolveAcademyMembership 실패 시 에러가 전파된다", async () => {
    mockResolveAcademyMembership.mockRejectedValue(
      new Error("소속 학원 없음")
    );

    await expect(requireRole("user-unknown", ["owner"])).rejects.toThrow(
      "소속 학원 없음"
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("requireOwnTeacher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("본인 소유 강사 레코드이면 teacherId를 반환한다", async () => {
    mockSingle.mockResolvedValue({ data: { id: "teacher-1" }, error: null });
    mockFrom.mockReturnValue(makeBuilder(mockSingle));

    const result = await requireOwnTeacher("user-1", "teacher-1");

    expect(result).toBe("teacher-1");
  });

  it("다른 사람 강사 레코드이면 403 AppError를 던진다", async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: "not found" } });
    mockFrom.mockReturnValue(makeBuilder(mockSingle));

    await expect(requireOwnTeacher("user-2", "teacher-1")).rejects.toMatchObject({
      name: "AppError",
      statusHint: 403,
    });
  });

  it("레코드가 없을 때(data: null, error: null)도 403을 던진다", async () => {
    mockSingle.mockResolvedValue({ data: null, error: null });
    mockFrom.mockReturnValue(makeBuilder(mockSingle));

    await expect(requireOwnTeacher("user-1", "teacher-99")).rejects.toMatchObject({
      name: "AppError",
      statusHint: 403,
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("getMyTeacherId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("링크된 강사가 있으면 teacherId를 반환한다", async () => {
    mockSingle.mockResolvedValue({ data: { id: "teacher-1" }, error: null });
    mockFrom.mockReturnValue(makeBuilder(mockSingle));

    const result = await getMyTeacherId("user-1", "academy-1");

    expect(result).toBe("teacher-1");
  });

  it("링크된 강사가 없으면 null을 반환한다", async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: "no rows" } });
    mockFrom.mockReturnValue(makeBuilder(mockSingle));

    const result = await getMyTeacherId("user-1", "academy-1");

    expect(result).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("pickAllowedFields", () => {
  it("허용된 필드만 포함된 객체를 반환한다", () => {
    const body = { name: "홍길동", role: "member", secret: "hidden" };
    const result = pickAllowedFields(body, ["name", "role"]);

    expect(result).toEqual({ name: "홍길동", role: "member" });
    expect(result).not.toHaveProperty("secret");
  });

  it("허용 필드가 없으면 빈 객체를 반환한다", () => {
    const body = { a: 1, b: 2 };
    const result = pickAllowedFields(body, []);

    expect(result).toEqual({});
  });

  it("body에 없는 허용 필드는 결과에 포함되지 않는다", () => {
    const body = { name: "test" } as Record<string, unknown>;
    const result = pickAllowedFields(body, ["name", "role"]);

    expect(result).toEqual({ name: "test" });
    expect(Object.keys(result)).toHaveLength(1);
  });

  it("원본 객체는 변경되지 않는다", () => {
    const body = { name: "test", secret: "value" };
    pickAllowedFields(body, ["name"]);

    expect(body).toHaveProperty("secret", "value");
  });
});
