import { Student } from "@/domain/entities/Student";
import { StudentRepository } from "@/infrastructure/interfaces";

export class StudentApplicationServiceImpl {
  constructor(private studentRepository: StudentRepository) {}

  async getAllStudents(userId: string): Promise<Student[]> {
    try {
      return await this.studentRepository.getAll(userId);
    } catch (error) {
      console.error("학생 목록 조회 중 에러 발생:", error);
      return [];
    }
  }

  async getStudentById(id: string): Promise<Student | null> {
    try {
      return await this.studentRepository.getById(id);
    } catch (error) {
      console.error("학생 조회 중 에러 발생:", error);
      return null;
    }
  }

  async addStudent(
    studentData: { name: string },
    userId: string
  ): Promise<Student> {
    try {
      // 중복 체크
      const existingStudents = await this.studentRepository.getAll(userId);
      const isDuplicate = existingStudents.some(
        (student) => student.name === studentData.name
      );

      if (isDuplicate) {
        throw new Error("이미 존재하는 학생 이름입니다.");
      }

      return await this.studentRepository.create(studentData, userId);
    } catch (error) {
      console.error("학생 추가 중 에러 발생:", error);
      throw error;
    }
  }

  async updateStudent(
    id: string,
    studentData: { name: string }
  ): Promise<Student> {
    try {
      // 기존 학생 조회
      const existingStudent = await this.studentRepository.getById(id);
      if (!existingStudent) {
        throw new Error("존재하지 않는 학생입니다.");
      }

      // 중복 체크 (자기 자신 제외)
      const existingStudents = await this.studentRepository.getAll();
      const isDuplicate = existingStudents.some(
        (student) =>
          student.name === studentData.name && student.id.value !== id
      );

      if (isDuplicate) {
        throw new Error("이미 존재하는 학생 이름입니다.");
      }

      return await this.studentRepository.update(id, studentData);
    } catch (error) {
      console.error("학생 업데이트 중 에러 발생:", error);
      throw error;
    }
  }

  async deleteStudent(id: string): Promise<void> {
    try {
      return await this.studentRepository.delete(id);
    } catch (error) {
      console.error("학생 삭제 중 에러 발생:", error);
      throw error;
    }
  }
}
