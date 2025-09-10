import { Student } from "@/entities";
import { StudentRepository } from "@/infrastructure/interfaces";

export class StudentApplicationServiceImpl {
  constructor(private studentRepository: StudentRepository) {}

  async getAllStudents(): Promise<Student[]> {
    return this.studentRepository.getAll();
  }

  async getStudentById(id: string): Promise<Student | null> {
    return this.studentRepository.getById(id);
  }

  async addStudent(studentData: {
    name: string;
    gender: "male" | "female";
  }): Promise<Student> {
    return this.studentRepository.create(studentData);
  }

  async updateStudent(
    id: string,
    studentData: { name: string; gender: "male" | "female" }
  ): Promise<Student> {
    return this.studentRepository.update(id, studentData);
  }

  async deleteStudent(id: string): Promise<void> {
    return this.studentRepository.delete(id);
  }
}
