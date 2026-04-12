/**
 * Infrastructure 계층 진입점
 */

// 설정
export type { RepositoryConfig } from "./config/RepositoryConfig";
export { RepositoryConfigFactory } from "./config/RepositoryConfig";

// Registry (ServiceFactory의 진입점)
export { REPOSITORY_KEYS, RepositoryRegistry } from "./container/RepositoryRegistry";

// 개별 Factory (RepositoryConfig 내부에서 사용)
export { EnrollmentRepositoryFactory } from "./factories/EnrollmentRepositoryFactory";
export { SessionRepositoryFactory } from "./factories/SessionRepositoryFactory";
export { StudentRepositoryFactory } from "./factories/StudentRepositoryFactory";
export { SubjectRepositoryFactory } from "./factories/SubjectRepositoryFactory";

// 인터페이스
export * from "./interfaces";

// Repository 구현체
export { SupabaseStudentRepository } from "./repositories/SupabaseStudentRepository";
export { SupabaseSubjectRepository } from "./repositories/SupabaseSubjectRepository";
