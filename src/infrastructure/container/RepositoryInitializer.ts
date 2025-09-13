import { RepositoryRegistry } from "./RepositoryRegistry";

/**
 * Repository 초기화 관리 클래스
 * 앱 시작 시 RepositoryRegistry를 자동으로 초기화합니다.
 */
export class RepositoryInitializer {
  private static isInitialized = false;
  private static initializationPromise: Promise<void> | null = null;

  /**
   * 현재 환경을 감지합니다.
   */
  private static getCurrentEnvironment():
    | "development"
    | "production"
    | "test" {
    if (typeof window !== "undefined") {
      // 클라이언트 사이드
      return process.env.NODE_ENV === "production"
        ? "production"
        : "development";
    } else {
      // 서버 사이드
      return process.env.NODE_ENV === "production"
        ? "production"
        : "development";
    }
  }

  /**
   * 환경 정보를 로그로 출력합니다.
   */
  private static logEnvironmentInfo(): void {
    const environment = this.getCurrentEnvironment();
    console.log("🌍 환경 정보:", {
      environment,
      nodeEnv: process.env.NODE_ENV,
      isClient: typeof window !== "undefined",
      isServer: typeof window === "undefined",
    });
  }

  /**
   * Repository를 초기화합니다.
   * 중복 초기화를 방지하고 싱글톤으로 관리됩니다.
   */
  static async initialize(): Promise<void> {
    // 이미 초기화되었거나 초기화 중인 경우 기존 Promise 반환
    if (this.isInitialized) {
      console.log("♻️ Repository가 이미 초기화되었습니다.");
      return;
    }

    if (this.initializationPromise) {
      console.log("⏳ Repository 초기화 중... 기존 Promise 대기");
      return this.initializationPromise;
    }

    // 초기화 Promise 생성
    this.initializationPromise = this.performInitialization();

    try {
      await this.initializationPromise;
      this.isInitialized = true;
      console.log("✅ Repository 초기화 완료");
    } catch (error) {
      console.error("❌ Repository 초기화 실패:", error);
      this.initializationPromise = null; // 실패 시 재시도 가능하도록
      throw error;
    }
  }

  /**
   * 실제 초기화 작업을 수행합니다.
   */
  private static async performInitialization(): Promise<void> {
    console.log("🚀 Repository 초기화 시작...");

    // 환경 정보 출력
    this.logEnvironmentInfo();

    // 환경에 따라 적절한 Repository 등록
    const environment = this.getCurrentEnvironment();

    switch (environment) {
      case "test":
        console.log("🧪 테스트 환경: Mock Repository 등록");
        RepositoryRegistry.registerForTest();
        break;

      case "development":
        console.log("🛠️ 개발 환경: Supabase + Mock Repository 등록");
        RepositoryRegistry.registerAll();
        break;

      case "production":
        console.log("🚀 프로덕션 환경: Supabase + Mock Repository 등록");
        RepositoryRegistry.registerAll();
        break;

      default:
        console.log("⚠️ 알 수 없는 환경, 기본 설정 사용");
        RepositoryRegistry.registerAll();
        break;
    }

    // 초기화 완료 로그
    console.log("🎉 Repository 초기화 성공!");
  }

  /**
   * 초기화 상태를 확인합니다.
   */
  static isRepositoryInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * 초기화를 강제로 리셋합니다. (테스트용)
   */
  static reset(): void {
    this.isInitialized = false;
    this.initializationPromise = null;
    RepositoryRegistry.clear();
    console.log("🔄 Repository 초기화 상태 리셋");
  }

  /**
   * 초기화 상태를 출력합니다.
   */
  static logStatus(): void {
    console.log("📊 Repository 초기화 상태:", {
      isInitialized: this.isInitialized,
      isInitializing: this.initializationPromise !== null,
      environment: this.getCurrentEnvironment(),
    });
  }
}
