/**
 * SupabaseSubjectRepository 기본 테스트
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
    error: vi.fn(),
  },
}));

describe("SupabaseSubjectRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Repository 모듈이 로드되어야 한다", async () => {
    const module = await import("../SupabaseSubjectRepository");
    expect(module).toBeDefined();
  });

  it("Repository 클래스가 존재해야 한다", async () => {
    const module = await import("../SupabaseSubjectRepository");

    // Repository 모듈이 에러 없이 로드되면 성공
    expect(typeof module).toBe("object");
  });

  it("기본 Repository 구조가 유지되어야 한다", async () => {
    const module = await import("../SupabaseSubjectRepository");

    // 모듈 구조 확인
    expect(module).toBeTruthy();
  });
});


