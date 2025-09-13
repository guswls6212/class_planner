import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RepositoryInitializer } from "../container/RepositoryInitializer";
import { RepositoryRegistry } from "../container/RepositoryRegistry";

describe("RepositoryRegistry", () => {
  beforeEach(() => {
    // 각 테스트 전에 초기화 상태 리셋
    RepositoryInitializer.reset();
  });

  afterEach(() => {
    // 각 테스트 후에 정리
    RepositoryRegistry.clear();
  });

  describe("registerAll", () => {
    it("모든 Repository를 성공적으로 등록해야 한다", () => {
      RepositoryRegistry.registerAll();

      expect(RepositoryRegistry.isRegistered()).toBe(true);
    });

    it("등록된 Repository들을 가져올 수 있어야 한다", () => {
      RepositoryRegistry.registerAll();

      const studentRepo = RepositoryRegistry.getStudentRepository();
      const subjectRepo = RepositoryRegistry.getSubjectRepository();
      const sessionRepo = RepositoryRegistry.getSessionRepository();
      const enrollmentRepo = RepositoryRegistry.getEnrollmentRepository();

      expect(studentRepo).toBeDefined();
      expect(subjectRepo).toBeDefined();
      expect(sessionRepo).toBeDefined();
      expect(enrollmentRepo).toBeDefined();
    });
  });

  describe("registerForTest", () => {
    it("테스트용 Repository를 성공적으로 등록해야 한다", () => {
      RepositoryRegistry.registerForTest();

      expect(RepositoryRegistry.isRegistered()).toBe(true);
    });

    it("테스트용 Repository들이 Mock 구현체여야 한다", async () => {
      RepositoryRegistry.registerForTest();

      const studentRepo = RepositoryRegistry.getStudentRepository();
      const students = await studentRepo.getAll();

      // Mock 데이터가 반환되는지 확인
      expect(students).toHaveLength(2);
      expect(students[0].name).toBe("김철수");
      expect(students[1].name).toBe("이영희");
    });
  });

  describe("getAllRepositories", () => {
    it("모든 Repository를 한 번에 가져올 수 있어야 한다", () => {
      RepositoryRegistry.registerAll();

      const repositories = RepositoryRegistry.getAllRepositories();

      expect(repositories.studentRepository).toBeDefined();
      expect(repositories.subjectRepository).toBeDefined();
      expect(repositories.sessionRepository).toBeDefined();
      expect(repositories.enrollmentRepository).toBeDefined();
    });
  });

  describe("싱글톤 동작", () => {
    it("같은 Repository 인스턴스를 반환해야 한다", () => {
      RepositoryRegistry.registerAll();

      const repo1 = RepositoryRegistry.getStudentRepository();
      const repo2 = RepositoryRegistry.getStudentRepository();

      expect(repo1).toBe(repo2);
    });
  });
});


