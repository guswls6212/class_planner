import { Student } from "@/domain/entities/Student";
import { Subject } from "@/domain/entities/Subject";
import { Enrollment, Session } from "@/entities";

export interface StudentRepository {
  getAll(): Promise<Student[]>;
  getById(id: string): Promise<Student | null>;
  create(student: {
    name: string;
    gender: "male" | "female";
  }): Promise<Student>;
  update(
    id: string,
    student: { name: string; gender: "male" | "female" }
  ): Promise<Student>;
  delete(id: string): Promise<void>;
}

export interface SubjectRepository {
  getAll(): Promise<Subject[]>;
  getById(id: string): Promise<Subject | null>;
  create(subject: { name: string; color: string }): Promise<Subject>;
  update(
    id: string,
    subject: { name: string; color: string }
  ): Promise<Subject>;
  delete(id: string): Promise<void>;
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
