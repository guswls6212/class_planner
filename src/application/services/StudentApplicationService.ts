import { Student } from "@/domain/entities/Student";
import { StudentRepository } from "@/infrastructure/interfaces";
import { AppError } from "@/lib/errors/AppError";
import { logger } from "../../lib/logger";

export class StudentApplicationServiceImpl {
  constructor(private studentRepository: StudentRepository) {}

  async getAllStudents(academyId: string): Promise<Student[]> {
    return this.studentRepository.getAll(academyId);
  }

  async getStudentById(id: string): Promise<Student | null> {
    return this.studentRepository.getById(id);
  }

  async addStudent(
    studentData: { name: string; gender?: string; birthDate?: string },
    academyId: string
  ): Promise<Student> {
    try {
      const existingStudents = await this.studentRepository.getAll(academyId);
      const isDuplicate = existingStudents.some(
        (student) => student.name === studentData.name
      );

      if (isDuplicate) {
        throw new AppError("STUDENT_NAME_DUPLICATE", { statusHint: 409 });
      }

      return await this.studentRepository.create(studentData, academyId);
    } catch (error) {
      logger.error("학생 추가 중 에러 발생:", undefined, error as Error);
      throw error;
    }
  }

  async updateStudent(
    id: string,
    studentData: { name?: string; gender?: string; birthDate?: string },
    academyId: string
  ): Promise<Student> {
    try {
      const existingStudent = await this.studentRepository.getById(id, academyId);
      if (!existingStudent) {
        throw new AppError("STUDENT_NOT_FOUND", { statusHint: 404 });
      }

      if (studentData.name !== undefined) {
        const existingStudents = await this.studentRepository.getAll(academyId);
        const isDuplicate = existingStudents.some(
          (student) =>
            student.name === studentData.name && student.id.value !== id
        );

        if (isDuplicate) {
          throw new AppError("STUDENT_NAME_DUPLICATE", { statusHint: 409 });
        }
      }

      return await this.studentRepository.update(id, studentData, academyId);
    } catch (error) {
      logger.error("학생 업데이트 중 에러 발생:", undefined, error as Error);
      throw error;
    }
  }

  async deleteStudent(id: string, academyId: string): Promise<void> {
    try {
      return await this.studentRepository.delete(id, academyId);
    } catch (error) {
      logger.error("학생 삭제 중 에러 발생:", undefined, error as Error);
      throw error;
    }
  }
}
