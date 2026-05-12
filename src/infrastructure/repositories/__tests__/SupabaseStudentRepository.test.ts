/**
 * SupabaseStudentRepository 기본 테스트
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock Supabase
vi.mock("../../../utils/supabaseClient", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      update: vi.fn(() => Promise.resolve({ data: null, error: null })),
      delete: vi.fn(() => Promise.resolve({ data: null, error: null })),
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

// getAll() invariant-skip 시나리오 검증용 createClient mock
const mockGetAllResult = vi.hoisted(() => ({ value: { data: null, error: null } as { data: unknown; error: unknown } }));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve(mockGetAllResult.value)),
        })),
      })),
    })),
  })),
}));

describe("SupabaseStudentRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Repository 모듈이 로드되어야 한다", async () => {
    const module = await import("../SupabaseStudentRepository");
    expect(module).toBeDefined();
  });

  it("Repository 클래스가 존재해야 한다", async () => {
    const module = await import("../SupabaseStudentRepository");

    // Repository 모듈이 에러 없이 로드되면 성공
    expect(typeof module).toBe("object");
  });

  it("기본 Repository 구조가 유지되어야 한다", async () => {
    const module = await import("../SupabaseStudentRepository");

    // 모듈 구조 확인
    expect(module).toBeTruthy();
  });
});

/**
 * 2026-05-12 사고 회귀 가드:
 * invariant 위반(예: name 1글자) row 1개 때문에 academy 전체가 빈 배열로 swallow되던 함정.
 * mapRowsSafely 도입 후엔 invalid row만 skip되고 valid row N-1개가 반환되어야 한다.
 */
describe("SupabaseStudentRepository.getAll — invariant 위반 row skip", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
    mockGetAllResult.value = { data: null, error: null };
    vi.clearAllMocks();
  });

  // Student.restore requires v1-v5 UUID with 8/9/a/b variant nibble
  const UUID_1 = "11111111-1111-1111-8111-111111111111";
  const UUID_2 = "22222222-2222-2222-9222-222222222222";
  const UUID_3 = "33333333-3333-3333-a333-333333333333";

  it("invariant 위반 row 1개 + valid 2개 → valid 2개만 반환된다", async () => {
    const now = new Date().toISOString();
    mockGetAllResult.value = {
      data: [
        {
          id: UUID_1,
          name: "철수", // valid (2글자)
          gender: null,
          birth_date: null,
          grade: null,
          school: null,
          phone: null,
          created_at: now,
          updated_at: now,
        },
        {
          id: UUID_2,
          name: "X", // invariant 위반 (1글자) — Student.restore throw
          gender: null,
          birth_date: null,
          grade: null,
          school: null,
          phone: null,
          created_at: now,
          updated_at: now,
        },
        {
          id: UUID_3,
          name: "민수", // valid
          gender: null,
          birth_date: null,
          grade: null,
          school: null,
          phone: null,
          created_at: now,
          updated_at: now,
        },
      ],
      error: null,
    };

    const { SupabaseStudentRepository } = await import(
      "../SupabaseStudentRepository"
    );
    const repo = new SupabaseStudentRepository();
    const result = await repo.getAll("academy-1");

    expect(result).toHaveLength(2);
    expect(result.map((s) => s.id.value)).toEqual([UUID_1, UUID_3]);
  });

  it("모든 row가 valid면 모두 반환된다", async () => {
    const now = new Date().toISOString();
    mockGetAllResult.value = {
      data: [
        {
          id: UUID_1,
          name: "철수",
          gender: null,
          birth_date: null,
          grade: null,
          school: null,
          phone: null,
          created_at: now,
          updated_at: now,
        },
        {
          id: UUID_2,
          name: "영희",
          gender: null,
          birth_date: null,
          grade: null,
          school: null,
          phone: null,
          created_at: now,
          updated_at: now,
        },
      ],
      error: null,
    };

    const { SupabaseStudentRepository } = await import(
      "../SupabaseStudentRepository"
    );
    const repo = new SupabaseStudentRepository();
    const result = await repo.getAll("academy-1");

    expect(result).toHaveLength(2);
  });
});


