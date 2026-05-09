import { Student } from "@/domain/entities/Student";
import { StudentRepository } from "@/infrastructure/interfaces";
import { AppError } from "@/lib/errors/AppError";
import { logger } from "../../lib/logger";

export class StudentApplicationServiceImpl {
  constructor(private studentRepository: StudentRepository) {}

  async getAllStudents(academyId: string): Promise<Student[]> {
    return this.studentRepository.getAll(academyId);
  }

  async getStudentById(id: string, academyId?: string): Promise<Student | null> {
    return this.studentRepository.getById(id, academyId);
  }

  async addStudent(
    studentData: { id?: string; name: string; gender?: string; birthDate?: string },
    academyId: string
  ): Promise<Student> {
    try {
      // Idempotent get-or-create: 같은 academy의 같은 이름 학생이 이미 있으면 그
      // row 반환. client UUID 명시 여부와 무관 — students table에 (academy_id, name)
      // UNIQUE 제약은 없지만 client localStorage가 server와 sync 안 된 상태에서
      // 같은 이름 추가 시 서버 측에 중복 row가 생기는 잠재 issue 차단.
      // teacher idempotent (PR #299) 동일 패턴.
      const existingStudents = await this.studentRepository.getAll(academyId);
      const dup = existingStudents.find(
        (student) => student.name === studentData.name,
      );
      if (dup) {
        logger.info("addStudent: name duplicate → returning existing", {
          requestedId: studentData.id ?? null,
          existingId: dup.id.value,
          name: studentData.name,
        });
        return dup;
      }

      return await this.studentRepository.create(studentData, academyId);
    } catch (error) {
      logger.error("학생 추가 중 에러 발생:", undefined, error as Error);
      throw error;
    }
  }

  async updateStudent(
    id: string,
    studentData: {
      name?: string;
      gender?: string;
      birthDate?: string;
      grade?: string;
      school?: string;
      phone?: string;
    },
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
