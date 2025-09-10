/**
 * 🔌 Infrastructure Repository - LocalStorageSubjectRepository
 *
 * LocalStorage를 사용한 과목 리포지토리 구현체입니다.
 */

import { SubjectMapper } from '../../application/mappers/SubjectMapper';
import { Subject } from '../../domain/entities/Subject';
import type { ISubjectRepository } from '../../domain/repositories';
import { SubjectId } from '../../domain/value-objects/SubjectId';
import type { SubjectDto } from '../../shared/types/ApplicationTypes';

export class LocalStorageSubjectRepository implements ISubjectRepository {
  private readonly storageKey = 'subjects';

  /**
   * LocalStorage에서 과목 데이터를 로드합니다.
   * 기존 데이터 형식과 새로운 형식을 모두 지원합니다.
   */
  private loadFromStorage(): SubjectDto[] {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (!data) return [];

      const parsedData = JSON.parse(data);

      // 배열이 아닌 경우 빈 배열 반환
      if (!Array.isArray(parsedData)) return [];

      // 데이터 마이그레이션: 기존 형식을 새로운 형식으로 변환
      return parsedData.map((item: any) => {
        // 이미 새로운 형식인 경우 그대로 반환
        if (item.createdAt) {
          return item;
        }

        // 기존 형식을 새로운 형식으로 변환
        return {
          id: item.id || this.generateId(),
          name: item.name || '',
          color: item.color || '#f59e0b', // 기본 색상
          createdAt: item.createdAt || new Date().toISOString(),
        };
      });
    } catch (error) {
      console.error('Failed to load subjects from localStorage:', error);
      return [];
    }
  }

  /**
   * 간단한 ID 생성 (마이그레이션용)
   */
  private generateId(): string {
    return (
      'migrated-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9)
    );
  }

  /**
   * LocalStorage에 과목 데이터를 저장합니다.
   */
  private saveToStorage(subjects: SubjectDto[]): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(subjects));
    } catch (error) {
      console.error('Failed to save subjects to localStorage:', error);
      throw new Error('과목 데이터 저장에 실패했습니다.');
    }
  }

  async findById(id: SubjectId): Promise<Subject | null> {
    const subjects = this.loadFromStorage();
    const subjectDto = subjects.find(s => s.id === id.value);

    return subjectDto ? SubjectMapper.toDomain(subjectDto) : null;
  }

  async findAll(): Promise<Subject[]> {
    const subjects = this.loadFromStorage();
    return SubjectMapper.toDomainArray(subjects);
  }

  async save(subject: Subject): Promise<Subject> {
    const subjects = this.loadFromStorage();
    const subjectDto = SubjectMapper.toDto(subject);

    const existingIndex = subjects.findIndex(s => s.id === subjectDto.id);

    if (existingIndex >= 0) {
      // 업데이트
      subjects[existingIndex] = subjectDto;
    } else {
      // 새로 추가
      subjects.push(subjectDto);
    }

    this.saveToStorage(subjects);
    return subject;
  }

  async delete(id: SubjectId): Promise<void> {
    const subjects = this.loadFromStorage();
    const filteredSubjects = subjects.filter(s => s.id !== id.value);

    if (filteredSubjects.length === subjects.length) {
      throw new Error('삭제할 과목을 찾을 수 없습니다.');
    }

    this.saveToStorage(filteredSubjects);
  }

  async findByName(name: string): Promise<Subject | null> {
    const subjects = this.loadFromStorage();
    const subjectDto = subjects.find(
      s => s.name.toLowerCase() === name.trim().toLowerCase()
    );

    return subjectDto ? SubjectMapper.toDomain(subjectDto) : null;
  }

  async exists(id: SubjectId): Promise<boolean> {
    const subjects = this.loadFromStorage();
    return subjects.some(s => s.id === id.value);
  }

  async count(): Promise<number> {
    const subjects = this.loadFromStorage();
    return subjects.length;
  }
}
