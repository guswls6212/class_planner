import { Teacher } from "@/domain/entities/Teacher";
import type { TeacherRole } from "@/domain/entities/Teacher";
import { TeacherRepository } from "@/infrastructure/interfaces";
import { AppError } from "@/lib/errors/AppError";
import { logger } from "../../lib/logger";

/**
 * 강사 중복 판정 (UAT 2026-05-10 정책):
 * 이름 + 이메일 + 전화 모두 일치 시에만 동일인.
 * 한 필드라도 다르면 동명이인으로 등록 허용. 빈 값 정규화 후 strict 비교.
 */
function normalizeIdentity(v: string | null | undefined): string {
  return (v ?? "").trim();
}
function isTeacherDuplicate(
  existing: { name: string; email?: string | null; phone?: string | null },
  candidate: { name?: string; email?: string | null; phone?: string | null },
): boolean {
  return (
    normalizeIdentity(existing.name).toLowerCase() ===
      normalizeIdentity(candidate.name).toLowerCase() &&
    normalizeIdentity(existing.email) === normalizeIdentity(candidate.email) &&
    normalizeIdentity(existing.phone) === normalizeIdentity(candidate.phone)
  );
}

export class TeacherApplicationServiceImpl {
  constructor(private teacherRepository: TeacherRepository) {}

  async getAllTeachers(academyId: string): Promise<Teacher[]> {
    return this.teacherRepository.getAll(academyId);
  }

  async getAllTeachersPaginated(
    academyId: string,
    options: import("@/lib/pagination").PaginationOptions,
  ): Promise<import("@/lib/pagination").PaginationResult<Teacher>> {
    return this.teacherRepository.getAllPaginated(academyId, options);
  }

  async getTeacherById(id: string): Promise<Teacher | null> {
    return this.teacherRepository.getById(id);
  }

  async addTeacher(
    teacherData: { id?: string; name: string; color: string; userId?: string | null; email?: string | null; phone?: string | null; role?: TeacherRole | null; notes?: string | null },
    academyId: string
  ): Promise<Teacher> {
    try {
      // 중복 정책 (UAT 2026-05-10): 이름+이메일+전화 모두 일치 시에만 동일인.
      // Idempotent get-or-create: 동일 entity면 기존 row 반환. 한 필드라도 다르면
      // 동명이인으로 새 row INSERT (DB UNIQUE 제약 없음 가정 — 이전 student/subject 패턴 통일).
      const existingTeachers = await this.teacherRepository.getAll(academyId);
      const dup = existingTeachers.find((t) =>
        isTeacherDuplicate(
          { name: t.name, email: t.email, phone: t.phone },
          teacherData,
        ),
      );
      if (dup) {
        logger.info("addTeacher: full identity duplicate → returning existing", {
          requestedId: teacherData.id ?? null,
          existingId: dup.id.value,
          name: teacherData.name,
        });
        return dup;
      }

      const newTeacher = Teacher.create(
        teacherData.name,
        teacherData.color,
        teacherData.userId ?? undefined,
        {
          email: teacherData.email,
          phone: teacherData.phone,
          role: teacherData.role ?? "member",
          notes: teacherData.notes,
        }
      );

      return await this.teacherRepository.create(
        {
          ...(teacherData.id && { id: teacherData.id }),
          name: newTeacher.name,
          color: newTeacher.color.value,
          userId: newTeacher.userId,
          email: newTeacher.email,
          phone: newTeacher.phone,
          role: newTeacher.role,
          notes: newTeacher.notes,
        },
        academyId
      );
    } catch (error) {
      logger.error("강사 추가 중 에러 발생:", undefined, error as Error);
      throw error;
    }
  }

  async updateTeacher(
    id: string,
    teacherData: { name?: string; color?: string; userId?: string | null; email?: string | null; phone?: string | null; role?: TeacherRole | null; notes?: string | null },
    academyId: string
  ): Promise<Teacher> {
    try {
      const existingTeacher = await this.teacherRepository.getById(id, academyId);
      if (!existingTeacher) {
        throw new AppError("TEACHER_NOT_FOUND", { statusHint: 404 });
      }

      // 중복 검사 (UAT 2026-05-10) — 변경 후 식별 조합이 다른 강사와 충돌하는지.
      const merged = {
        name: teacherData.name ?? existingTeacher.name,
        email: teacherData.email ?? existingTeacher.email,
        phone: teacherData.phone ?? existingTeacher.phone,
      };
      const existingTeachers = await this.teacherRepository.getAll(academyId);
      const isDuplicate = existingTeachers.some(
        (t) =>
          t.id.value !== id &&
          isTeacherDuplicate({ name: t.name, email: t.email, phone: t.phone }, merged),
      );
      if (isDuplicate) {
        throw new AppError("TEACHER_NAME_DUPLICATE", { statusHint: 409 });
      }

      return await this.teacherRepository.update(id, teacherData, academyId);
    } catch (error) {
      logger.error("강사 업데이트 중 에러 발생:", undefined, error as Error);
      throw error;
    }
  }

  async deleteTeacher(id: string, academyId: string): Promise<void> {
    try {
      return await this.teacherRepository.delete(id, academyId);
    } catch (error) {
      logger.error("강사 삭제 중 에러 발생:", undefined, error as Error);
      throw error;
    }
  }

  async addTeacherSubject(teacherId: string, subjectId: string, academyId: string): Promise<void> {
    return this.teacherRepository.addSubject(teacherId, subjectId, academyId);
  }

  async removeTeacherSubject(teacherId: string, subjectId: string, academyId: string): Promise<void> {
    return this.teacherRepository.removeSubject(teacherId, subjectId, academyId);
  }

  async getTeacherSubjects(teacherId: string): Promise<string[]> {
    return this.teacherRepository.getSubjectIds(teacherId);
  }
}
