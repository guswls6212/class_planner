import { SessionRepository } from "../interfaces";
import { SupabaseSessionRepository } from "../repositories/SupabaseSessionRepository";

/**
 * SessionRepository Factory
 * 환경에 따라 적절한 SessionRepository 구현체를 생성합니다.
 */
export class SessionRepositoryFactory {
  static create(): SessionRepository {
    if (process.env.NODE_ENV === "test") {
      return new MockSessionRepository();
    }
    return new SupabaseSessionRepository();
  }
}

/**
 * 테스트용 Mock SessionRepository 구현체
 */
class MockSessionRepository implements SessionRepository {
  async getAll(_academyId: string): Promise<any[]> {
    return [];
  }

  async getById(_id: string): Promise<any | null> {
    return null;
  }

  async create(data: any, _academyId: string): Promise<any> {
    return {
      ...data,
      id: "new-session-id",
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
