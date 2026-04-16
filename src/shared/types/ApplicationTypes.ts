/**
 * 🔄 Application Layer - 애플리케이션 서비스 및 DTO 타입
 *
 * 이 파일은 애플리케이션 레이어의 서비스와 데이터 전송 객체를 정의합니다.
 * 도메인 엔티티와 외부 레이어 간의 변환을 담당합니다.
 */

import type { Enrollment, Session, Student, Subject, Teacher } from "./DomainTypes";

// ===== DTO (Data Transfer Objects) =====

export interface StudentDto {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubjectDto {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface SessionDto {
  id: string;
  enrollmentIds: string[];
  weekday: number;
  startsAt: string;
  endsAt: string;
  room?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EnrollmentDto {
  id: string;
  studentId: string;
  subjectId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeacherDto {
  id: string;
  name: string;
  color: string;
  userId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserDto {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// ===== 요청/응답 DTO =====

export interface AddStudentRequest {
  name: string;
  gender: "male" | "female";
}

export interface UpdateStudentRequest {
  id: string;
  name: string;
  gender: "male" | "female";
}

export interface AddTeacherRequest {
  name: string;
  color: string;
  userId?: string | null;
}

export interface UpdateTeacherRequest {
  id: string;
  name?: string;
  color?: string;
  userId?: string | null;
}

export interface AddSubjectRequest {
  name: string;
  color: string;
}

export interface UpdateSubjectRequest {
  id: string;
  name?: string;
  color?: string;
}

export interface ScheduleSessionRequest {
  enrollmentIds: string[];
  weekday: number;
  startsAt: string;
  endsAt: string;
  room?: string;
}

export interface UpdateSessionRequest {
  id: string;
  enrollmentIds?: string[];
  weekday?: number;
  startsAt?: string;
  endsAt?: string;
  room?: string;
}

// ===== 애플리케이션 서비스 인터페이스 =====

export interface StudentService {
  createStudent(request: AddStudentRequest): Promise<Student>;
  updateStudent(request: UpdateStudentRequest): Promise<Student>;
  deleteStudent(id: string): Promise<void>;
  getStudent(id: string): Promise<Student | null>;
  getAllStudents(): Promise<Student[]>;
}

export interface SubjectService {
  createSubject(request: AddSubjectRequest): Promise<Subject>;
  updateSubject(request: UpdateSubjectRequest): Promise<Subject>;
  deleteSubject(id: string): Promise<void>;
  getSubject(id: string): Promise<Subject | null>;
  getAllSubjects(): Promise<Subject[]>;
}

export interface SessionService {
  scheduleSession(request: ScheduleSessionRequest): Promise<Session>;
  updateSession(request: UpdateSessionRequest): Promise<Session>;
  cancelSession(id: string): Promise<void>;
  getSession(id: string): Promise<Session | null>;
  getAllSessions(): Promise<Session[]>;
  getSessionsByStudent(studentId: string): Promise<Session[]>;
  getSessionsBySubject(subjectId: string): Promise<Session[]>;
}

export interface DataSyncService {
  syncLocalToServer(): Promise<void>;
  syncServerToLocal(): Promise<void>;
  resolveConflict(localData: any, serverData: any): Promise<any>;
}

export interface ValidationService {
  validateStudent(student: Partial<Student>): ValidationResult;
  validateSubject(subject: Partial<Subject>): ValidationResult;
  validateSession(session: Partial<Session>): ValidationResult;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// ===== 리포지토리 인터페이스 =====

export interface IStudentRepository {
  findById(id: string): Promise<Student | null>;
  findAll(): Promise<Student[]>;
  save(student: Student): Promise<Student>;
  delete(id: string): Promise<void>;
}

export interface ISubjectRepository {
  findById(id: string): Promise<Subject | null>;
  findAll(): Promise<Subject[]>;
  save(subject: Subject): Promise<Subject>;
  delete(id: string): Promise<void>;
}

export interface ISessionRepository {
  findById(id: string): Promise<Session | null>;
  findAll(): Promise<Session[]>;
  findByStudentId(studentId: string): Promise<Session[]>;
  findBySubjectId(subjectId: string): Promise<Session[]>;
  save(session: Session): Promise<Session>;
  delete(id: string): Promise<void>;
}

export interface IEnrollmentRepository {
  findById(id: string): Promise<Enrollment | null>;
  findAll(): Promise<Enrollment[]>;
  findByStudentId(studentId: string): Promise<Enrollment[]>;
  findBySubjectId(subjectId: string): Promise<Enrollment[]>;
  save(enrollment: Enrollment): Promise<Enrollment>;
  delete(id: string): Promise<void>;
}
