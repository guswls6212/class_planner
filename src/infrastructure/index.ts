/**
 * Infrastructure 계층 진입점
 * 새로운 Repository 구조를 사용하는 방법을 제공합니다.
 */

// 새로운 구조 (권장)
export {
  RepositoryConfig,
  RepositoryConfigFactory,
} from "./config/RepositoryConfig";
export { DIContainer } from "./container/DIContainer";
export { RepositoryInitializer } from "./container/RepositoryInitializer";
export { RepositoryRegistry } from "./container/RepositoryRegistry";

// 자동 초기화 (서버 사이드에서만 실행) - 삭제됨
// import "./auto-initialize";

// Factory 클래스들
export { EnrollmentRepositoryFactory } from "./factories/EnrollmentRepositoryFactory";
export { SessionRepositoryFactory } from "./factories/SessionRepositoryFactory";
export { StudentRepositoryFactory } from "./factories/StudentRepositoryFactory";
export { SubjectRepositoryFactory } from "./factories/SubjectRepositoryFactory";

// 하위 호환성을 위한 기존 구조
export * from "./RepositoryFactory";
export { RepositoryFactory } from "./RepositoryFactory";

// 인터페이스
export * from "./interfaces";

// Repository 구현체들
export { SupabaseStudentRepository } from "./repositories/SupabaseStudentRepository";
export { SupabaseSubjectRepository } from "./repositories/SupabaseSubjectRepository";

/**
 * 새로운 Repository 구조 사용 예시
 *
 * @example
 * ```typescript
 * // 1. Repository 등록 (앱 시작 시 한 번만)
 * RepositoryRegistry.registerAll();
 *
 * // 2. Repository 사용
 * const studentRepo = RepositoryRegistry.getStudentRepository();
 * const students = await studentRepo.findAll();
 *
 * // 3. 또는 개별 Factory 사용
 * const studentRepo = StudentRepositoryFactory.create();
 * ```
 */
