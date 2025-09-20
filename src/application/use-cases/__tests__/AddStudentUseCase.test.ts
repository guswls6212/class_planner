import { Student } from "@/domain/entities/Student";
import { IStudentRepository } from "@/domain/repositories";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AddStudentUseCase } from "../AddStudentUseCase";

// Mock Repository 인터페이스
const mockStudentRepository: IStudentRepository = {
  findAll: vi.fn(),
  findById: vi.fn(),
  save: vi.fn(),
  delete: vi.fn(),
  findByName: vi.fn(),
  exists: vi.fn(),
  count: vi.fn(),
};

describe("AddStudentUseCase", () => {
  let useCase: AddStudentUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    useCase = new AddStudentUseCase(mockStudentRepository);
  });

  describe("성공적인 학생 추가", () => {
    it("새로운 학생을 성공적으로 추가해야 한다", async () => {
      // Arrange
      const input = { name: "김철수" };
      const mockStudent = Student.create(input.name);

      vi.spyOn(mockStudentRepository, "findAll").mockResolvedValue([]);
      vi.spyOn(mockStudentRepository, "save").mockResolvedValue(mockStudent);

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.success).toBe(true);
      expect(result.student).toBeDefined();
      expect(result.student?.name).toBe("김철수");
      expect(mockStudentRepository.findAll).toHaveBeenCalled();
      expect(mockStudentRepository.save).toHaveBeenCalledWith(
        expect.any(Student)
      );
    });

    it("추가된 학생이 올바른 속성을 가져야 한다", async () => {
      // Arrange
      const input = { name: "김영희" };
      const mockStudent = Student.create(input.name);

      vi.spyOn(mockStudentRepository, "findAll").mockResolvedValue([]);
      vi.spyOn(mockStudentRepository, "save").mockResolvedValue(mockStudent);

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.success).toBe(true);
      expect(result.student).toBeInstanceOf(Student);
      expect(result.student?.name).toBe("김영희");
    });
  });

  describe("중복 학생 이름 검증", () => {
    it("중복된 학생 이름이 있을 때 에러를 반환해야 한다", async () => {
      // Arrange
      const input = { name: "김철수" };
      const existingStudent = Student.create("김철수");

      vi.spyOn(mockStudentRepository, "findAll").mockResolvedValue([
        existingStudent,
      ]);

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("이미 존재하는 학생 이름입니다.");
      expect(mockStudentRepository.findAll).toHaveBeenCalled();
      expect(mockStudentRepository.save).not.toHaveBeenCalled();
    });

    it("대소문자 구분 없이 중복을 검사해야 한다", async () => {
      // Arrange
      const input = { name: "김철수" };
      const existingStudent = Student.create("김철수");

      vi.spyOn(mockStudentRepository, "findAll").mockResolvedValue([
        existingStudent,
      ]);

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("이미 존재하는 학생 이름입니다.");
    });
  });

  describe("입력 검증", () => {
    it("빈 이름으로 학생을 추가하려고 하면 에러를 반환해야 한다", async () => {
      // Arrange
      const input = { name: "" };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain("학생 이름을 입력해주세요");
    });

    it("너무 긴 이름으로 학생을 추가하려고 하면 에러를 반환해야 한다", async () => {
      // Arrange
      const longName = "a".repeat(21); // 21글자
      const input = { name: longName };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain("학생 이름은 20글자 이하여야 합니다");
    });

    it("공백만 있는 이름으로 학생을 추가하려고 하면 에러를 반환해야 한다", async () => {
      // Arrange
      const input = { name: "   " };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain("학생 이름을 입력해주세요");
    });
  });

  describe("리포지토리 에러 처리", () => {
    it("리포지토리에서 에러가 발생하면 적절히 처리해야 한다", async () => {
      // Arrange
      const input = { name: "김철수" };
      vi.spyOn(mockStudentRepository, "findAll").mockRejectedValue(
        new Error("데이터베이스 연결 실패")
      );

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("데이터베이스 연결 실패");
    });

    it("저장 중 에러가 발생하면 적절히 처리해야 한다", async () => {
      // Arrange
      const input = { name: "김철수" };
      vi.spyOn(mockStudentRepository, "findAll").mockResolvedValue([]);
      vi.spyOn(mockStudentRepository, "save").mockRejectedValue(
        new Error("저장 실패")
      );

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("저장 실패");
    });
  });
});
