import { SubjectRepository } from "../interfaces";
import { SupabaseSubjectRepository } from "../repositories/SupabaseSubjectRepository";

/**
 * SubjectRepository Factory
 * 환경에 따라 적절한 SubjectRepository 구현체를 생성합니다.
 */
export class SubjectRepositoryFactory {
  /**
   * SubjectRepository 인스턴스를 생성합니다.
   * @returns SubjectRepository 구현체
   */
  static create(): SubjectRepository {
    // 환경에 따라 다른 구현체 선택
    switch (process.env.NODE_ENV) {
      case "test":
        // 테스트 환경에서는 Mock 구현체 사용
        return new MockSubjectRepository();
      case "development":
        // 개발 환경에서는 Supabase 구현체 사용
        return new SupabaseSubjectRepository() as unknown as SubjectRepository;
      case "production":
        // 프로덕션 환경에서는 Supabase 구현체 사용
        return new SupabaseSubjectRepository() as unknown as SubjectRepository;
      default:
        // 기본적으로 Supabase 구현체 사용
        return new SupabaseSubjectRepository() as unknown as SubjectRepository;
    }
  }
}

/**
 * 테스트용 Mock SubjectRepository 구현체
 */
class MockSubjectRepository implements SubjectRepository {
  async getAll(): Promise<any[]> {
    return [
      {
        id: "550e8400-e29b-41d4-a716-446655440101",
        name: "수학",
        color: "#FF0000",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "550e8400-e29b-41d4-a716-446655440102",
        name: "영어",
        color: "#0000FF",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
  }

  async getById(id: string): Promise<any | null> {
    if (id === "550e8400-e29b-41d4-a716-446655440101") {
      return {
        id: "550e8400-e29b-41d4-a716-446655440101",
        name: "수학",
        color: "#FF0000",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
    return null;
  }

  async create(data: { name: string; color: string }): Promise<any> {
    return {
      ...data,
      id: "new-subject-id",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async update(
    id: string,
    data: { name: string; color: string }
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
