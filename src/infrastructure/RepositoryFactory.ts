import { Student } from "@/domain/entities/Student";
import { Subject } from "@/domain/entities/Subject";
import {
  EnrollmentRepository,
  SessionRepository,
  StudentRepository,
  SubjectRepository,
} from "@/infrastructure/interfaces";

export function createStudentRepository(): StudentRepository {
  // 테스트를 위한 Mock 구현
  return {
    getAll: async () => [
      Student.restore("550e8400-e29b-41d4-a716-446655440001", "김철수", "male"),
      Student.restore(
        "550e8400-e29b-41d4-a716-446655440002",
        "김영희",
        "female"
      ),
    ],
    getById: async (id: string) => {
      if (id === "550e8400-e29b-41d4-a716-446655440001") {
        return Student.restore(
          "550e8400-e29b-41d4-a716-446655440001",
          "김철수",
          "male"
        );
      }
      return null;
    },
    create: async (data) => Student.create(data.name, data.gender),
    update: async (id, data) => {
      const existing = Student.restore(id, data.name || "", data.gender);
      return existing.changeName(data.name || existing.name);
    },
    delete: async () => {},
  };
}

export function createSubjectRepository(): SubjectRepository {
  // 테스트를 위한 Mock 구현
  return {
    getAll: async () => [
      Subject.restore(
        "550e8400-e29b-41d4-a716-446655440101",
        "수학",
        "#FF0000"
      ),
      Subject.restore(
        "550e8400-e29b-41d4-a716-446655440102",
        "영어",
        "#0000FF"
      ),
    ],
    getById: async (id: string) => {
      if (id === "550e8400-e29b-41d4-a716-446655440101") {
        return Subject.restore(
          "550e8400-e29b-41d4-a716-446655440101",
          "수학",
          "#FF0000"
        );
      }
      return null;
    },
    create: async (data) => {
      const colorValue =
        typeof data.color === "string"
          ? data.color
          : (data.color as any)?.value || "#000000";
      return Subject.create(data.name, colorValue);
    },
    update: async (id, data) => {
      const colorValue =
        typeof data.color === "string"
          ? data.color
          : (data.color as any)?.value || "#000000";
      const existing = Subject.restore(id, data.name || "", colorValue);
      return existing.changeName(data.name || existing.name);
    },
    delete: async () => {},
  };
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
