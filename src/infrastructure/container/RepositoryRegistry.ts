import { RepositoryConfigFactory } from "../config/RepositoryConfig";
import { DIContainer } from "./DIContainer";

/**
 * Repository 등록 키 상수
 */
export const REPOSITORY_KEYS = {
  STUDENT_REPOSITORY: "studentRepository",
  SUBJECT_REPOSITORY: "subjectRepository",
  SESSION_REPOSITORY: "sessionRepository",
  ENROLLMENT_REPOSITORY: "enrollmentRepository",
} as const;

/**
 * Repository 등록 관리 클래스
 * DIContainer에 Repository들을 등록하고 관리합니다.
 */
export class RepositoryRegistry {
  private static container: DIContainer = DIContainer.getInstance();

  /**
   * 모든 Repository를 DIContainer에 등록합니다.
   */
  static registerAll(): void {
    console.log("📋 Repository 등록 시작...");

    const config = RepositoryConfigFactory.create();

    // 각 Repository를 싱글톤으로 등록
    this.container.register(
      REPOSITORY_KEYS.STUDENT_REPOSITORY,
      () => config.studentRepository,
      true
    );

    this.container.register(
      REPOSITORY_KEYS.SUBJECT_REPOSITORY,
      () => config.subjectRepository,
      true
    );

    this.container.register(
      REPOSITORY_KEYS.SESSION_REPOSITORY,
      () => config.sessionRepository,
      true
    );

    this.container.register(
      REPOSITORY_KEYS.ENROLLMENT_REPOSITORY,
      () => config.enrollmentRepository,
      true
    );

    console.log("✅ 모든 Repository 등록 완료");
    this.container.logStatus();
  }

  /**
   * 테스트용 Repository를 등록합니다.
   */
  static registerForTest(): void {
    console.log("🧪 테스트용 Repository 등록 시작...");

    const config = RepositoryConfigFactory.createForTest();

    // 각 Repository를 싱글톤으로 등록
    this.container.register(
      REPOSITORY_KEYS.STUDENT_REPOSITORY,
      () => config.studentRepository,
      true
    );

    this.container.register(
      REPOSITORY_KEYS.SUBJECT_REPOSITORY,
      () => config.subjectRepository,
      true
    );

    this.container.register(
      REPOSITORY_KEYS.SESSION_REPOSITORY,
      () => config.sessionRepository,
      true
    );

    this.container.register(
      REPOSITORY_KEYS.ENROLLMENT_REPOSITORY,
      () => config.enrollmentRepository,
      true
    );

    console.log("✅ 테스트용 Repository 등록 완료");
    this.container.logStatus();
  }

  /**
   * 특정 Repository를 가져옵니다.
   * @param key Repository 키
   * @returns Repository 인스턴스
   */
  static getRepository<T>(key: string): T {
    return this.container.resolve<T>(key);
  }

  /**
   * StudentRepository를 가져옵니다.
   * @returns StudentRepository 인스턴스
   */
  static getStudentRepository() {
    // Repository가 등록되지 않은 경우 자동 등록
    if (!this.isRegistered()) {
      console.log("⚠️ Repository가 등록되지 않음. 자동 등록 시도...");
      this.registerAll();
    }
    return this.getRepository(REPOSITORY_KEYS.STUDENT_REPOSITORY);
  }

  /**
   * SubjectRepository를 가져옵니다.
   * @returns SubjectRepository 인스턴스
   */
  static getSubjectRepository() {
    // Repository가 등록되지 않은 경우 자동 등록
    if (!this.isRegistered()) {
      console.log("⚠️ Repository가 등록되지 않음. 자동 등록 시도...");
      this.registerAll();
    }
    return this.getRepository(REPOSITORY_KEYS.SUBJECT_REPOSITORY);
  }

  /**
   * SessionRepository를 가져옵니다.
   * @returns SessionRepository 인스턴스
   */
  static getSessionRepository() {
    // Repository가 등록되지 않은 경우 자동 등록
    if (!this.isRegistered()) {
      console.log("⚠️ Repository가 등록되지 않음. 자동 등록 시도...");
      this.registerAll();
    }
    return this.getRepository(REPOSITORY_KEYS.SESSION_REPOSITORY);
  }

  /**
   * EnrollmentRepository를 가져옵니다.
   * @returns EnrollmentRepository 인스턴스
   */
  static getEnrollmentRepository() {
    // Repository가 등록되지 않은 경우 자동 등록
    if (!this.isRegistered()) {
      console.log("⚠️ Repository가 등록되지 않음. 자동 등록 시도...");
      this.registerAll();
    }
    return this.getRepository(REPOSITORY_KEYS.ENROLLMENT_REPOSITORY);
  }

  /**
   * 모든 Repository를 가져옵니다.
   * @returns 모든 Repository 인스턴스
   */
  static getAllRepositories() {
    return {
      studentRepository: this.getStudentRepository(),
      subjectRepository: this.getSubjectRepository(),
      sessionRepository: this.getSessionRepository(),
      enrollmentRepository: this.getEnrollmentRepository(),
    };
  }

  /**
   * Repository 등록 상태를 확인합니다.
   * @returns 등록 상태
   */
  static isRegistered(): boolean {
    return this.container.isRegistered(REPOSITORY_KEYS.STUDENT_REPOSITORY);
  }

  /**
   * 모든 Repository를 초기화합니다.
   */
  static clear(): void {
    this.container.clear();
    console.log("🧹 Repository 등록 초기화 완료");
  }

  /**
   * 환경 정보를 출력합니다.
   */
  static logEnvironmentInfo(): void {
    const environment =
      process.env.NODE_ENV === "production" ? "production" : "development";
    console.log("🌍 환경 정보:", {
      environment,
      nodeEnv: process.env.NODE_ENV,
      isClient: typeof window !== "undefined",
      isServer: typeof window === "undefined",
    });
  }
}
