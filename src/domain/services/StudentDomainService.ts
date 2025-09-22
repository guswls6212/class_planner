/**
 * 🏢 Domain Service - StudentDomainService
 *
 * 학생 도메인과 관련된 비즈니스 로직을 처리하는 도메인 서비스입니다.
 * 여러 엔티티에 걸친 복잡한 비즈니스 규칙을 담당합니다.
 */

import { Student } from '../entities/Student';
import { StudentId } from '../value-objects/StudentId';

export class StudentDomainService {
  /**
   * 학생 이름 중복 검사를 수행합니다.
   */
  static validateUniqueName(
    name: string,
    existingStudents: Student[],
    excludeId?: StudentId
  ): ValidationResult {
    const validation = Student.validateName(name);
    if (!validation.isValid) {
      return validation;
    }

    const trimmedName = name.trim().toLowerCase();
    const isDuplicate = existingStudents.some(student => {
      // 제외할 ID가 있으면 해당 학생은 제외
      if (excludeId && student.id.equals(excludeId)) {
        return false;
      }
      return student.name.toLowerCase() === trimmedName;
    });

    if (isDuplicate) {
      return {
        isValid: false,
        errors: [
          {
            field: 'name',
            message: '이미 존재하는 학생 이름입니다.',
            code: 'NAME_DUPLICATE',
          },
        ],
      };
    }

    return { isValid: true, errors: [] };
  }

  /**
   * 학생 목록에서 특정 학생을 찾습니다.
   */
  static findStudentById(students: Student[], id: StudentId): Student | null {
    return students.find(student => student.id.equals(id)) || null;
  }

  /**
   * 학생 목록에서 이름으로 학생을 찾습니다.
   */
  static findStudentByName(students: Student[], name: string): Student | null {
    const trimmedName = name.trim().toLowerCase();
    return (
      students.find(student => student.name.toLowerCase() === trimmedName) ||
      null
    );
  }

  /**
   * 학생 목록을 이름순으로 정렬합니다.
   */
  static sortStudentsByName(students: Student[]): Student[] {
    return [...students].sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * 학생 목록을 생성일순으로 정렬합니다.
   */
  static sortStudentsByCreatedAt(students: Student[]): Student[] {
    return [...students].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );
  }

  /**
   * 학생 목록을 업데이트일순으로 정렬합니다.
   */
  static sortStudentsByUpdatedAt(students: Student[]): Student[] {
    return [...students].sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
    );
  }

  /**
   * 학생 목록에서 특정 학생을 제거합니다.
   */
  static removeStudent(students: Student[], id: StudentId): Student[] {
    return students.filter(student => !student.id.equals(id));
  }

  /**
   * 학생 목록에 새 학생을 추가합니다.
   */
  static addStudent(students: Student[], newStudent: Student): Student[] {
    // 중복 검사
    const validation = this.validateUniqueName(newStudent.name, students);

    if (!validation.isValid) {
      throw new Error(
        `Cannot add student: ${validation.errors.map(e => e.message).join(', ')}`
      );
    }

    return [...students, newStudent];
  }

  /**
   * 학생 목록에서 특정 학생을 업데이트합니다.
   */
  static updateStudent(
    students: Student[],
    id: StudentId,
    updatedStudent: Student
  ): Student[] {
    const index = students.findIndex(student => student.id.equals(id));

    if (index === -1) {
      throw new Error(`Student with id ${id.value} not found`);
    }

    // 중복 검사 (자기 자신 제외)
    const validation = this.validateUniqueName(
      updatedStudent.name,
      students,
      id
    );

    if (!validation.isValid) {
      throw new Error(
        `Cannot update student: ${validation.errors.map(e => e.message).join(', ')}`
      );
    }

    const newStudents = [...students];
    newStudents[index] = updatedStudent;
    return newStudents;
  }

  /**
   * 학생 목록의 통계를 계산합니다.
   */
  static calculateStatistics(students: Student[]): StudentStatistics {
    const totalCount = students.length;

    const nameLengths = students.map(student => student.name.length);
    const averageNameLength =
      nameLengths.length > 0
        ? nameLengths.reduce((sum, length) => sum + length, 0) /
          nameLengths.length
        : 0;

    return {
      totalCount,
      // genderCounts 제거됨 (gender 속성 삭제)
      averageNameLength: Math.round(averageNameLength * 100) / 100,
      longestName: Math.max(...nameLengths, 0),
      shortestName: Math.min(...nameLengths, 0),
    };
  }
}

// ===== 타입 정의 =====

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface StudentStatistics {
  totalCount: number;
  // genderCounts: Record<string, number>; // gender 속성 제거됨
  averageNameLength: number;
  longestName: number;
  shortestName: number;
}
