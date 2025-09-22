/**
 * 🔄 Use Case - Subject Management Use Cases
 *
 * 과목 관리와 관련된 모든 유스케이스를 정의합니다.
 */

import { Subject } from '../../domain/entities/Subject';
import type { ISubjectRepository } from '../../domain/repositories';
import { SubjectId } from '../../domain/value-objects/SubjectId';

// ===== Add Subject Use Case =====

export interface AddSubjectRequest {
  name: string;
  color: string;
}

export interface AddSubjectResponse {
  success: boolean;
  subject?: Subject;
  error?: string;
}

export class AddSubjectUseCase {
  constructor(private subjectRepository: ISubjectRepository) {}

  async execute(request: AddSubjectRequest): Promise<AddSubjectResponse> {
    try {
      // 1. 입력 검증
      const validation = Subject.validateName(request.name);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.map(e => e.message).join(', '),
        };
      }

      // 2. 기존 과목 목록 조회
      const existingSubjects = await this.subjectRepository.findAll();

      // 3. 중복 이름 검사
      const isDuplicate = Subject.isNameDuplicate(
        request.name,
        existingSubjects
      );
      if (isDuplicate) {
        return {
          success: false,
          error: '이미 존재하는 과목 이름입니다.',
        };
      }

      // 4. 과목 생성
      const newSubject = Subject.create(request.name, request.color);

      // 5. 과목 저장
      const savedSubject = await this.subjectRepository.save(newSubject);

      return {
        success: true,
        subject: savedSubject,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : '알 수 없는 오류가 발생했습니다.',
      };
    }
  }
}

// ===== Update Subject Use Case =====

export interface UpdateSubjectRequest {
  id: string;
  name?: string;
  color?: string;
}

export interface UpdateSubjectResponse {
  success: boolean;
  subject?: Subject;
  error?: string;
}

export class UpdateSubjectUseCase {
  constructor(private subjectRepository: ISubjectRepository) {}

  async execute(request: UpdateSubjectRequest): Promise<UpdateSubjectResponse> {
    try {
      // 1. 과목 ID 검증
      const subjectId = SubjectId.fromString(request.id);

      // 2. 기존 과목 조회
      const existingSubject = await this.subjectRepository.findById(subjectId);
      if (!existingSubject) {
        return {
          success: false,
          error: '과목을 찾을 수 없습니다.',
        };
      }

      // 3. 이름 변경 검증
      if (request.name) {
        const validation = Subject.validateName(request.name);
        if (!validation.isValid) {
          return {
            success: false,
            error: validation.errors.map(e => e.message).join(', '),
          };
        }

        // 4. 중복 이름 검사
        const existingSubjects = await this.subjectRepository.findAll();
        const isDuplicate = Subject.isNameDuplicate(
          request.name,
          existingSubjects
        );
        if (isDuplicate && request.name !== existingSubject.name) {
          return {
            success: false,
            error: '이미 존재하는 과목 이름입니다.',
          };
        }
      }

      // 5. 과목 정보 업데이트
      let updatedSubject = existingSubject;

      if (request.name) {
        updatedSubject = updatedSubject.changeName(request.name);
      }

      if (request.color) {
        updatedSubject = updatedSubject.changeColor(request.color);
      }

      // 6. 변경사항이 없으면 기존 과목 반환
      if (updatedSubject.equals(existingSubject)) {
        return {
          success: true,
          subject: existingSubject,
        };
      }

      // 7. 과목 저장
      const savedSubject = await this.subjectRepository.save(updatedSubject);

      return {
        success: true,
        subject: savedSubject,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : '알 수 없는 오류가 발생했습니다.',
      };
    }
  }
}

// ===== Delete Subject Use Case =====

export interface DeleteSubjectRequest {
  id: string;
}

export interface DeleteSubjectResponse {
  success: boolean;
  deletedSubjectId?: string;
  error?: string;
}

export class DeleteSubjectUseCase {
  constructor(private subjectRepository: ISubjectRepository) {}

  async execute(request: DeleteSubjectRequest): Promise<DeleteSubjectResponse> {
    try {
      // 1. 과목 ID 검증
      const subjectId = SubjectId.fromString(request.id);

      // 2. 기존 과목 조회
      const existingSubject = await this.subjectRepository.findById(subjectId);
      if (!existingSubject) {
        return {
          success: false,
          error: '과목을 찾을 수 없습니다.',
        };
      }

      // 3. 과목 삭제
      await this.subjectRepository.delete(subjectId);

      return {
        success: true,
        deletedSubjectId: subjectId.value,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : '알 수 없는 오류가 발생했습니다.',
      };
    }
  }
}

// ===== Get Subject Use Case =====

export interface GetSubjectRequest {
  id: string;
}

export interface GetSubjectResponse {
  success: boolean;
  subject?: any; // DTO 반환
  error?: string;
}

export interface GetAllSubjectsRequest {
  sortBy?: 'name' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface GetAllSubjectsResponse {
  success: boolean;
  subjects?: any[]; // DTO 반환
  error?: string;
}

export class GetSubjectUseCase {
  constructor(private subjectRepository: ISubjectRepository) {}

  async getById(request: GetSubjectRequest): Promise<GetSubjectResponse> {
    try {
      const subjectId = SubjectId.fromString(request.id);
      const subject = await this.subjectRepository.findById(subjectId);

      if (!subject) {
        return {
          success: false,
          error: '과목을 찾을 수 없습니다.',
        };
      }

      return {
        success: true,
        subject: subject.toDto(),
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : '알 수 없는 오류가 발생했습니다.',
      };
    }
  }

  async getAll(
    request: GetAllSubjectsRequest = {}
  ): Promise<GetAllSubjectsResponse> {
    try {
      const subjects = await this.subjectRepository.findAll();

      // 정렬 적용
      let sortedSubjects = subjects;
      if (request.sortBy) {
        switch (request.sortBy) {
          case 'name':
            sortedSubjects = subjects.sort((a, b) =>
              a.name.localeCompare(b.name)
            );
            break;
          case 'createdAt':
            sortedSubjects = subjects.sort(
              (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
            );
            break;
          case 'updatedAt':
            sortedSubjects = subjects.sort(
              (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
            );
            break;
        }

        if (request.sortOrder === 'desc') {
          sortedSubjects = sortedSubjects.reverse();
        }
      }

      return {
        success: true,
        subjects: sortedSubjects.map(subject => subject.toDto()),
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : '알 수 없는 오류가 발생했습니다.',
      };
    }
  }
}
