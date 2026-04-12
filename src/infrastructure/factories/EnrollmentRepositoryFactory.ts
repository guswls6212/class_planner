import { EnrollmentRepository } from "../interfaces";
import { SupabaseEnrollmentRepository } from "../repositories/SupabaseEnrollmentRepository";

/**
 * EnrollmentRepository Factory
 * 환경에 따라 적절한 EnrollmentRepository 구현체를 생성합니다.
 */
export class EnrollmentRepositoryFactory {
  static create(): EnrollmentRepository {
    if (process.env.NODE_ENV === "test") {
      return new MockEnrollmentRepository();
    }
    return new SupabaseEnrollmentRepository();
  }
}

/**
 * 테스트용 Mock EnrollmentRepository 구현체
 */
class MockEnrollmentRepository implements EnrollmentRepository {
  async getAll(_academyId: string): Promise<any[]> {
    return [];
  }

  async getById(_id: string): Promise<any | null> {
    return null;
  }

  async create(data: any, _academyId: string): Promise<any> {
    return {
      ...data,
      id: "new-enrollment-id",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async update(id: string, data: any): Promise<any> {
    return {
      ...data,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async delete(_id: string): Promise<void> {
    // Mock에서는 아무것도 하지 않음
  }
}
