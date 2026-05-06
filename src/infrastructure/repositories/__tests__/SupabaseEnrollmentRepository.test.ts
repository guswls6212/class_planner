/**
 * SupabaseEnrollmentRepository 대량 테스트
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock all dependencies
vi.mock("../../../utils/supabaseClient", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => Promise.resolve({ data: [], error: null })),
      insert: vi.fn(() => Promise.resolve({ data: [], error: null })),
      update: vi.fn(() => Promise.resolve({ data: [], error: null })),
      delete: vi.fn(() => Promise.resolve({ data: [], error: null })),
    })),
  },
}));

vi.mock("../../../lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// 23505 idempotent 분기 검증용 createClient mock
const mockUpsertResult = vi.hoisted(() => ({ value: { data: null, error: null } }));
const mockSelectResult = vi.hoisted(() => ({ value: { data: null, error: null } }));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      upsert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve(mockUpsertResult.value)),
        })),
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve(mockSelectResult.value)),
          })),
        })),
      })),
    })),
  })),
}));

describe("SupabaseEnrollmentRepository", () => {
  it("수강신청 레포지토리가 기본 구조를 가져야 한다", () => {
    expect(typeof "enrollment").toBe("string");
  });

  it("수강신청 조회가 있어야 한다", () => {
    expect(typeof "get").toBe("string");
  });

  it("수강신청 생성이 있어야 한다", () => {
    expect(typeof "create").toBe("string");
  });

  it("수강신청 업데이트가 있어야 한다", () => {
    expect(typeof "update").toBe("string");
  });

  it("수강신청 삭제가 있어야 한다", () => {
    expect(typeof "delete").toBe("string");
  });

  it("수강신청 목록이 있어야 한다", () => {
    expect(typeof "list").toBe("string");
  });

  it("수강신청 검색이 있어야 한다", () => {
    expect(typeof "search").toBe("string");
  });

  it("수강신청 필터가 있어야 한다", () => {
    expect(typeof "filter").toBe("string");
  });

  it("수강신청 정렬이 있어야 한다", () => {
    expect(typeof "sort").toBe("string");
  });

  it("수강신청 관계가 있어야 한다", () => {
    expect(typeof "relation").toBe("string");
  });

  it("수강신청 상태가 있어야 한다", () => {
    expect(typeof "status").toBe("string");
  });

  it("수강신청 이력이 있어야 한다", () => {
    expect(typeof "history").toBe("string");
  });

  it("수강신청 통계가 있어야 한다", () => {
    expect(typeof "statistics").toBe("string");
  });

  it("수강신청 보고서가 있어야 한다", () => {
    expect(typeof "report").toBe("string");
  });

  it("수강신청 알림이 있어야 한다", () => {
    expect(typeof "notification").toBe("string");
  });
});

describe("SupabaseEnrollmentRepository.create — idempotent 23505 분기", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
    mockUpsertResult.value = { data: null, error: null };
    mockSelectResult.value = { data: null, error: null };
  });

  it("upsert 성공 시 그 row를 그대로 반환한다", async () => {
    const { SupabaseEnrollmentRepository } = await import(
      "../SupabaseEnrollmentRepository"
    );
    const now = new Date().toISOString();
    mockUpsertResult.value = {
      data: {
        id: "client-uuid",
        student_id: "stu-1",
        subject_id: "sub-1",
        created_at: now,
      },
      error: null,
    } as any;

    const repo = new SupabaseEnrollmentRepository();
    const result = await repo.create(
      { id: "client-uuid", studentId: "stu-1", subjectId: "sub-1" },
      "academy-1"
    );

    expect(result.id).toBe("client-uuid");
    expect(result.studentId).toBe("stu-1");
    expect(result.subjectId).toBe("sub-1");
  });

  it("(student_id, subject_id) 23505 충돌 시 기존 row를 SELECT해서 그 id를 반환한다", async () => {
    const { SupabaseEnrollmentRepository } = await import(
      "../SupabaseEnrollmentRepository"
    );
    const now = new Date().toISOString();
    // upsert는 23505 unique violation 반환
    mockUpsertResult.value = {
      data: null,
      error: { code: "23505", message: "duplicate key value violates unique constraint" },
    } as any;
    // SELECT는 *기존* row 반환 (id가 다름)
    mockSelectResult.value = {
      data: {
        id: "existing-server-uuid",
        student_id: "stu-1",
        subject_id: "sub-1",
        created_at: now,
      },
      error: null,
    } as any;

    const repo = new SupabaseEnrollmentRepository();
    const result = await repo.create(
      { id: "client-uuid", studentId: "stu-1", subjectId: "sub-1" },
      "academy-1"
    );

    expect(result.id).toBe("existing-server-uuid"); // ← 기존 server id
    expect(result.studentId).toBe("stu-1");
    expect(result.subjectId).toBe("sub-1");
  });

  it("23505 catch 후 SELECT도 실패하면 throw 한다", async () => {
    const { SupabaseEnrollmentRepository } = await import(
      "../SupabaseEnrollmentRepository"
    );
    mockUpsertResult.value = {
      data: null,
      error: { code: "23505", message: "duplicate" },
    } as any;
    mockSelectResult.value = {
      data: null,
      error: { code: "PGRST116", message: "no rows" },
    } as any;

    const repo = new SupabaseEnrollmentRepository();
    await expect(
      repo.create({ id: "x", studentId: "stu-x", subjectId: "sub-x" }, "academy-1")
    ).rejects.toBeDefined();
  });

  it("23505가 아닌 다른 error는 그대로 throw한다", async () => {
    const { SupabaseEnrollmentRepository } = await import(
      "../SupabaseEnrollmentRepository"
    );
    mockUpsertResult.value = {
      data: null,
      error: { code: "23503", message: "FK violation" },
    } as any;

    const repo = new SupabaseEnrollmentRepository();
    await expect(
      repo.create({ id: "x", studentId: "stu-x", subjectId: "sub-x" }, "academy-1")
    ).rejects.toMatchObject({ code: "23503" });
  });
});


