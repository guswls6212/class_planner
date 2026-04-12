import { Enrollment } from "@/shared/types/DomainTypes";
import { EnrollmentRepository } from "@/infrastructure/interfaces";

export class EnrollmentApplicationServiceImpl {
  constructor(private enrollmentRepository: EnrollmentRepository) {}

  async getAllEnrollments(academyId: string): Promise<Enrollment[]> {
    return this.enrollmentRepository.getAll(academyId);
  }

  async getEnrollmentById(id: string): Promise<Enrollment | null> {
    return this.enrollmentRepository.getById(id);
  }

  async addEnrollment(
    enrollmentData: { studentId: string; subjectId: string },
    academyId: string
  ): Promise<Enrollment> {
    return this.enrollmentRepository.create(enrollmentData, academyId);
  }

  async deleteEnrollment(id: string): Promise<void> {
    return this.enrollmentRepository.delete(id);
  }
}
