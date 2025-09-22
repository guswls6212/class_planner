import { SessionRepository } from "../interfaces";

/**
 * SessionRepository Factory
 * 환경에 따라 적절한 SessionRepository 구현체를 생성합니다.
 */
export class SessionRepositoryFactory {
  /**
   * SessionRepository 인스턴스를 생성합니다.
   * @returns SessionRepository 구현체
   */
  static create(): SessionRepository {
    // 환경에 따라 다른 구현체 선택
    switch (process.env.NODE_ENV) {
      case "test":
        // 테스트 환경에서는 Mock 구현체 사용
        return new MockSessionRepository();
      case "development":
        // 개발 환경에서는 Mock 구현체 사용 (아직 Supabase 구현체 없음)
        return new MockSessionRepository();
      case "production":
        // 프로덕션 환경에서는 Mock 구현체 사용 (아직 Supabase 구현체 없음)
        return new MockSessionRepository();
      default:
        // 기본적으로 Mock 구현체 사용
        return new MockSessionRepository();
    }
  }
}

/**
 * 테스트용 Mock SessionRepository 구현체
 */
class MockSessionRepository implements SessionRepository {
  async getAll(): Promise<any[]> {
    return [
      {
        id: "550e8400-e29b-41d4-a716-446655440201",
        subjectId: "550e8400-e29b-41d4-a716-446655440101",
        startsAt: new Date("2024-01-01T09:00:00"),
        endsAt: new Date("2024-01-01T10:00:00"),
        enrollmentIds: ["550e8400-e29b-41d4-a716-446655440301"],
        weekday: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "550e8400-e29b-41d4-a716-446655440202",
        subjectId: "550e8400-e29b-41d4-a716-446655440102",
        startsAt: new Date("2024-01-01T10:00:00"),
        endsAt: new Date("2024-01-01T11:00:00"),
        enrollmentIds: ["550e8400-e29b-41d4-a716-446655440302"],
        weekday: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
  }

  async getById(id: string): Promise<any | null> {
    if (id === "550e8400-e29b-41d4-a716-446655440201") {
      return {
        id: "550e8400-e29b-41d4-a716-446655440201",
        subjectId: "550e8400-e29b-41d4-a716-446655440101",
        startsAt: new Date("2024-01-01T09:00:00"),
        endsAt: new Date("2024-01-01T10:00:00"),
        enrollmentIds: ["550e8400-e29b-41d4-a716-446655440301"],
        weekday: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
    return null;
  }

  async create(data: any): Promise<any> {
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

  async delete(id: string): Promise<void> {
    // Mock에서는 아무것도 하지 않음
  }
}

