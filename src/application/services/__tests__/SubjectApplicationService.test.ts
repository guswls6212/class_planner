import { Subject } from "@/domain/entities/Subject";
import { SubjectRepository } from "@/infrastructure/interfaces";
import { AppError } from "@/lib/errors/AppError";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SubjectApplicationServiceImpl } from "../SubjectApplicationService";

// Mock Repository
const mockSubjectRepository: SubjectRepository = {
  getAll: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

describe("SubjectApplicationService", () => {
  let service: SubjectApplicationServiceImpl;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SubjectApplicationServiceImpl(mockSubjectRepository);
  });

  describe("getAllSubjects", () => {
    it("모든 과목을 성공적으로 조회해야 한다", async () => {
      // Arrange
      const mockSubjects = [
        Subject.create("수학", "#FF0000"),
        Subject.create("영어", "#00FF00"),
      ];
      vi.spyOn(mockSubjectRepository, "getAll").mockResolvedValue(mockSubjects);

      // Act
      const result = await service.getAllSubjects("test-academy-id");

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("수학");
      expect(result[1].name).toBe("영어");
      expect(mockSubjectRepository.getAll).toHaveBeenCalledWith("test-academy-id");
    });

    it("과목이 없을 때 빈 배열을 반환해야 한다", async () => {
      // Arrange
      vi.spyOn(mockSubjectRepository, "getAll").mockResolvedValue([]);

      // Act
      const result = await service.getAllSubjects("test-academy-id");

      // Assert
      expect(result).toHaveLength(0);
    });

    it("repository 에러 시 에러를 전파해야 한다 (silent fail 금지)", async () => {
      vi.spyOn(mockSubjectRepository, "getAll").mockRejectedValue(
        new Error("DB connection failed")
      );

      await expect(service.getAllSubjects("test-academy-id")).rejects.toThrow();
    });
  });

  describe("addSubject", () => {
    it("새로운 과목을 성공적으로 추가해야 한다", async () => {
      // Arrange
      const input = { name: "과학", color: "#0000FF" };
      const mockSubject = Subject.create(input.name, input.color);
      vi.spyOn(mockSubjectRepository, "getAll").mockResolvedValue([]);
      vi.spyOn(mockSubjectRepository, "create").mockResolvedValue(mockSubject);

      // Act
      const result = await service.addSubject(input, "test-academy-id");

      // Assert
      expect(result.name).toBe("과학");
      expect(result.color.value).toBe("#0000FF");
      expect(mockSubjectRepository.create).toHaveBeenCalledWith(
        { name: "과학", color: "#0000FF" },
        "test-academy-id"
      );
    });

    it("중복 이름 추가 시 SUBJECT_NAME_DUPLICATE AppError를 throw해야 한다", async () => {
      vi.spyOn(mockSubjectRepository, "getAll").mockResolvedValue([
        Subject.create("수학", "#FF0000"),
      ]);

      const error = await service
        .addSubject({ name: "수학", color: "#FF0000" }, "test-academy-id")
        .catch((e) => e);

      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe("SUBJECT_NAME_DUPLICATE");
      expect(error.statusHint).toBe(409);
    });
  });

  describe("getSubjectById", () => {
    it("ID로 과목을 성공적으로 조회해야 한다", async () => {
      // Arrange
      const subjectId = "test-id";
      const mockSubject = Subject.create("수학", "#FF0000");

      vi.spyOn(mockSubjectRepository, "getById").mockResolvedValue(mockSubject);

      // Act
      const result = await service.getSubjectById(subjectId);

      // Assert
      expect(result?.name).toBe("수학");
      expect(mockSubjectRepository.getById).toHaveBeenCalledWith(subjectId);
    });

    it("존재하지 않는 과목 ID로 조회 시 null을 반환해야 한다", async () => {
      // Arrange
      const subjectId = "non-existent-id";
      vi.spyOn(mockSubjectRepository, "getById").mockResolvedValue(null);

      // Act
      const result = await service.getSubjectById(subjectId);

      // Assert
      expect(result).toBeNull();
    });

    it("repository 에러 시 에러를 전파해야 한다 (silent fail 금지)", async () => {
      vi.spyOn(mockSubjectRepository, "getById").mockRejectedValue(
        new Error("DB connection failed")
      );

      await expect(service.getSubjectById("any-id")).rejects.toThrow();
    });
  });

  describe("updateSubject", () => {
    it("과목을 성공적으로 업데이트해야 한다", async () => {
      // Arrange
      const subjectId = "test-id";
      const updateData = { name: "수학", color: "#FF0000" };
      const existingSubject = Subject.create("영어", "#0000FF");
      const updatedSubject = Subject.create(updateData.name, updateData.color);

      vi.spyOn(mockSubjectRepository, "getById").mockResolvedValue(existingSubject);
      vi.spyOn(mockSubjectRepository, "getAll").mockResolvedValue([existingSubject]);
      vi.spyOn(mockSubjectRepository, "update").mockResolvedValue(updatedSubject);

      // Act
      const result = await service.updateSubject(subjectId, updateData, "test-academy-id");

      // Assert
      expect(result.name).toBe("수학");
      expect(result.color.value).toBe("#FF0000");
      expect(mockSubjectRepository.getById).toHaveBeenCalledWith(subjectId, "test-academy-id");
      expect(mockSubjectRepository.update).toHaveBeenCalledWith(subjectId, updateData, "test-academy-id");
    });

    it("존재하지 않는 과목 업데이트 시 SUBJECT_NOT_FOUND AppError를 throw해야 한다", async () => {
      vi.spyOn(mockSubjectRepository, "getById").mockResolvedValue(null);

      const error = await service
        .updateSubject("non-existent", { name: "수학", color: "#FF0000" }, "test-academy-id")
        .catch((e) => e);

      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe("SUBJECT_NOT_FOUND");
      expect(error.statusHint).toBe(404);
    });

    it("이름 변경 시 중복 이름이면 SUBJECT_NAME_DUPLICATE AppError를 throw해야 한다", async () => {
      const existingSubject = Subject.create("영어", "#0000FF");
      const otherSubject = Subject.create("수학", "#FF0000");
      vi.spyOn(mockSubjectRepository, "getById").mockResolvedValue(existingSubject);
      vi.spyOn(mockSubjectRepository, "getAll").mockResolvedValue([
        existingSubject,
        otherSubject,
      ]);

      const error = await service
        .updateSubject("some-id", { name: "수학", color: "#FF0000" }, "test-academy-id")
        .catch((e) => e);

      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe("SUBJECT_NAME_DUPLICATE");
      expect(error.statusHint).toBe(409);
    });
  });

  describe("deleteSubject", () => {
    it("과목을 성공적으로 삭제해야 한다", async () => {
      // Arrange
      const subjectId = "test-id";
      vi.spyOn(mockSubjectRepository, "delete").mockResolvedValue();

      // Act
      await service.deleteSubject(subjectId, "test-academy-id");

      // Assert
      expect(mockSubjectRepository.delete).toHaveBeenCalledWith(subjectId, "test-academy-id");
    });
  });
});
