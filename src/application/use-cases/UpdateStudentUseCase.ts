/**
 * 🔄 Use Case - UpdateStudentUseCase
 *
 * 학생 수정 유스케이스입니다. 학생 정보 수정과 관련된 모든 비즈니스 로직을 처리합니다.
 */

import { Student } from '../../domain/entities/Student';
import type { IStudentRepository } from '../../domain/repositories';
import { StudentDomainService } from '../../domain/services/StudentDomainService';
import { StudentId } from '../../domain/value-objects/StudentId';

export interface UpdateStudentRequest {
  id: string;
  name?: string;
  gender?: string;
}

export interface UpdateStudentResponse {
  success: boolean;
  student?: Student;
  error?: string;
}

export class UpdateStudentUseCase {
  constructor(private studentRepository: IStudentRepository) {}

  /**
   * 학생 정보를 수정합니다.
   */
  async execute(request: UpdateStudentRequest): Promise<UpdateStudentResponse> {
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

      // 3. 이름 변경 검증
      if (request.name) {
        const validation = Student.validateName(request.name);
        if (!validation.isValid) {
          return {
            success: false,
            error: validation.errors.map(e => e.message).join(', '),
          };
        }

        // 4. 중복 이름 검사
        const existingStudents = await this.studentRepository.findAll();
        const isDuplicate = StudentDomainService.validateUniqueName(
          request.name,
          existingStudents,
          studentId
        );

        if (!isDuplicate.isValid) {
          return {
            success: false,
            error: isDuplicate.errors.map(e => e.message).join(', '),
          };
        }
      }

      // 5. 학생 정보 업데이트
      let updatedStudent = existingStudent;

      if (request.name) {
        updatedStudent = updatedStudent.changeName(request.name);
      }

      if (request.gender !== undefined) {
        updatedStudent = updatedStudent.changeGender(request.gender);
      }

      // 6. 변경사항이 없으면 기존 학생 반환
      if (updatedStudent.equals(existingStudent)) {
        return {
          success: true,
          student: existingStudent,
        };
      }

      // 7. 학생 저장
      const savedStudent = await this.studentRepository.save(updatedStudent);

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
