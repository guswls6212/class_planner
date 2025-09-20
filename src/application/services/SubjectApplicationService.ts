import { Subject } from "@/domain/entities/Subject";
import { logger } from "../../lib/logger";
import { SubjectRepository } from "@/infrastructure/interfaces";

export class SubjectApplicationServiceImpl {
  constructor(private subjectRepository: SubjectRepository) {}

  async getAllSubjects(userId: string): Promise<Subject[]> {
    try {
      return await this.subjectRepository.getAll(userId);
    } catch (error) {
      logger.error("과목 목록 조회 중 에러 발생:", undefined, error as Error);
      return [];
    }
  }

  async getSubjectById(id: string): Promise<Subject | null> {
    try {
      return await this.subjectRepository.getById(id);
    } catch (error) {
      logger.error("과목 조회 중 에러 발생:", undefined, error as Error);
      return null;
    }
  }

  async addSubject(
    subjectData: {
      name: string;
      color: string;
    },
    userId: string
  ): Promise<Subject> {
    try {
      // 중복 체크
      const existingSubjects = await this.subjectRepository.getAll(userId);
      const isDuplicate = existingSubjects.some(
        (subject) => subject.name === subjectData.name
      );

      if (isDuplicate) {
        throw new Error("이미 존재하는 과목 이름입니다.");
      }

      const newSubject = Subject.create(subjectData.name, subjectData.color);
      return await this.subjectRepository.create(
        { name: newSubject.name, color: newSubject.color.value },
        userId
      );
    } catch (error) {
      logger.error("과목 추가 중 에러 발생:", undefined, error as Error);
      throw error;
    }
  }

  async updateSubject(
    id: string,
    subjectData: { name: string; color: string },
    userId: string
  ): Promise<Subject> {
    try {
      // 기존 과목 조회
      const existingSubject = await this.subjectRepository.getById(id, userId);
      if (!existingSubject) {
        throw new Error("존재하지 않는 과목입니다.");
      }

      // 중복 체크 (자기 자신 제외)
      const existingSubjects = await this.subjectRepository.getAll(userId);
      const isDuplicate = existingSubjects.some(
        (subject) =>
          subject.name === subjectData.name && subject.id.value !== id
      );

      if (isDuplicate) {
        throw new Error("이미 존재하는 과목 이름입니다.");
      }

      return await this.subjectRepository.update(id, subjectData);
    } catch (error) {
      logger.error("과목 업데이트 중 에러 발생:", undefined, error as Error);
      throw error;
    }
  }

  async deleteSubject(id: string): Promise<void> {
    try {
      return await this.subjectRepository.delete(id);
    } catch (error) {
      logger.error("과목 삭제 중 에러 발생:", undefined, error as Error);
      throw error;
    }
  }
}
