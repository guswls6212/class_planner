import {
  EnrollmentRepository,
  SessionRepository,
  StudentRepository,
  SubjectRepository,
} from "@/infrastructure/interfaces";

export function createStudentRepository(): StudentRepository {
  // 임시 구현 - 실제로는 Supabase 클라이언트를 사용
  return {
    getAll: async () => [],
    getById: async () => null,
    create: async (data) =>
      ({
        ...data,
        id: "temp-id",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any),
    update: async (id, data) =>
      ({ ...data, id, createdAt: new Date(), updatedAt: new Date() } as any),
    delete: async () => {},
  };
}

export function createSubjectRepository(): SubjectRepository {
  // 임시 구현 - 실제로는 Supabase 클라이언트를 사용
  return {
    getAll: async () => [],
    getById: async () => null,
    create: async (data) =>
      ({
        ...data,
        id: "temp-id",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any),
    update: async (id, data) =>
      ({ ...data, id, createdAt: new Date(), updatedAt: new Date() } as any),
    delete: async () => {},
  };
}

export function createSessionRepository(): SessionRepository {
  // 임시 구현 - 실제로는 Supabase 클라이언트를 사용
  return {
    getAll: async () => [],
    getById: async () => null,
    create: async (data) =>
      ({
        ...data,
        id: "temp-id",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any),
    update: async (id, data) =>
      ({ ...data, id, createdAt: new Date(), updatedAt: new Date() } as any),
    delete: async () => {},
  };
}

export function createEnrollmentRepository(): EnrollmentRepository {
  // 임시 구현 - 실제로는 Supabase 클라이언트를 사용
  return {
    getAll: async () => [],
    getById: async () => null,
    create: async (data) =>
      ({
        ...data,
        id: "temp-id",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any),
    update: async (id, data) =>
      ({ ...data, id, createdAt: new Date(), updatedAt: new Date() } as any),
    delete: async () => {},
  };
}
