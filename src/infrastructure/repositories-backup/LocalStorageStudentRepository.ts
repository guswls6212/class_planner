/**
 * 🔌 Infrastructure Repository - LocalStorageStudentRepository
 *
 * LocalStorage를 사용한 학생 리포지토리 구현체입니다.
 */

import { StudentMapper } from '../../application/mappers/StudentMapper';
import { logger } from "../../lib/logger";
import { Student } from '../../domain/entities/Student';
import type { IStudentRepository } from '../../domain/repositories';
import { StudentId } from '../../domain/value-objects/StudentId';
import type { StudentDto } from '../../shared/types/ApplicationTypes';

export class LocalStorageStudentRepository implements IStudentRepository {
  private readonly storageKey = 'students';

  /**
   * LocalStorage에서 학생 데이터를 로드합니다.
   * 기존 데이터 형식과 새로운 형식을 모두 지원합니다.
   */
  private loadFromStorage(): StudentDto[] {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (!data) return [];

      const parsedData = JSON.parse(data);

      // 배열이 아닌 경우 빈 배열 반환
      if (!Array.isArray(parsedData)) return [];

      // 데이터 마이그레이션: 기존 형식을 새로운 형식으로 변환
      return parsedData.map((item: any) => {
        // 이미 새로운 형식인 경우 그대로 반환
        if (item.createdAt && item.gender !== undefined) {
          return item;
        }

        // 기존 형식을 새로운 형식으로 변환
        return {
          id: item.id || this.generateId(),
          name: item.name || '',
          gender: item.gender || 'male', // 기본값
          createdAt: item.createdAt || new Date().toISOString(),
        };
      });
    } catch (error) {
      console.error('Failed to load students from localStorage:', error);
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
   * LocalStorage에 학생 데이터를 저장합니다.
   */
  private saveToStorage(students: StudentDto[]): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(students));
    } catch (error) {
      console.error('Failed to save students to localStorage:', error);
      throw new Error('학생 데이터 저장에 실패했습니다.');
    }
  }

  async findById(id: StudentId): Promise<Student | null> {
    const students = this.loadFromStorage();
    const studentDto = students.find(s => s.id === id.value);

    return studentDto ? StudentMapper.toDomain(studentDto) : null;
  }

  async findAll(): Promise<Student[]> {
    const students = this.loadFromStorage();
    return StudentMapper.toDomainArray(students);
  }

  async save(student: Student): Promise<Student> {
    const students = this.loadFromStorage();
    const studentDto = StudentMapper.toDto(student);

    const existingIndex = students.findIndex(s => s.id === studentDto.id);

    if (existingIndex >= 0) {
      // 업데이트
      students[existingIndex] = studentDto;
    } else {
      // 새로 추가
      students.push(studentDto);
    }

    this.saveToStorage(students);
    return student;
  }

  async delete(id: StudentId): Promise<void> {
    const students = this.loadFromStorage();
    const filteredStudents = students.filter(s => s.id !== id.value);

    if (filteredStudents.length === students.length) {
      throw new Error('삭제할 학생을 찾을 수 없습니다.');
    }

    this.saveToStorage(filteredStudents);
  }

  async findByName(name: string): Promise<Student | null> {
    const students = this.loadFromStorage();
    const studentDto = students.find(
      s => s.name.toLowerCase() === name.trim().toLowerCase()
    );

    return studentDto ? StudentMapper.toDomain(studentDto) : null;
  }

  async exists(id: StudentId): Promise<boolean> {
    const students = this.loadFromStorage();
    return students.some(s => s.id === id.value);
  }

  async count(): Promise<number> {
    const students = this.loadFromStorage();
    return students.length;
  }
}
