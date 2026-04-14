import { Student } from "@/domain/entities/Student";
import { StudentRepository } from "@/infrastructure/interfaces";
import { AppError } from "@/lib/errors/AppError";
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
      const mockStudents = [Student.create("김철수"), Student.create("이영희")];
      vi.spyOn(mockStudentRepository, "getAll").mockResolvedValue(mockStudents);

      // Act
      const result = await service.getAllStudents("test-academy-id");

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("김철수");
      expect(result[1].name).toBe("이영희");
      expect(mockStudentRepository.getAll).toHaveBeenCalledWith("test-academy-id");
    });

    it("학생이 없을 때 빈 배열을 반환해야 한다", async () => {
      // Arrange
      vi.spyOn(mockStudentRepository, "getAll").mockResolvedValue([]);

      // Act
      const result = await service.getAllStudents("test-academy-id");

      // Assert
      expect(result).toHaveLength(0);
    });

    it("repository 에러 시 에러를 전파해야 한다 (silent fail 금지)", async () => {
      vi.spyOn(mockStudentRepository, "getAll").mockRejectedValue(
        new Error("DB connection failed")
      );

      await expect(service.getAllStudents("test-academy-id")).rejects.toThrow();
    });
  });

  describe("addStudent", () => {
    it("새로운 학생을 성공적으로 추가해야 한다", async () => {
      // Arrange
      const input = { name: "박민수" };
      const mockStudent = Student.create(input.name);
      vi.spyOn(mockStudentRepository, "getAll").mockResolvedValue([]);
      vi.spyOn(mockStudentRepository, "create").mockResolvedValue(mockStudent);

      // Act
      const result = await service.addStudent(input, "test-academy-id");

      // Assert
      expect(result.name).toBe("박민수");
      expect(mockStudentRepository.create).toHaveBeenCalledWith(
        input,
        "test-academy-id"
      );
    });

    it("중복 이름 추가 시 STUDENT_NAME_DUPLICATE AppError를 throw해야 한다", async () => {
      vi.spyOn(mockStudentRepository, "getAll").mockResolvedValue([
        Student.create("박민수"),
      ]);

      const error = await service
        .addStudent({ name: "박민수" }, "test-academy-id")
        .catch((e) => e);

      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe("STUDENT_NAME_DUPLICATE");
      expect(error.statusHint).toBe(409);
    });
  });

  describe("getStudentById", () => {
    it("ID로 학생을 성공적으로 조회해야 한다", async () => {
      // Arrange
      const studentId = "test-id";
      const mockStudent = Student.create("김철수");

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

    it("repository 에러 시 에러를 전파해야 한다 (silent fail 금지)", async () => {
      vi.spyOn(mockStudentRepository, "getById").mockRejectedValue(
        new Error("DB connection failed")
      );

      await expect(service.getStudentById("any-id")).rejects.toThrow();
    });
  });

  describe("updateStudent", () => {
    it("학생을 성공적으로 업데이트해야 한다", async () => {
      // Arrange
      const studentId = "test-id";
      const updateData = { name: "김영희" };
      const existingStudent = Student.create("김철수");
      const updatedStudent = Student.create(updateData.name);

      vi.spyOn(mockStudentRepository, "getById").mockResolvedValue(existingStudent);
      vi.spyOn(mockStudentRepository, "getAll").mockResolvedValue([existingStudent]);
      vi.spyOn(mockStudentRepository, "update").mockResolvedValue(updatedStudent);

      // Act
      const result = await service.updateStudent(studentId, updateData, "test-academy-id");

      // Assert
      expect(result.name).toBe("김영희");
      expect(mockStudentRepository.getById).toHaveBeenCalledWith(studentId, "test-academy-id");
      expect(mockStudentRepository.update).toHaveBeenCalledWith(studentId, updateData, "test-academy-id");
    });

    it("존재하지 않는 학생 업데이트 시 STUDENT_NOT_FOUND AppError를 throw해야 한다", async () => {
      vi.spyOn(mockStudentRepository, "getById").mockResolvedValue(null);

      const error = await service
        .updateStudent("non-existent", { name: "새이름" }, "test-academy-id")
        .catch((e) => e);

      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe("STUDENT_NOT_FOUND");
      expect(error.statusHint).toBe(404);
    });

    it("이름 변경 시 중복 이름이면 STUDENT_NAME_DUPLICATE AppError를 throw해야 한다", async () => {
      const existingStudent = Student.create("김철수");
      const otherStudent = Student.create("이영희");
      vi.spyOn(mockStudentRepository, "getById").mockResolvedValue(existingStudent);
      vi.spyOn(mockStudentRepository, "getAll").mockResolvedValue([
        existingStudent,
        otherStudent,
      ]);

      const error = await service
        .updateStudent("some-id", { name: "이영희" }, "test-academy-id")
        .catch((e) => e);

      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe("STUDENT_NAME_DUPLICATE");
      expect(error.statusHint).toBe(409);
    });
  });

  describe("deleteStudent", () => {
    it("학생을 성공적으로 삭제해야 한다", async () => {
      // Arrange
      const studentId = "test-id";
      vi.spyOn(mockStudentRepository, "delete").mockResolvedValue();

      // Act
      const userId = "test-academy-id";
      await service.deleteStudent(studentId, userId);

      // Assert
      expect(mockStudentRepository.delete).toHaveBeenCalledWith(
        studentId,
        userId
      );
    });
  });
});
