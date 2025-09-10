/**
 * 🏢 Domain Events
 *
 * 도메인 이벤트들을 정의합니다. 도메인에서 발생하는 중요한 사건들을 나타냅니다.
 */

import { Student } from '../entities/Student';
import { Subject } from '../entities/Subject';

// ===== 기본 도메인 이벤트 =====

export abstract class DomainEvent {
  public readonly id: string;
  public readonly occurredAt: Date;
  public readonly eventType: string;

  constructor(eventType: string) {
    this.id = crypto.randomUUID();
    this.occurredAt = new Date();
    this.eventType = eventType;
  }

  abstract toJSON(): any;
}

// ===== 학생 관련 이벤트 =====

export class StudentCreatedEvent extends DomainEvent {
  public readonly student: Student;

  constructor(student: Student) {
    super('StudentCreated');
    this.student = student;
  }

  toJSON() {
    return {
      id: this.id,
      eventType: this.eventType,
      occurredAt: this.occurredAt.toISOString(),
      student: this.student.toJSON(),
    };
  }
}

export class StudentUpdatedEvent extends DomainEvent {
  public readonly student: Student;
  public readonly previousStudent: Student;

  constructor(student: Student, previousStudent: Student) {
    super('StudentUpdated');
    this.student = student;
    this.previousStudent = previousStudent;
  }

  toJSON() {
    return {
      id: this.id,
      eventType: this.eventType,
      occurredAt: this.occurredAt.toISOString(),
      student: this.student.toJSON(),
      previousStudent: this.previousStudent.toJSON(),
    };
  }
}

export class StudentDeletedEvent extends DomainEvent {
  public readonly studentId: string;
  public readonly studentName: string;

  constructor(studentId: string, studentName: string) {
    super('StudentDeleted');
    this.studentId = studentId;
    this.studentName = studentName;
  }

  toJSON() {
    return {
      id: this.id,
      eventType: this.eventType,
      occurredAt: this.occurredAt.toISOString(),
      studentId: this.studentId,
      studentName: this.studentName,
    };
  }
}

// ===== 과목 관련 이벤트 =====

export class SubjectCreatedEvent extends DomainEvent {
  public readonly subject: Subject;

  constructor(subject: Subject) {
    super('SubjectCreated');
    this.subject = subject;
  }

  toJSON() {
    return {
      id: this.id,
      eventType: this.eventType,
      occurredAt: this.occurredAt.toISOString(),
      subject: this.subject.toJSON(),
    };
  }
}

export class SubjectUpdatedEvent extends DomainEvent {
  public readonly subject: Subject;
  public readonly previousSubject: Subject;

  constructor(subject: Subject, previousSubject: Subject) {
    super('SubjectUpdated');
    this.subject = subject;
    this.previousSubject = previousSubject;
  }

  toJSON() {
    return {
      id: this.id,
      eventType: this.eventType,
      occurredAt: this.occurredAt.toISOString(),
      subject: this.subject.toJSON(),
      previousSubject: this.previousSubject.toJSON(),
    };
  }
}

export class SubjectDeletedEvent extends DomainEvent {
  public readonly subjectId: string;
  public readonly subjectName: string;

  constructor(subjectId: string, subjectName: string) {
    super('SubjectDeleted');
    this.subjectId = subjectId;
    this.subjectName = subjectName;
  }

  toJSON() {
    return {
      id: this.id,
      eventType: this.eventType,
      occurredAt: this.occurredAt.toISOString(),
      subjectId: this.subjectId,
      subjectName: this.subjectName,
    };
  }
}

// ===== 이벤트 핸들러 인터페이스 =====

export interface DomainEventHandler<T extends DomainEvent> {
  handle(event: T): Promise<void>;
}

// ===== 이벤트 버스 인터페이스 =====

export interface DomainEventBus {
  publish(event: DomainEvent): Promise<void>;
  subscribe<T extends DomainEvent>(
    eventType: string,
    handler: DomainEventHandler<T>
  ): void;
  unsubscribe<T extends DomainEvent>(
    eventType: string,
    handler: DomainEventHandler<T>
  ): void;
}

// ===== 이벤트 저장소 인터페이스 =====

export interface DomainEventStore {
  save(event: DomainEvent): Promise<void>;
  getEvents(aggregateId: string): Promise<DomainEvent[]>;
  getEventsByType(eventType: string): Promise<DomainEvent[]>;
}
