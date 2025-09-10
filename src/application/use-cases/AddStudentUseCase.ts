/**
 * 🔄 Use Case - AddStudentUseCase
 *
 * 학생 추가 유스케이스입니다. 학생 추가와 관련된 모든 비즈니스 로직을 처리합니다.
 */

import { Student } from '@entities/Student';
import type { IStudentRepository } from '@repositories';

export interface AddStudentRequest {
  name: string;
  gender?: string;
}

export interface AddStudentResponse {
  success: boolean;
  student?: Student;
  error?: string;
}

export class AddStudentUseCase {
  constructor(private studentRepository: IStudentRepository) {}

  /**
   * 학생을 추가합니다.
   */
  async execute(request: AddStudentRequest): Promise<AddStudentResponse> {
    try {
      // 1. 입력 검증
      const validation = Student.validateName(request.name);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.map(e => e.message).join(', '),
        };
      }

      // 2. 기존 학생 목록 조회
      const existingStudents = await this.studentRepository.findAll();

      // 3. 중복 이름 검사
      const isDuplicate = Student.isNameDuplicate(
        request.name,
        existingStudents
      );
      if (isDuplicate) {
        return {
          success: false,
          error: '이미 존재하는 학생 이름입니다.',
        };
      }

      // 4. 학생 생성
      const newStudent = Student.create(request.name, request.gender);

      // 5. 학생 저장
      const savedStudent = await this.studentRepository.save(newStudent);

      return {
        success: true,
        student: savedStudent,
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
