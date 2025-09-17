import { Subject } from "@/domain/entities/Subject";
import { SubjectRepository } from "@/infrastructure/interfaces";
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
      const result = await service.getAllSubjects();

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("수학");
      expect(result[1].name).toBe("영어");
      expect(mockSubjectRepository.getAll).toHaveBeenCalledTimes(1);
    });

    it("과목이 없을 때 빈 배열을 반환해야 한다", async () => {
      // Arrange
      vi.spyOn(mockSubjectRepository, "getAll").mockResolvedValue([]);

      // Act
      const result = await service.getAllSubjects();

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe("addSubject", () => {
    it("새로운 과목을 성공적으로 추가해야 한다", async () => {
      // Arrange
      const input = { name: "과학", color: "#0000FF" };
      const mockSubject = Subject.create(input.name, input.color);

      vi.spyOn(mockSubjectRepository, "create").mockResolvedValue(mockSubject);

      // Act
      const result = await service.addSubject(input);

      // Assert
      expect(result.name).toBe("과학");
      expect(result.color.value).toBe("#0000FF");
      expect(mockSubjectRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "과학",
          color: expect.objectContaining({ value: "#0000FF" }),
        }),
        undefined
      );
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
  });

  describe("updateSubject", () => {
    it("과목을 성공적으로 업데이트해야 한다", async () => {
      // Arrange
      const subjectId = "test-id";
      const updateData = { name: "수학", color: "#FF0000" };
      const existingSubject = Subject.create("영어", "#0000FF");
      const updatedSubject = Subject.create(updateData.name, updateData.color);

      // Mock: 기존 과목이 존재한다고 설정
      vi.spyOn(mockSubjectRepository, "getById").mockResolvedValue(
        existingSubject
      );
      // Mock: 업데이트 결과 설정
      vi.spyOn(mockSubjectRepository, "update").mockResolvedValue(
        updatedSubject
      );

      // Act
      const result = await service.updateSubject(subjectId, updateData);

      // Assert
      expect(result.name).toBe("수학");
      expect(result.color.value).toBe("#FF0000");
      expect(mockSubjectRepository.getById).toHaveBeenCalledWith(subjectId);
      expect(mockSubjectRepository.update).toHaveBeenCalledWith(
        subjectId,
        updateData
      );
    });
  });

  describe("deleteSubject", () => {
    it("과목을 성공적으로 삭제해야 한다", async () => {
      // Arrange
      const subjectId = "test-id";
      vi.spyOn(mockSubjectRepository, "delete").mockResolvedValue();

      // Act
      await service.deleteSubject(subjectId);

      // Assert
      expect(mockSubjectRepository.delete).toHaveBeenCalledWith(subjectId);
    });
  });
});
