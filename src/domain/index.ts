/**
 * 🏢 Domain Layer - 통합 Export
 *
 * 도메인 레이어의 모든 엔티티, 값 객체, 서비스, 이벤트를 통합하여 export합니다.
 */

// ===== Entities =====
export { Student } from "./entities/Student";
export { Subject } from "./entities/Subject";

// ===== Value Objects =====
export { Color } from "./value-objects/Color";
export { StudentId } from "./value-objects/StudentId";
export { SubjectId } from "./value-objects/SubjectId";

// ===== Domain Services =====
export { StudentDomainService } from "./services/StudentDomainService";

// ===== Repository Interfaces =====
export type {
  IEnrollmentRepository,
  ISessionRepository,
  IStudentRepository,
  ISubjectRepository,
} from "./repositories/index";

// ===== Domain Events =====
export type {
  DomainEvent,
  DomainEventBus,
  DomainEventHandler,
  DomainEventStore,
  StudentCreatedEvent,
  StudentDeletedEvent,
  StudentUpdatedEvent,
  SubjectCreatedEvent,
  SubjectDeletedEvent,
  SubjectUpdatedEvent,
} from "./events/DomainEvents";

// ===== 타입 재export =====
export type {
  StudentDto,
  StudentJson,
  ValidationError,
  ValidationResult,
} from "./entities/Student";

export type {
  SubjectDto,
  SubjectJson,
  ValidationError as SubjectValidationError,
  ValidationResult as SubjectValidationResult,
} from "./entities/Subject";
