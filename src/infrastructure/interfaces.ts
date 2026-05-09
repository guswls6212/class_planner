import { Student } from "@/domain/entities/Student";
import { Subject } from "@/domain/entities/Subject";
import { Teacher } from "@/domain/entities/Teacher";
import { Enrollment, Session } from "@/shared/types/DomainTypes";
import type { PaginationOptions, PaginationResult } from "@/lib/pagination";

export interface StudentRepository {
  getAll(academyId: string): Promise<Student[]>;
  /** Cursor-based 페이징. limit/cursor/q 옵션 처리. */
  getAllPaginated(
    academyId: string,
    options: PaginationOptions,
  ): Promise<PaginationResult<Student>>;
  getById(id: string, academyId?: string): Promise<Student | null>;
  create(
    /** Local-first: client UUID 미제공 시 DB가 생성. 제공 시 그대로 사용. */
    student: { id?: string; name: string; gender?: string; birthDate?: string; grade?: string; school?: string; phone?: string },
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
  /** Local-first: client UUID 미제공 시 DB가 생성. 제공 시 그대로 사용. */
  create(subject: { id?: string; name: string; color: string }, academyId: string): Promise<Subject>;
  update(
    id: string,
    subject: { name: string; color: string },
    academyId: string
  ): Promise<Subject>;
  delete(id: string, academyId: string): Promise<void>;
}

export interface SessionRepository {
  getAll(academyId: string, opts?: { weekStartDate?: string }): Promise<Session[]>;
  getById(id: string, academyId?: string): Promise<Session | null>;
  create(
    session: Omit<Session, "id" | "createdAt" | "updatedAt"> & {
      /** Local-first: client UUID 미제공 시 DB가 생성. 제공 시 그대로 사용. */
      id?: string;
    },
    academyId: string
  ): Promise<Session>;
  update(
    id: string,
    session: Partial<Omit<Session, "id" | "createdAt" | "updatedAt">>,
    academyId?: string
  ): Promise<Session>;
  delete(id: string, academyId?: string): Promise<void>;
}

export interface TeacherRepository {
  getAll(academyId: string): Promise<Teacher[]>;
  /** Cursor-based 페이징 (subjectIds nested join 포함). */
  getAllPaginated(
    academyId: string,
    options: PaginationOptions,
  ): Promise<PaginationResult<Teacher>>;
  getById(id: string, academyId?: string): Promise<Teacher | null>;
  create(
    /** Local-first: client UUID 미제공 시 DB가 생성. 제공 시 그대로 사용. */
    teacher: { id?: string; name: string; color: string; userId?: string | null; email?: string | null; phone?: string | null; role?: import("@/domain/entities/Teacher").TeacherRole | null; notes?: string | null },
    academyId: string
  ): Promise<Teacher>;
  update(
    id: string,
    teacher: { name?: string; color?: string; userId?: string | null; email?: string | null; phone?: string | null; role?: import("@/domain/entities/Teacher").TeacherRole | null; notes?: string | null },
    academyId: string
  ): Promise<Teacher>;
  delete(id: string, academyId: string): Promise<void>;
  getSubjectIds(teacherId: string): Promise<string[]>;
  addSubject(teacherId: string, subjectId: string, academyId: string): Promise<void>;
  removeSubject(teacherId: string, subjectId: string, academyId: string): Promise<void>;
}

export interface EnrollmentRepository {
  getAll(academyId: string): Promise<Enrollment[]>;
  getById(id: string): Promise<Enrollment | null>;
  create(
    enrollment: Omit<Enrollment, "id" | "createdAt" | "updatedAt"> & {
      /** Local-first: client UUID 미제공 시 DB가 생성. 제공 시 그대로 사용. */
      id?: string;
    },
    academyId: string
  ): Promise<Enrollment>;
  update(
    id: string,
    enrollment: Partial<Omit<Enrollment, "id" | "createdAt" | "updatedAt">>
  ): Promise<Enrollment>;
  delete(id: string): Promise<void>;
}
