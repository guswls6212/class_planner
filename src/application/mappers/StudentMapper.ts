/**
 * 🔄 DTO Mapper - StudentMapper
 *
 * 도메인 엔티티와 DTO 간의 변환을 담당하는 매퍼입니다.
 */

import { Student } from '../../domain/entities/Student';
import type { StudentDto } from '../../shared/types/ApplicationTypes';

export class StudentMapper {
  /**
   * 도메인 엔티티를 DTO로 변환합니다.
   */
  static toDto(student: Student): StudentDto {
    return {
      id: student.id.value,
      name: student.name,
      createdAt: student.createdAt.toISOString(),
      updatedAt: student.updatedAt.toISOString(),
    };
  }

  /**
   * DTO를 도메인 엔티티로 변환합니다.
   */
  static toDomain(dto: StudentDto): Student {
    return Student.restore(
      dto.id,
      dto.name,
      undefined,
      undefined,
      new Date(dto.createdAt),
      new Date(dto.updatedAt)
    );
  }

  /**
   * 도메인 엔티티 배열을 DTO 배열로 변환합니다.
   */
  static toDtoArray(students: Student[]): StudentDto[] {
    return students.map(student => this.toDto(student));
  }

  /**
   * DTO 배열을 도메인 엔티티 배열로 변환합니다.
   */
  static toDomainArray(dtos: StudentDto[]): Student[] {
    return dtos.map(dto => this.toDomain(dto));
  }

  /**
   * 레거시 Student 타입을 도메인 엔티티로 변환합니다.
   */
  static fromLegacy(legacyStudent: {
    id: string;
    name: string;
    gender?: string;
  }): Student {
    return Student.restore(
      legacyStudent.id,
      legacyStudent.name
    );
  }

  /**
   * 도메인 엔티티를 레거시 Student 타입으로 변환합니다.
   */
  static toLegacy(student: Student): {
    id: string;
    name: string;
  } {
    return {
      id: student.id.value,
      name: student.name,
    };
  }
}
