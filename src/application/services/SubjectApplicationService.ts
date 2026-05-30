import { Subject } from "@/domain/entities/Subject";
import { logger } from "../../lib/logger";
import { SubjectRepository } from "@/infrastructure/interfaces";
import { AppError } from "@/lib/errors/AppError";

/**
 * 과목 중복 판정 (UAT 2026-05-10 정책): 이름 lowercase trim 일치.
 * '수학' = '수학'(앞뒤 공백) = '수학'(다른 케이스).
 */
function isSubjectNameDuplicate(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export class SubjectApplicationServiceImpl {
  constructor(private subjectRepository: SubjectRepository) {}

  async getAllSubjects(academyId: string): Promise<Subject[]> {
    return this.subjectRepository.getAll(academyId);
  }

  async getSubjectById(id: string, academyId?: string): Promise<Subject | null> {
    return this.subjectRepository.getById(id, academyId);
  }

  async addSubject(
    subjectData: { id?: string; name: string; color: string },
    academyId: string
  ): Promise<Subject> {
    try {
      // Idempotent get-or-create — student/teacher 패턴 동일. (academy_id, name)
      // UNIQUE 제약은 없지만 client/server sync 어긋난 상태에서 중복 row 생성을
      // 막아 데이터 정합성 유지.
      const existingSubjects = await this.subjectRepository.getAll(academyId);
      const dup = existingSubjects.find((subject) =>
        isSubjectNameDuplicate(subject.name, subjectData.name),
      );
      if (dup) {
        logger.info("addSubject: name duplicate → returning existing", {
          requestedId: subjectData.id ?? null,
          existingId: dup.id.value,
          name: subjectData.name,
        });
        return dup;
      }

      const newSubject = Subject.create(subjectData.name, subjectData.color);
      return await this.subjectRepository.create(
        {
          ...(subjectData.id && { id: subjectData.id }),
          name: newSubject.name,
          color: newSubject.color.value,
        },
        academyId
      );
    } catch (error) {
      logger.error("과목 추가 중 에러 발생:", undefined, error as Error);
      throw error;
    }
  }

  async updateSubject(
    id: string,
    subjectData: { name: string; color: string },
    academyId: string
  ): Promise<Subject> {
    try {
      const existingSubject = await this.subjectRepository.getById(id, academyId);
      if (!existingSubject) {
        throw new AppError("SUBJECT_NOT_FOUND", { statusHint: 404 });
      }

      const existingSubjects = await this.subjectRepository.getAll(academyId);
      const isDuplicate = existingSubjects.some(
        (subject) =>
          isSubjectNameDuplicate(subject.name, subjectData.name) &&
          subject.id.value !== id,
      );

      if (isDuplicate) {
        throw new AppError("SUBJECT_NAME_DUPLICATE", { statusHint: 409 });
      }

      return await this.subjectRepository.update(id, subjectData, academyId);
    } catch (error) {
      logger.error("과목 업데이트 중 에러 발생:", undefined, error as Error);
      throw error;
    }
  }

  async deleteSubject(id: string, academyId: string): Promise<void> {
    try {
      return await this.subjectRepository.delete(id, academyId);
    } catch (error) {
      logger.error("과목 삭제 중 에러 발생:", undefined, error as Error);
      throw error;
    }
  }
}
