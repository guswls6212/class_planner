import { Student } from "@/domain/entities/Student";
import { Subject } from "@/domain/entities/Subject";
import { Teacher } from "@/domain/entities/Teacher";
import { Enrollment, Session } from "@/shared/types/DomainTypes";

export interface StudentRepository {
  getAll(academyId: string): Promise<Student[]>;
  getById(id: string, academyId?: string): Promise<Student | null>;
  create(
    student: { name: string; gender?: string; birthDate?: string; grade?: string; school?: string; phone?: string },
    academyId: string
  ): Promise<Student>;
  update(
    id: string,
    student: { name?: string; gender?: string; birthDate?: string; grade?: string; school?: string; phone?: string },
    academyId: string
  ): Promise<Student>;
  delete(id: string, academyId: string): Promise<void>;
}

export interface SubjectRepository {
  getAll(academyId: string): Promise<Subject[]>;
  getById(id: string, academyId?: string): Promise<Subject | null>;
  create(subject: { name: string; color: string }, academyId: string): Promise<Subject>;
  update(
    id: string,
    subject: { name: string; color: string },
    academyId: string
  ): Promise<Subject>;
  delete(id: string, academyId: string): Promise<void>;
}

export interface SessionRepository {
  getAll(academyId: string): Promise<Session[]>;
  getById(id: string): Promise<Session | null>;
  create(
    session: Omit<Session, "id" | "createdAt" | "updatedAt">,
    academyId: string
  ): Promise<Session>;
  update(
    id: string,
    session: Partial<Omit<Session, "id" | "createdAt" | "updatedAt">>
  ): Promise<Session>;
  delete(id: string): Promise<void>;
}

export interface TeacherRepository {
  getAll(academyId: string): Promise<Teacher[]>;
  getById(id: string, academyId?: string): Promise<Teacher | null>;
  create(teacher: { name: string; color: string; userId?: string | null }, academyId: string): Promise<Teacher>;
  update(
    id: string,
    teacher: { name?: string; color?: string; userId?: string | null },
    academyId: string
  ): Promise<Teacher>;
  delete(id: string, academyId: string): Promise<void>;
}

export interface EnrollmentRepository {
  getAll(academyId: string): Promise<Enrollment[]>;
  getById(id: string): Promise<Enrollment | null>;
  create(
    enrollment: Omit<Enrollment, "id" | "createdAt" | "updatedAt">,
    academyId: string
  ): Promise<Enrollment>;
  update(
    id: string,
    enrollment: Partial<Omit<Enrollment, "id" | "createdAt" | "updatedAt">>
  ): Promise<Enrollment>;
  delete(id: string): Promise<void>;
}
