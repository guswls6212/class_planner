import { Student } from "@/domain/entities/Student";
import { StudentRepository } from "@/infrastructure/interfaces";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StudentApplicationServiceImpl } from "../StudentApplicationService";

// Mock Repository
const mockStudentRepository: StudentRepository = {
  getAll: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

describe("StudentApplicationService", () => {
  let service: StudentApplicationServiceImpl;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new StudentApplicationServiceImpl(mockStudentRepository);
  });

  describe("getAllStudents", () => {
    it("모든 학생을 성공적으로 조회해야 한다", async () => {
      // Arrange
      const mockStudents = [
        Student.create("김철수", "male"),
        Student.create("이영희", "female"),
      ];
      vi.spyOn(mockStudentRepository, "getAll").mockResolvedValue(mockStudents);

      // Act
      const result = await service.getAllStudents();

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("김철수");
      expect(result[1].name).toBe("이영희");
      expect(mockStudentRepository.getAll).toHaveBeenCalledTimes(1);
    });

    it("학생이 없을 때 빈 배열을 반환해야 한다", async () => {
      // Arrange
      vi.spyOn(mockStudentRepository, "getAll").mockResolvedValue([]);

      // Act
      const result = await service.getAllStudents();

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe("addStudent", () => {
    it("새로운 학생을 성공적으로 추가해야 한다", async () => {
      // Arrange
      const input = { name: "박민수", gender: "male" as const };
      const mockStudent = Student.create(input.name, input.gender);

      vi.spyOn(mockStudentRepository, "create").mockResolvedValue(mockStudent);

      // Act
      const result = await service.addStudent(input);

      // Assert
      expect(result.name).toBe("박민수");
      expect(result.gender).toBe("male");
      expect(mockStudentRepository.create).toHaveBeenCalledWith(input);
    });
  });

  describe("getStudentById", () => {
    it("ID로 학생을 성공적으로 조회해야 한다", async () => {
      // Arrange
      const studentId = "test-id";
      const mockStudent = Student.create("김철수", "male");

      vi.spyOn(mockStudentRepository, "getById").mockResolvedValue(mockStudent);

      // Act
      const result = await service.getStudentById(studentId);

      // Assert
      expect(result?.name).toBe("김철수");
      expect(mockStudentRepository.getById).toHaveBeenCalledWith(studentId);
    });

    it("존재하지 않는 학생 ID로 조회 시 null을 반환해야 한다", async () => {
      // Arrange
      const studentId = "non-existent-id";
      vi.spyOn(mockStudentRepository, "getById").mockResolvedValue(null);

      // Act
      const result = await service.getStudentById(studentId);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe("updateStudent", () => {
    it("학생을 성공적으로 업데이트해야 한다", async () => {
      // Arrange
      const studentId = "test-id";
      const updateData = { name: "김영희", gender: "female" as const };
      const existingStudent = Student.create("김철수", "male");
      const updatedStudent = Student.create(updateData.name, updateData.gender);

      // Mock: 기존 학생이 존재한다고 설정
      vi.spyOn(mockStudentRepository, "getById").mockResolvedValue(
        existingStudent
      );
      // Mock: 업데이트 결과 설정
      vi.spyOn(mockStudentRepository, "update").mockResolvedValue(
        updatedStudent
      );

      // Act
      const result = await service.updateStudent(studentId, updateData);

      // Assert
      expect(result.name).toBe("김영희");
      expect(result.gender).toBe("female");
      expect(mockStudentRepository.getById).toHaveBeenCalledWith(studentId);
      expect(mockStudentRepository.update).toHaveBeenCalledWith(
        studentId,
        updateData
      );
    });
  });

  describe("deleteStudent", () => {
    it("학생을 성공적으로 삭제해야 한다", async () => {
      // Arrange
      const studentId = "test-id";
      vi.spyOn(mockStudentRepository, "delete").mockResolvedValue();

      // Act
      await service.deleteStudent(studentId);

      // Assert
      expect(mockStudentRepository.delete).toHaveBeenCalledWith(studentId);
    });
  });
});
