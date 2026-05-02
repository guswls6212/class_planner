import { Teacher } from "@/domain/entities/Teacher";
import type { TeacherRole } from "@/domain/entities/Teacher";
import { TeacherRepository } from "@/infrastructure/interfaces";
import { AppError } from "@/lib/errors/AppError";
import { logger } from "../../lib/logger";

export class TeacherApplicationServiceImpl {
  constructor(private teacherRepository: TeacherRepository) {}

  async getAllTeachers(academyId: string): Promise<Teacher[]> {
    return this.teacherRepository.getAll(academyId);
  }

  async getTeacherById(id: string): Promise<Teacher | null> {
    return this.teacherRepository.getById(id);
  }

  async addTeacher(
    teacherData: { name: string; color: string; userId?: string | null; email?: string | null; phone?: string | null; role?: TeacherRole | null; notes?: string | null },
    academyId: string
  ): Promise<Teacher> {
    try {
      const existingTeachers = await this.teacherRepository.getAll(academyId);
      const isDuplicate = Teacher.isNameDuplicate(teacherData.name, existingTeachers);

      if (isDuplicate) {
        throw new AppError("TEACHER_NAME_DUPLICATE", { statusHint: 409 });
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

      if (teacherData.name) {
        const existingTeachers = await this.teacherRepository.getAll(academyId);
        const otherTeachers = existingTeachers.filter((t) => t.id.value !== id);
        if (Teacher.isNameDuplicate(teacherData.name, otherTeachers)) {
          throw new AppError("TEACHER_NAME_DUPLICATE", { statusHint: 409 });
        }
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
