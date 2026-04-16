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

describe("RepositoryRegistry", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "test");
    const { RepositoryRegistry } = await import("../RepositoryRegistry");
    RepositoryRegistry.clear();
  });

  it("registerAll() 후 isRegistered()가 true를 반환한다", async () => {
    const { RepositoryRegistry } = await import("../RepositoryRegistry");
    RepositoryRegistry.registerAll();
    expect(RepositoryRegistry.isRegistered()).toBe(true);
  });

  it("clear() 후 isRegistered()가 false를 반환한다", async () => {
    const { RepositoryRegistry } = await import("../RepositoryRegistry");
    RepositoryRegistry.registerAll();
    RepositoryRegistry.clear();
    expect(RepositoryRegistry.isRegistered()).toBe(false);
  });

  it("등록 후 각 repository를 조회할 수 있다", async () => {
    const { RepositoryRegistry } = await import("../RepositoryRegistry");
    RepositoryRegistry.registerAll();

    expect(RepositoryRegistry.getStudentRepository()).toBeDefined();
    expect(RepositoryRegistry.getSubjectRepository()).toBeDefined();
    expect(RepositoryRegistry.getSessionRepository()).toBeDefined();
    expect(RepositoryRegistry.getEnrollmentRepository()).toBeDefined();
    expect(RepositoryRegistry.getTeacherRepository()).toBeDefined();
  });

  it("getAllRepositories()가 5개 repository를 반환한다", async () => {
    const { RepositoryRegistry } = await import("../RepositoryRegistry");
    RepositoryRegistry.registerAll();

    const repos = RepositoryRegistry.getAllRepositories();
    expect(repos.studentRepository).toBeDefined();
    expect(repos.subjectRepository).toBeDefined();
    expect(repos.sessionRepository).toBeDefined();
    expect(repos.enrollmentRepository).toBeDefined();
    expect(repos.teacherRepository).toBeDefined();
  });

  it("미등록 시 자동 등록된다 (autoRegisterIfNeeded)", async () => {
    const { RepositoryRegistry } = await import("../RepositoryRegistry");
    expect(RepositoryRegistry.isRegistered()).toBe(false);

    const repo = RepositoryRegistry.getStudentRepository();
    expect(repo).toBeDefined();
    expect(RepositoryRegistry.isRegistered()).toBe(true);
  });

  it("registerForTest()가 정상 동작한다", async () => {
    const { RepositoryRegistry } = await import("../RepositoryRegistry");
    RepositoryRegistry.registerForTest();
    expect(RepositoryRegistry.isRegistered()).toBe(true);

    const repo = RepositoryRegistry.getStudentRepository();
    expect(repo.getAll).toBeInstanceOf(Function);
  });

  it("REPOSITORY_KEYS가 5개 키를 갖는다", async () => {
    const { REPOSITORY_KEYS } = await import("../RepositoryRegistry");
    expect(Object.keys(REPOSITORY_KEYS)).toHaveLength(5);
    expect(REPOSITORY_KEYS.STUDENT_REPOSITORY).toBe("studentRepository");
    expect(REPOSITORY_KEYS.SUBJECT_REPOSITORY).toBe("subjectRepository");
    expect(REPOSITORY_KEYS.SESSION_REPOSITORY).toBe("sessionRepository");
    expect(REPOSITORY_KEYS.ENROLLMENT_REPOSITORY).toBe("enrollmentRepository");
    expect(REPOSITORY_KEYS.TEACHER_REPOSITORY).toBe("teacherRepository");
  });

  it("resolve 시 싱글톤 인스턴스를 반환한다", async () => {
    const { RepositoryRegistry } = await import("../RepositoryRegistry");
    RepositoryRegistry.registerAll();

    const first = RepositoryRegistry.getStudentRepository();
    const second = RepositoryRegistry.getStudentRepository();
    expect(first).toBe(second);
  });
});
