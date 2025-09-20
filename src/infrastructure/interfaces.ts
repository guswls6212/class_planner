import { Student } from "@/domain/entities/Student";
import { Subject } from "@/domain/entities/Subject";
import { Enrollment, Session } from "@/shared/types/DomainTypes";

export interface StudentRepository {
  getAll(userId: string): Promise<Student[]>;
  getById(id: string, userId?: string): Promise<Student | null>;
  create(student: {
    name: string;
  }, userId: string): Promise<Student>;
  update(
    id: string,
    student: { name: string; },
    userId?: string
  ): Promise<Student>;
  delete(id: string, userId?: string): Promise<void>;
}

export interface SubjectRepository {
  getAll(userId: string): Promise<Subject[]>;
  getById(id: string, userId?: string): Promise<Subject | null>;
  create(subject: { name: string; color: string }, userId: string): Promise<Subject>;
  update(
    id: string,
    subject: { name: string; color: string },
    userId?: string
  ): Promise<Subject>;
  delete(id: string, userId?: string): Promise<void>;
}

export interface SessionRepository {
  getAll(): Promise<Session[]>;
  getById(id: string): Promise<Session | null>;
  create(
    session: Omit<Session, "id" | "createdAt" | "updatedAt">
  ): Promise<Session>;
  update(
    id: string,
    session: Partial<Omit<Session, "id" | "createdAt" | "updatedAt">>
  ): Promise<Session>;
  delete(id: string): Promise<void>;
}

export interface EnrollmentRepository {
  getAll(): Promise<Enrollment[]>;
  getById(id: string): Promise<Enrollment | null>;
  create(
    enrollment: Omit<Enrollment, "id" | "createdAt" | "updatedAt">
  ): Promise<Enrollment>;
  update(
    id: string,
    enrollment: Partial<Omit<Enrollment, "id" | "createdAt" | "updatedAt">>
  ): Promise<Enrollment>;
  delete(id: string): Promise<void>;
}
