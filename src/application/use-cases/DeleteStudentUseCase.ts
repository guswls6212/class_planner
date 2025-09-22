/**
 * 🔄 Use Case - DeleteStudentUseCase
 *
 * 학생 삭제 유스케이스입니다. 학생 삭제와 관련된 모든 비즈니스 로직을 처리합니다.
 */

import type { IStudentRepository } from '../../domain/repositories';
import { StudentId } from '../../domain/value-objects/StudentId';

export interface DeleteStudentRequest {
  id: string;
}

export interface DeleteStudentResponse {
  success: boolean;
  deletedStudentId?: string;
  error?: string;
}

export class DeleteStudentUseCase {
  constructor(private studentRepository: IStudentRepository) {}

  /**
   * 학생을 삭제합니다.
   */
  async execute(request: DeleteStudentRequest): Promise<DeleteStudentResponse> {
    try {
      // 1. 학생 ID 검증
      const studentId = StudentId.fromString(request.id);

      // 2. 기존 학생 조회
      const existingStudent = await this.studentRepository.findById(studentId);
      if (!existingStudent) {
        return {
          success: false,
          error: '학생을 찾을 수 없습니다.',
        };
      }

      // 3. 학생 삭제
      await this.studentRepository.delete(studentId);

      return {
        success: true,
        deletedStudentId: studentId.value,
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
