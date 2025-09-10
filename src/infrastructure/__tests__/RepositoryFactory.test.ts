import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSessionRepository,
  createStudentRepository,
  createSubjectRepository,
} from "../RepositoryFactory";

describe("RepositoryFactory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createStudentRepository", () => {
    it("StudentRepository 인스턴스를 생성해야 한다", () => {
      // Act
      const repository = createStudentRepository();

      // Assert
      expect(repository).toBeDefined();
      expect(typeof repository.getAll).toBe("function");
      expect(typeof repository.getById).toBe("function");
      expect(typeof repository.create).toBe("function");
      expect(typeof repository.update).toBe("function");
      expect(typeof repository.delete).toBe("function");
    });
  });

  describe("createSubjectRepository", () => {
    it("SubjectRepository 인스턴스를 생성해야 한다", () => {
      // Act
      const repository = createSubjectRepository();

      // Assert
      expect(repository).toBeDefined();
      expect(typeof repository.getAll).toBe("function");
      expect(typeof repository.getById).toBe("function");
      expect(typeof repository.create).toBe("function");
      expect(typeof repository.update).toBe("function");
      expect(typeof repository.delete).toBe("function");
    });
  });

  describe("createSessionRepository", () => {
    it("SessionRepository 인스턴스를 생성해야 한다", () => {
      // Act
      const repository = createSessionRepository();

      // Assert
      expect(repository).toBeDefined();
      expect(typeof repository.getAll).toBe("function");
      expect(typeof repository.getById).toBe("function");
      expect(typeof repository.create).toBe("function");
      expect(typeof repository.update).toBe("function");
      expect(typeof repository.delete).toBe("function");
    });
  });
});
