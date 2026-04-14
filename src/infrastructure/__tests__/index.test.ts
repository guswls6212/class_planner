import { describe, expect, it, vi } from "vitest";

vi.mock("../../lib/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock("../../utils/supabaseClient", () => ({
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

describe("infrastructure/index.ts exports", () => {
  it("RepositoryConfigFactory를 export한다", async () => {
    const mod = await import("../index");
    expect(mod.RepositoryConfigFactory).toBeDefined();
  });

  it("RepositoryRegistry를 export한다", async () => {
    const mod = await import("../index");
    expect(mod.RepositoryRegistry).toBeDefined();
    expect(mod.REPOSITORY_KEYS).toBeDefined();
  });

  it("4개 Factory를 export한다", async () => {
    const mod = await import("../index");
    expect(mod.StudentRepositoryFactory).toBeDefined();
    expect(mod.SubjectRepositoryFactory).toBeDefined();
    expect(mod.SessionRepositoryFactory).toBeDefined();
    expect(mod.EnrollmentRepositoryFactory).toBeDefined();
  });

  it("Repository 구현체를 export한다", async () => {
    const mod = await import("../index");
    expect(mod.SupabaseStudentRepository).toBeDefined();
    expect(mod.SupabaseSubjectRepository).toBeDefined();
  });
});
