import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../lib/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

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

describe("StudentRepositoryFactory", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("test 환경에서 Mock 구현체를 반환한다", async () => {
    vi.stubEnv("NODE_ENV", "test");
    const { StudentRepositoryFactory } = await import(
      "../StudentRepositoryFactory"
    );
    const repo = StudentRepositoryFactory.create();
    expect(repo).toBeDefined();
    expect(repo.getAll).toBeInstanceOf(Function);
    const result = await repo.getAll("academy-1");
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
  });

  it("production 환경에서 Supabase 구현체를 반환한다", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { StudentRepositoryFactory } = await import(
      "../StudentRepositoryFactory"
    );
    const repo = StudentRepositoryFactory.create();
    expect(repo).toBeDefined();
    expect(repo.constructor.name).toBe("SupabaseStudentRepository");
  });

  it("development 환경에서 Supabase 구현체를 반환한다", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const { StudentRepositoryFactory } = await import(
      "../StudentRepositoryFactory"
    );
    const repo = StudentRepositoryFactory.create();
    expect(repo.constructor.name).toBe("SupabaseStudentRepository");
  });

  it("환경 미설정 시 기본 Supabase 구현체를 반환한다", async () => {
    vi.stubEnv("NODE_ENV", "");
    const { StudentRepositoryFactory } = await import(
      "../StudentRepositoryFactory"
    );
    const repo = StudentRepositoryFactory.create();
    expect(repo.constructor.name).toBe("SupabaseStudentRepository");
  });
});

describe("SubjectRepositoryFactory", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("test 환경에서 Mock 구현체를 반환한다", async () => {
    vi.stubEnv("NODE_ENV", "test");
    const { SubjectRepositoryFactory } = await import(
      "../SubjectRepositoryFactory"
    );
    const repo = SubjectRepositoryFactory.create();
    expect(repo).toBeDefined();
    const result = await repo.getAll("academy-1");
    expect(Array.isArray(result)).toBe(true);
  });

  it("production 환경에서 Supabase 구현체를 반환한다", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { SubjectRepositoryFactory } = await import(
      "../SubjectRepositoryFactory"
    );
    const repo = SubjectRepositoryFactory.create();
    expect(repo).toBeDefined();
  });
});

describe("SessionRepositoryFactory", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("test 환경에서 Mock 구현체를 반환한다", async () => {
    vi.stubEnv("NODE_ENV", "test");
    const { SessionRepositoryFactory } = await import(
      "../SessionRepositoryFactory"
    );
    const repo = SessionRepositoryFactory.create();
    expect(repo).toBeDefined();
    const result = await repo.getAll("academy-1");
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });

  it("non-test 환경에서 Supabase 구현체를 반환한다", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { SessionRepositoryFactory } = await import(
      "../SessionRepositoryFactory"
    );
    const repo = SessionRepositoryFactory.create();
    expect(repo.constructor.name).toBe("SupabaseSessionRepository");
  });
});

describe("EnrollmentRepositoryFactory", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("test 환경에서 Mock 구현체를 반환한다", async () => {
    vi.stubEnv("NODE_ENV", "test");
    const { EnrollmentRepositoryFactory } = await import(
      "../EnrollmentRepositoryFactory"
    );
    const repo = EnrollmentRepositoryFactory.create();
    expect(repo).toBeDefined();
    const result = await repo.getAll("academy-1");
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });

  it("non-test 환경에서 Supabase 구현체를 반환한다", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { EnrollmentRepositoryFactory } = await import(
      "../EnrollmentRepositoryFactory"
    );
    const repo = EnrollmentRepositoryFactory.create();
    expect(repo.constructor.name).toBe("SupabaseEnrollmentRepository");
  });
});
