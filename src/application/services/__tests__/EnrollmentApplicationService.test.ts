import { EnrollmentRepository } from "@/infrastructure/interfaces";
import { AppError } from "@/lib/errors/AppError";
import { Enrollment } from "@/shared/types/DomainTypes";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EnrollmentApplicationServiceImpl } from "../EnrollmentApplicationService";

const makeEnrollment = (id: string): Enrollment => ({
  id,
  studentId: "student-1",
  subjectId: "subject-1",
  createdAt: new Date(),
  updatedAt: new Date(),
});

const mockEnrollmentRepository: EnrollmentRepository = {
  getAll: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

describe("EnrollmentApplicationService", () => {
  let service: EnrollmentApplicationServiceImpl;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new EnrollmentApplicationServiceImpl(mockEnrollmentRepository);
  });

  describe("getAllEnrollments", () => {
    it("모든 수강신청을 성공적으로 조회해야 한다", async () => {
      const enrollments = [makeEnrollment("e1"), makeEnrollment("e2")];
      vi.spyOn(mockEnrollmentRepository, "getAll").mockResolvedValue(enrollments);

      const result = await service.getAllEnrollments("test-academy-id");

      expect(result).toHaveLength(2);
      expect(mockEnrollmentRepository.getAll).toHaveBeenCalledWith("test-academy-id");
    });

    it("repository 에러 시 에러를 전파해야 한다", async () => {
      vi.spyOn(mockEnrollmentRepository, "getAll").mockRejectedValue(
        new Error("DB error")
      );

      await expect(service.getAllEnrollments("test-academy-id")).rejects.toThrow();
    });
  });

  describe("getEnrollmentById", () => {
    it("ID로 수강신청을 성공적으로 조회해야 한다", async () => {
      const enrollment = makeEnrollment("e1");
      vi.spyOn(mockEnrollmentRepository, "getById").mockResolvedValue(enrollment);

      const result = await service.getEnrollmentById("e1");

      expect(result?.id).toBe("e1");
    });

    it("존재하지 않는 수강신청 조회 시 null을 반환해야 한다", async () => {
      vi.spyOn(mockEnrollmentRepository, "getById").mockResolvedValue(null);

      const result = await service.getEnrollmentById("non-existent");

      expect(result).toBeNull();
    });

    it("repository 에러 시 에러를 전파해야 한다", async () => {
      vi.spyOn(mockEnrollmentRepository, "getById").mockRejectedValue(
        new Error("DB error")
      );

      await expect(service.getEnrollmentById("e1")).rejects.toThrow();
    });
  });

  describe("addEnrollment", () => {
    it("수강신청을 성공적으로 생성해야 한다", async () => {
      const enrollment = makeEnrollment("e1");
      vi.spyOn(mockEnrollmentRepository, "create").mockResolvedValue(enrollment);

      const result = await service.addEnrollment(
        { studentId: "student-1", subjectId: "subject-1" },
        "test-academy-id"
      );

      expect(result.id).toBe("e1");
      expect(mockEnrollmentRepository.create).toHaveBeenCalledWith(
        { studentId: "student-1", subjectId: "subject-1" },
        "test-academy-id"
      );
    });

    it("repository 에러 시 에러를 전파해야 한다", async () => {
      vi.spyOn(mockEnrollmentRepository, "create").mockRejectedValue(
        new Error("DB error")
      );

      await expect(
        service.addEnrollment(
          { studentId: "student-1", subjectId: "subject-1" },
          "test-academy-id"
        )
      ).rejects.toThrow();
    });
  });

  describe("deleteEnrollment", () => {
    it("수강신청을 성공적으로 삭제해야 한다", async () => {
      vi.spyOn(mockEnrollmentRepository, "delete").mockResolvedValue();

      await service.deleteEnrollment("e1");

      expect(mockEnrollmentRepository.delete).toHaveBeenCalledWith("e1");
    });

    it("repository 에러 시 에러를 전파해야 한다", async () => {
      vi.spyOn(mockEnrollmentRepository, "delete").mockRejectedValue(
        new Error("DB error")
      );

      await expect(service.deleteEnrollment("e1")).rejects.toThrow();
    });
  });
});
