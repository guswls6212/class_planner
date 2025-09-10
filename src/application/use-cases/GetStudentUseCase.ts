/**
 * 🔄 Use Case - GetStudentUseCase
 *
 * 학생 조회 유스케이스입니다. 학생 조회와 관련된 모든 비즈니스 로직을 처리합니다.
 */

import type { IStudentRepository } from '../../domain/repositories';
import { StudentDomainService } from '../../domain/services/StudentDomainService';
import { StudentId } from '../../domain/value-objects/StudentId';

export interface GetStudentRequest {
  id: string;
}

export interface GetStudentResponse {
  success: boolean;
  student?: any; // 도메인 엔티티 대신 DTO 반환
  error?: string;
}

export interface GetAllStudentsRequest {
  sortBy?: 'name' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface GetAllStudentsResponse {
  success: boolean;
  students?: any[]; // 도메인 엔티티 대신 DTO 반환
  error?: string;
}

export class GetStudentUseCase {
  constructor(private studentRepository: IStudentRepository) {}

  /**
   * 특정 학생을 조회합니다.
   */
  async getById(request: GetStudentRequest): Promise<GetStudentResponse> {
    try {
      // 1. 학생 ID 검증
      const studentId = StudentId.fromString(request.id);

      // 2. 학생 조회
      const student = await this.studentRepository.findById(studentId);
      if (!student) {
        return {
          success: false,
          error: '학생을 찾을 수 없습니다.',
        };
      }

      return {
        success: true,
        student: student.toDto(),
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

  /**
   * 모든 학생을 조회합니다.
   */
  async getAll(
    request: GetAllStudentsRequest = {}
  ): Promise<GetAllStudentsResponse> {
    try {
      // 1. 모든 학생 조회
      const students = await this.studentRepository.findAll();

      // 2. 정렬 적용
      let sortedStudents = students;
      if (request.sortBy) {
        switch (request.sortBy) {
          case 'name':
            sortedStudents = StudentDomainService.sortStudentsByName(students);
            break;
          case 'createdAt':
            sortedStudents =
              StudentDomainService.sortStudentsByCreatedAt(students);
            break;
          case 'updatedAt':
            sortedStudents =
              StudentDomainService.sortStudentsByUpdatedAt(students);
            break;
        }

        // 내림차순 정렬
        if (request.sortOrder === 'desc') {
          sortedStudents = sortedStudents.reverse();
        }
      }

      return {
        success: true,
        students: sortedStudents.map(student => student.toDto()),
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

  /**
   * 학생 통계를 조회합니다.
   */
  async getStatistics(): Promise<{
    success: boolean;
    statistics?: any;
    error?: string;
  }> {
    try {
      const students = await this.studentRepository.findAll();
      const statistics = StudentDomainService.calculateStatistics(students);

      return {
        success: true,
        statistics,
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
