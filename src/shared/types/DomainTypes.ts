/**
 * 🏢 Domain Layer - 핵심 비즈니스 엔티티 타입
 *
 * 이 파일은 도메인 레이어의 핵심 엔티티들을 정의합니다.
 * 외부 의존성이 없고 순수한 비즈니스 로직만 포함합니다.
 */

// ===== 핵심 엔티티 =====

export interface Student {
  readonly id: string;
  readonly name: string;
  readonly gender?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface Subject {
  readonly id: string;
  readonly name: string;
  readonly color: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface Session {
  readonly id: string;
  readonly enrollmentIds: string[];
  readonly weekday: number; // 0: 월요일, 1: 화요일, ..., 6: 일요일
  readonly startsAt: string; // HH:MM 형식
  readonly endsAt: string; // HH:MM 형식
  readonly room?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface Enrollment {
  readonly id: string;
  readonly studentId: string;
  readonly subjectId: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface User {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly avatarUrl?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

// ===== 값 객체 (Value Objects) =====

export interface StudentId {
  readonly value: string;
}

export interface SubjectId {
  readonly value: string;
}

export interface SessionId {
  readonly value: string;
}

export interface TimeSlot {
  readonly startsAt: string;
  readonly endsAt: string;
}

export interface Color {
  readonly value: string;
}

// ===== 도메인 서비스 인터페이스 =====

export interface ScheduleService {
  hasConflict(session: Session, existingSessions: Session[]): boolean;
  calculateDuration(session: Session): number;
}

export interface ConflictDetectionService {
  detectConflicts(sessions: Session[]): SessionConflict[];
}

export interface SessionConflict {
  session1: Session;
  session2: Session;
  conflictType: 'time' | 'room' | 'student';
}

// ===== 도메인 이벤트 =====

export interface DomainEvent {
  readonly id: string;
  readonly occurredAt: Date;
  readonly eventType: string;
}

export interface StudentCreatedEvent extends DomainEvent {
  readonly eventType: 'StudentCreated';
  readonly student: Student;
}

export interface SessionScheduledEvent extends DomainEvent {
  readonly eventType: 'SessionScheduled';
  readonly session: Session;
}
