import { logger } from "../../lib/logger";
import { RepositoryConfigFactory } from "../config/RepositoryConfig";
import type {
  EnrollmentRepository,
  SessionRepository,
  StudentRepository,
  SubjectRepository,
} from "../interfaces";

export const REPOSITORY_KEYS = {
  STUDENT_REPOSITORY: "studentRepository",
  SUBJECT_REPOSITORY: "subjectRepository",
  SESSION_REPOSITORY: "sessionRepository",
  ENROLLMENT_REPOSITORY: "enrollmentRepository",
} as const;

type RepositoryKey = (typeof REPOSITORY_KEYS)[keyof typeof REPOSITORY_KEYS];

/**
 * Repository 등록·조회 클래스
 * 이전 DIContainer 추상화를 제거하고 Map 기반 lazy singleton을 직접 관리한다.
 */
export class RepositoryRegistry {
  private static factories = new Map<RepositoryKey, () => unknown>();
  private static instances = new Map<RepositoryKey, unknown>();

  // -------------------------------------------------------
  // 내부 헬퍼
  // -------------------------------------------------------
  private static register(key: RepositoryKey, factory: () => unknown): void {
    this.factories.set(key, factory);
    logger.debug("Repository 등록", { key });
  }

  private static resolve<T>(key: RepositoryKey): T {
    if (this.instances.has(key)) {
      return this.instances.get(key) as T;
    }
    const factory = this.factories.get(key);
    if (!factory) {
      throw new Error(
        `Repository ${key} not found. 등록된 키: ${[...this.factories.keys()].join(", ")}`
      );
    }
    const instance = factory() as T;
    this.instances.set(key, instance);
    return instance;
  }

  // -------------------------------------------------------
  // 등록
  // -------------------------------------------------------
  static registerAll(): void {
    logger.info("📋 Repository 등록 시작...");
    const config = RepositoryConfigFactory.create();
    this.register(REPOSITORY_KEYS.STUDENT_REPOSITORY, () => config.studentRepository);
    this.register(REPOSITORY_KEYS.SUBJECT_REPOSITORY, () => config.subjectRepository);
    this.register(REPOSITORY_KEYS.SESSION_REPOSITORY, () => config.sessionRepository);
    this.register(REPOSITORY_KEYS.ENROLLMENT_REPOSITORY, () => config.enrollmentRepository);
    logger.info("✅ 모든 Repository 등록 완료");
  }

  static registerForTest(): void {
    logger.info("🧪 테스트용 Repository 등록 시작...");
    const config = RepositoryConfigFactory.createForTest();
    this.register(REPOSITORY_KEYS.STUDENT_REPOSITORY, () => config.studentRepository);
    this.register(REPOSITORY_KEYS.SUBJECT_REPOSITORY, () => config.subjectRepository);
    this.register(REPOSITORY_KEYS.SESSION_REPOSITORY, () => config.sessionRepository);
    this.register(REPOSITORY_KEYS.ENROLLMENT_REPOSITORY, () => config.enrollmentRepository);
    logger.info("✅ 테스트용 Repository 등록 완료");
  }

  // -------------------------------------------------------
  // 조회
  // -------------------------------------------------------
  private static autoRegisterIfNeeded(): void {
    if (!this.isRegistered()) {
      logger.info("⚠️ Repository가 등록되지 않음. 자동 등록 시도...");
      this.registerAll();
    }
  }

  static getStudentRepository(): StudentRepository {
    this.autoRegisterIfNeeded();
    return this.resolve<StudentRepository>(REPOSITORY_KEYS.STUDENT_REPOSITORY);
  }

  static getSubjectRepository(): SubjectRepository {
    this.autoRegisterIfNeeded();
    return this.resolve<SubjectRepository>(REPOSITORY_KEYS.SUBJECT_REPOSITORY);
  }

  static getSessionRepository(): SessionRepository {
    this.autoRegisterIfNeeded();
    return this.resolve<SessionRepository>(REPOSITORY_KEYS.SESSION_REPOSITORY);
  }

  static getEnrollmentRepository(): EnrollmentRepository {
    this.autoRegisterIfNeeded();
    return this.resolve<EnrollmentRepository>(REPOSITORY_KEYS.ENROLLMENT_REPOSITORY);
  }

  static getAllRepositories() {
    return {
      studentRepository: this.getStudentRepository(),
      subjectRepository: this.getSubjectRepository(),
      sessionRepository: this.getSessionRepository(),
      enrollmentRepository: this.getEnrollmentRepository(),
    };
  }

  // -------------------------------------------------------
  // 상태
  // -------------------------------------------------------
  static isRegistered(): boolean {
    return this.factories.has(REPOSITORY_KEYS.STUDENT_REPOSITORY);
  }

  static clear(): void {
    this.factories.clear();
    this.instances.clear();
    logger.info("🧹 Repository 등록 초기화 완료");
  }
}
