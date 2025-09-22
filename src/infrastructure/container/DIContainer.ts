import { logger } from "../../lib/logger";
/**
 * 의존성 주입 컨테이너
 * 싱글톤 패턴으로 구현되어 전역에서 하나의 인스턴스만 존재합니다.
 */
export class DIContainer {
  private static instance: DIContainer;
  private repositories: Map<string, any> = new Map();
  private instances: Map<string, any> = new Map(); // 싱글톤 인스턴스 캐시
  private factories: Map<string, () => any> = new Map(); // 팩토리 함수 저장

  /**
   * 싱글톤 인스턴스를 가져옵니다.
   * @returns DIContainer 인스턴스
   */
  static getInstance(): DIContainer {
    if (!DIContainer.instance) {
      DIContainer.instance = new DIContainer();
    }
    return DIContainer.instance;
  }

  /**
   * 의존성을 등록합니다.
   * @param key 의존성 키
   * @param factory 팩토리 함수
   * @param singleton 싱글톤 여부 (기본값: true)
   */
  register<T>(key: string, factory: () => T, singleton: boolean = true): void {
    this.factories.set(key, factory);
    this.repositories.set(key, { factory, singleton });

    logger.debug("의존성 등록", { key, singleton });
  }

  /**
   * 등록된 의존성을 해결합니다.
   * @param key 의존성 키
   * @returns 의존성 인스턴스
   */
  resolve<T>(key: string): T {
    const config = this.repositories.get(key);

    if (!config) {
      throw new Error(
        `❌ Repository ${key} not found. 등록된 키: ${Array.from(
          this.repositories.keys()
        ).join(", ")}`
      );
    }

    // 싱글톤인 경우 인스턴스 캐시 사용
    if (config.singleton && this.instances.has(key)) {
      logger.debug("싱글톤 인스턴스 반환", { key });
      return this.instances.get(key);
    }

    // 새 인스턴스 생성
    logger.debug("새 인스턴스 생성", { key });
    const instance = config.factory();

    // 싱글톤인 경우 인스턴스 캐시에 저장
    if (config.singleton) {
      this.instances.set(key, instance);
    }

    return instance;
  }

  /**
   * 등록된 모든 의존성을 해결합니다.
   * @returns 모든 의존성 인스턴스
   */
  resolveAll(): Record<string, any> {
    const result: Record<string, any> = {};

    for (const key of this.repositories.keys()) {
      result[key] = this.resolve(key);
    }

    return result;
  }

  /**
   * 특정 의존성이 등록되어 있는지 확인합니다.
   * @param key 의존성 키
   * @returns 등록 여부
   */
  isRegistered(key: string): boolean {
    return this.repositories.has(key);
  }

  /**
   * 특정 의존성을 제거합니다.
   * @param key 의존성 키
   */
  unregister(key: string): void {
    this.repositories.delete(key);
    this.instances.delete(key);
    this.factories.delete(key);

    logger.debug("의존성 제거", { key });
  }

  /**
   * 모든 의존성을 초기화합니다.
   */
  clear(): void {
    this.repositories.clear();
    this.instances.clear();
    this.factories.clear();

    logger.info("🧹 모든 의존성 초기화 완료");
  }

  /**
   * 등록된 의존성 목록을 반환합니다.
   * @returns 의존성 키 목록
   */
  getRegisteredKeys(): string[] {
    return Array.from(this.repositories.keys());
  }

  /**
   * 컨테이너 상태를 출력합니다.
   */
  logStatus(): void {
    logger.debug("DIContainer 상태", {
      registeredKeys: this.getRegisteredKeys(),
      singletonInstances: Array.from(this.instances.keys()),
      totalFactories: this.factories.size,
    });
  }

  /**
   * 테스트용 인스턴스 리셋
   */
  static resetInstance(): void {
    DIContainer.instance = null as any;
    logger.info("🔄 DIContainer 인스턴스 리셋");
  }
}
