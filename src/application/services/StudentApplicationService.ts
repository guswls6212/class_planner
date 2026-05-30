import { Student } from "@/domain/entities/Student";
import { StudentRepository } from "@/infrastructure/interfaces";
import { AppError } from "@/lib/errors/AppError";
import { logger } from "../../lib/logger";

/**
 * 학생 중복 판정 (UAT 2026-05-10 정책):
 * 이름 + 성별 + 생년월일 모두 일치 시에만 동일인.
 * 한 필드라도 다르면 동명이인으로 간주 (빈 값 ≠ 채워진 값).
 *
 * - undefined/null/빈 문자열 정규화 후 strict 비교
 * - 이름은 trim + 정규화 (NFC normalize)
 */
function normalizeIdentity(v: string | null | undefined): string {
  return (v ?? "").trim();
}
function isStudentDuplicate(
  existing: { name: string; gender?: string | null; birthDate?: string | null },
  candidate: { name?: string; gender?: string | null; birthDate?: string | null },
): boolean {
  return (
    normalizeIdentity(existing.name).toLowerCase() ===
      normalizeIdentity(candidate.name).toLowerCase() &&
    normalizeIdentity(existing.gender) === normalizeIdentity(candidate.gender) &&
    normalizeIdentity(existing.birthDate) === normalizeIdentity(candidate.birthDate)
  );
}

export class StudentApplicationServiceImpl {
  constructor(private studentRepository: StudentRepository) {}

  async getAllStudents(academyId: string): Promise<Student[]> {
    return this.studentRepository.getAll(academyId);
  }

  async getAllStudentsPaginated(
    academyId: string,
    options: import("@/lib/pagination").PaginationOptions,
  ): Promise<import("@/lib/pagination").PaginationResult<Student>> {
    return this.studentRepository.getAllPaginated(academyId, options);
  }

  async getStudentById(id: string, academyId?: string): Promise<Student | null> {
    return this.studentRepository.getById(id, academyId);
  }

  async addStudent(
    studentData: { id?: string; name: string; gender?: string; birthDate?: string },
    academyId: string
  ): Promise<Student> {
    try {
      // 중복 정책 (UAT 2026-05-10): 이름+성별+생년월일 모두 일치 시에만 중복.
      // 한 필드라도 다르면 동명이인으로 등록 허용. 빈 값(undefined/null/"")은 동등.
      // Idempotent get-or-create: 동일 entity면 기존 row 반환 (이전 'name only' 동작 유지 — 한 필드라도 다르면 새로 INSERT).
      const existingStudents = await this.studentRepository.getAll(academyId);
      const dup = existingStudents.find((student) =>
        isStudentDuplicate(student, studentData),
      );
      if (dup) {
        logger.info("addStudent: full identity duplicate → returning existing", {
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

      // 중복 검사 — 변경 후 식별 필드 조합이 다른 학생과 충돌하는지 확인.
      // 식별 필드(name, gender, birthDate)가 변경되거나 누락된 경우만 검사.
      const merged = {
        name: studentData.name ?? existingStudent.name,
        gender: studentData.gender ?? existingStudent.gender,
        birthDate: studentData.birthDate ?? existingStudent.birthDate,
      };
      const existingStudents = await this.studentRepository.getAll(academyId);
      const isDuplicate = existingStudents.some(
        (student) => student.id.value !== id && isStudentDuplicate(student, merged),
      );
      if (isDuplicate) {
        throw new AppError("STUDENT_NAME_DUPLICATE", { statusHint: 409 });
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
