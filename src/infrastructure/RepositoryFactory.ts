import {
  EnrollmentRepository,
  SessionRepository,
  StudentRepository,
  SubjectRepository,
} from "@/infrastructure/interfaces";
import { SupabaseStudentRepository } from "./repositories/SupabaseStudentRepository";
import { SupabaseSubjectRepository } from "./repositories/SupabaseSubjectRepository";

export function createStudentRepository(): StudentRepository {
  // 실제 Supabase 구현 사용
  return new SupabaseStudentRepository();
}

export function createSubjectRepository(): SubjectRepository {
  // 실제 Supabase 구현 사용
  return new SupabaseSubjectRepository();
}

export function createSessionRepository(): SessionRepository {
  // 테스트를 위한 Mock 구현
  return {
    getAll: async () => [
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
    ],
    getById: async (id: string) => {
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
    },
    create: async (data) =>
      ({
        ...data,
        id: "new-session-id",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any),
    update: async (id, data) =>
      ({ ...data, id, createdAt: new Date(), updatedAt: new Date() } as any),
    delete: async () => {},
  };
}

export function createEnrollmentRepository(): EnrollmentRepository {
  // 테스트를 위한 Mock 구현
  return {
    getAll: async () => [
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
    ],
    getById: async (id: string) => {
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
    },
    create: async (data) =>
      ({
        ...data,
        id: "new-enrollment-id",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any),
    update: async (id, data) =>
      ({ ...data, id, createdAt: new Date(), updatedAt: new Date() } as any),
    delete: async () => {},
  };
}
