/**
 * 🛠️ Shared Types - 통합 타입 정의
 *
 * Clean Architecture에 따라 레이어별로 분리된 타입들을 통합하여 export합니다.
 * 이 파일을 통해 모든 타입에 접근할 수 있습니다.
 */

// ===== Domain Layer Types =====
export type {
  Color,
  ConflictDetectionService,
  DomainEvent,
  Enrollment,
  ScheduleService,
  Session,
  SessionConflict,
  SessionId,
  SessionScheduledEvent,
  Student,
  StudentCreatedEvent,
  StudentId,
  Subject,
  SubjectId,
  TimeSlot,
  User,
} from "./DomainTypes";

// ===== Application Layer Types =====
export type {
  AddStudentRequest,
  AddSubjectRequest,
  DataSyncService,
  EnrollmentDto,
  IEnrollmentRepository,
  ISessionRepository,
  IStudentRepository,
  ISubjectRepository,
  ScheduleSessionRequest,
  SessionDto,
  SessionService,
  StudentDto,
  StudentService,
  SubjectDto,
  SubjectService,
  UpdateSessionRequest,
  UpdateStudentRequest,
  UpdateSubjectRequest,
  UserDto,
  ValidationError,
  ValidationResult,
  ValidationService,
} from "./ApplicationTypes";

// ===== Common Types =====
export type {
  ApiError,
  ApiResponse,
  AppConfig,
  BaseEntity,
  ColorScheme,
  TimeSlot as CommonTimeSlot,
  CustomEvent,
  DataSyncState,
  DragOffset,
  DropTarget,
  EventHandler,
  FormState,
  LoadingState,
  ModalState,
  Optional,
  PaginatedResponse,
  PaginationParams,
  PanelState,
  PartialExcept,
  RequiredFields,
  SearchParams,
  SearchResult,
  SyncAction,
  SyncModalState,
  SyncScenario,
  Theme,
  TimeRange,
  Timestamped,
  UIConstants,
  UserPreferences,
  Weekday,
} from "./CommonTypes";

// ===== 레거시 호환성을 위한 타입 별칭 =====
// 기존 코드와의 호환성을 위해 기존 타입명을 유지합니다.

export type {
  Enrollment as LegacyEnrollment,
  Session as LegacySession,
  Student as LegacyStudent,
  Subject as LegacySubject,
} from "./DomainTypes";

// ===== 유틸리티 함수 타입 =====
export interface UidGenerator {
  (): string;
}

export interface TimeConverter {
  timeToMinutes(time: string): number;
  minutesToTime(minutes: number): string;
}

// ===== 상수 타입 =====
export interface WeekdayConstants {
  readonly labels: readonly string[];
  readonly values: readonly number[];
}

export interface TimeConstants {
  readonly SLOT_MIN: number;
  readonly DAY_START_MIN: number;
  readonly DAY_END_MIN: number;
  readonly SLOT_PX: number;
}
