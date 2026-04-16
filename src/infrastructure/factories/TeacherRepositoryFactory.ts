import { Teacher } from "@/domain/entities/Teacher";
import { TeacherRepository } from "../interfaces";
import { SupabaseTeacherRepository } from "../repositories/SupabaseTeacherRepository";

export class TeacherRepositoryFactory {
  static create(): TeacherRepository {
    switch (process.env.NODE_ENV) {
      case "test":
        return new MockTeacherRepository();
      default:
        return new SupabaseTeacherRepository() as unknown as TeacherRepository;
    }
  }
}

class MockTeacherRepository implements TeacherRepository {
  async getAll(): Promise<Teacher[]> {
    return [];
  }

  async getById(): Promise<Teacher | null> {
    return null;
  }

  async create(data: { name: string; color: string; userId?: string | null }): Promise<Teacher> {
    return Teacher.create(data.name, data.color, data.userId ?? undefined);
  }

  async update(id: string, data: { name?: string; color?: string }): Promise<Teacher> {
    return Teacher.restore(
      id,
      data.name ?? "강사",
      data.color ?? "#6366f1",
      null,
      new Date(),
      new Date()
    );
  }

  async delete(): Promise<void> {}
}
