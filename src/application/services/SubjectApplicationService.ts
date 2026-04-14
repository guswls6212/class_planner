import { Subject } from "@/domain/entities/Subject";
import { logger } from "../../lib/logger";
import { SubjectRepository } from "@/infrastructure/interfaces";
import { AppError } from "@/lib/errors/AppError";

export class SubjectApplicationServiceImpl {
  constructor(private subjectRepository: SubjectRepository) {}

  async getAllSubjects(academyId: string): Promise<Subject[]> {
    return this.subjectRepository.getAll(academyId);
  }

  async getSubjectById(id: string): Promise<Subject | null> {
    return this.subjectRepository.getById(id);
  }

  async addSubject(
    subjectData: { name: string; color: string },
    academyId: string
  ): Promise<Subject> {
    try {
      const existingSubjects = await this.subjectRepository.getAll(academyId);
      const isDuplicate = existingSubjects.some(
        (subject) => subject.name === subjectData.name
      );

      if (isDuplicate) {
        throw new AppError("SUBJECT_NAME_DUPLICATE", { statusHint: 409 });
      }

      const newSubject = Subject.create(subjectData.name, subjectData.color);
      return await this.subjectRepository.create(
        { name: newSubject.name, color: newSubject.color.value },
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
          subject.name === subjectData.name && subject.id.value !== id
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
