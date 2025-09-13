import { EnrollmentRepository } from "../interfaces";

/**
 * EnrollmentRepository Factory
 * 환경에 따라 적절한 EnrollmentRepository 구현체를 생성합니다.
 */
export class EnrollmentRepositoryFactory {
  /**
   * EnrollmentRepository 인스턴스를 생성합니다.
   * @returns EnrollmentRepository 구현체
   */
  static create(): EnrollmentRepository {
    // 환경에 따라 다른 구현체 선택
    switch (process.env.NODE_ENV) {
      case "test":
        // 테스트 환경에서는 Mock 구현체 사용
        return new MockEnrollmentRepository();
      case "development":
        // 개발 환경에서는 Mock 구현체 사용 (아직 Supabase 구현체 없음)
        return new MockEnrollmentRepository();
      case "production":
        // 프로덕션 환경에서는 Mock 구현체 사용 (아직 Supabase 구현체 없음)
        return new MockEnrollmentRepository();
      default:
        // 기본적으로 Mock 구현체 사용
        return new MockEnrollmentRepository();
    }
  }
}

/**
 * 테스트용 Mock EnrollmentRepository 구현체
 */
class MockEnrollmentRepository implements EnrollmentRepository {
  async getAll(): Promise<any[]> {
    return [
      {
        id: "550e8400-e29b-41d4-a716-446655440301",
        studentId: "550e8400-e29b-41d4-a716-446655440001",
        sessionId: "550e8400-e29b-41d4-a716-446655440201",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "550e8400-e29b-41d4-a716-446655440302",
        studentId: "550e8400-e29b-41d4-a716-446655440002",
        sessionId: "550e8400-e29b-41d4-a716-446655440202",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
  }

  async getById(id: string): Promise<any | null> {
    if (id === "550e8400-e29b-41d4-a716-446655440301") {
      return {
        id: "550e8400-e29b-41d4-a716-446655440301",
        studentId: "550e8400-e29b-41d4-a716-446655440001",
        sessionId: "550e8400-e29b-41d4-a716-446655440201",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
    return null;
  }

  async create(data: any): Promise<any> {
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

  async delete(id: string): Promise<void> {
    // Mock에서는 아무것도 하지 않음
  }
}

