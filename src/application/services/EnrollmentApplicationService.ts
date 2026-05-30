import { Enrollment } from "@/shared/types/DomainTypes";
import { EnrollmentRepository } from "@/infrastructure/interfaces";

export class EnrollmentApplicationServiceImpl {
  constructor(private enrollmentRepository: EnrollmentRepository) {}

  async getAllEnrollments(academyId: string): Promise<Enrollment[]> {
    return this.enrollmentRepository.getAll(academyId);
  }

  async getEnrollmentsByStudent(
    studentId: string,
    academyId: string,
  ): Promise<Enrollment[]> {
    return this.enrollmentRepository.getByStudentId(studentId, academyId);
  }

  async getEnrollmentById(id: string): Promise<Enrollment | null> {
    return this.enrollmentRepository.getById(id);
  }

  async addEnrollment(
    enrollmentData: { id?: string; studentId: string; subjectId: string },
    academyId: string
  ): Promise<Enrollment> {
    return this.enrollmentRepository.create(enrollmentData, academyId);
  }

  async deleteEnrollment(id: string): Promise<void> {
    return this.enrollmentRepository.delete(id);
  }
}
