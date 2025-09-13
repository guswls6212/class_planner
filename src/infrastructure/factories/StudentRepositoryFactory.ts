import { StudentRepository } from "../interfaces";
import { SupabaseStudentRepository } from "../repositories/SupabaseStudentRepository";

/**
 * StudentRepository Factory
 * 환경에 따라 적절한 StudentRepository 구현체를 생성합니다.
 */
export class StudentRepositoryFactory {
  /**
   * StudentRepository 인스턴스를 생성합니다.
   * @returns StudentRepository 구현체
   */
  static create(): StudentRepository {
    // 환경에 따라 다른 구현체 선택
    switch (process.env.NODE_ENV) {
      case "test":
        // 테스트 환경에서는 Mock 구현체 사용
        return new MockStudentRepository();
      case "development":
        // 개발 환경에서는 Supabase 구현체 사용
        return new SupabaseStudentRepository();
      case "production":
        // 프로덕션 환경에서는 Supabase 구현체 사용
        return new SupabaseStudentRepository();
      default:
        // 기본적으로 Supabase 구현체 사용
        return new SupabaseStudentRepository();
    }
  }
}

/**
 * 테스트용 Mock StudentRepository 구현체
 */
class MockStudentRepository implements StudentRepository {
  async getAll(): Promise<any[]> {
    return [
      {
        id: "550e8400-e29b-41d4-a716-446655440001",
        name: "김철수",
        gender: "male",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "550e8400-e29b-41d4-a716-446655440002",
        name: "이영희",
        gender: "female",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
  }

  async getById(id: string): Promise<any | null> {
    if (id === "550e8400-e29b-41d4-a716-446655440001") {
      return {
        id: "550e8400-e29b-41d4-a716-446655440001",
        name: "김철수",
        gender: "male",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
    return null;
  }

  async create(data: {
    name: string;
    gender: "male" | "female";
  }): Promise<any> {
    return {
      ...data,
      id: "new-student-id",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async update(
    id: string,
    data: { name: string; gender: "male" | "female" }
  ): Promise<any> {
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
