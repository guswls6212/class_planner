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

describe("RepositoryConfigFactory", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "test");
  });

  it("create()가 4개 repository를 포함하는 config를 반환한다", async () => {
    const { RepositoryConfigFactory } = await import("../RepositoryConfig");
    const config = RepositoryConfigFactory.create();

    expect(config).toBeDefined();
    expect(config.studentRepository).toBeDefined();
    expect(config.subjectRepository).toBeDefined();
    expect(config.sessionRepository).toBeDefined();
    expect(config.enrollmentRepository).toBeDefined();
  });

  it("createForTest()가 config를 반환한다", async () => {
    const { RepositoryConfigFactory } = await import("../RepositoryConfig");
    const config = RepositoryConfigFactory.createForTest();

    expect(config.studentRepository).toBeDefined();
    expect(config.studentRepository.getAll).toBeInstanceOf(Function);
  });

  it("createForDevelopment()가 config를 반환한다", async () => {
    const { RepositoryConfigFactory } = await import("../RepositoryConfig");
    const config = RepositoryConfigFactory.createForDevelopment();

    expect(config.studentRepository).toBeDefined();
    expect(config.subjectRepository).toBeDefined();
  });

  it("createForProduction()가 config를 반환한다", async () => {
    const { RepositoryConfigFactory } = await import("../RepositoryConfig");
    const config = RepositoryConfigFactory.createForProduction();

    expect(config.sessionRepository).toBeDefined();
    expect(config.enrollmentRepository).toBeDefined();
  });

  it("모든 repository가 올바른 인터페이스를 구현한다", async () => {
    const { RepositoryConfigFactory } = await import("../RepositoryConfig");
    const config = RepositoryConfigFactory.create();

    for (const repo of [
      config.studentRepository,
      config.subjectRepository,
      config.sessionRepository,
      config.enrollmentRepository,
    ]) {
      expect(repo.getAll).toBeInstanceOf(Function);
      expect(repo.getById).toBeInstanceOf(Function);
      expect(repo.create).toBeInstanceOf(Function);
      expect(repo.update).toBeInstanceOf(Function);
      expect(repo.delete).toBeInstanceOf(Function);
    }
  });
});
