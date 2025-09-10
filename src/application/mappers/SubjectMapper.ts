/**
 * 🔄 DTO Mapper - SubjectMapper
 *
 * 과목 도메인 엔티티와 DTO 간의 변환을 담당하는 매퍼입니다.
 */

import { Subject } from '../../domain/entities/Subject';
import type { SubjectDto } from '../../shared/types/ApplicationTypes';

export class SubjectMapper {
  /**
   * 도메인 엔티티를 DTO로 변환합니다.
   */
  static toDto(subject: Subject): SubjectDto {
    return {
      id: subject.id.value,
      name: subject.name,
      color: subject.color.value,
      createdAt: subject.createdAt.toISOString(),
      updatedAt: subject.updatedAt.toISOString(),
    };
  }

  /**
   * DTO를 도메인 엔티티로 변환합니다.
   */
  static toDomain(dto: SubjectDto): Subject {
    return Subject.restore(
      dto.id,
      dto.name,
      dto.color,
      new Date(dto.createdAt),
      new Date(dto.updatedAt)
    );
  }

  /**
   * 도메인 엔티티 배열을 DTO 배열로 변환합니다.
   */
  static toDtoArray(subjects: Subject[]): SubjectDto[] {
    return subjects.map(subject => this.toDto(subject));
  }

  /**
   * DTO 배열을 도메인 엔티티 배열로 변환합니다.
   */
  static toDomainArray(dtos: SubjectDto[]): Subject[] {
    return dtos.map(dto => this.toDomain(dto));
  }

  /**
   * 레거시 Subject 타입을 도메인 엔티티로 변환합니다.
   */
  static fromLegacy(legacySubject: {
    id: string;
    name: string;
    color: string;
  }): Subject {
    return Subject.restore(
      legacySubject.id,
      legacySubject.name,
      legacySubject.color
    );
  }

  /**
   * 도메인 엔티티를 레거시 Subject 타입으로 변환합니다.
   */
  static toLegacy(subject: Subject): {
    id: string;
    name: string;
    color: string;
  } {
    return {
      id: subject.id.value,
      name: subject.name,
      color: subject.color.value,
    };
  }
}
