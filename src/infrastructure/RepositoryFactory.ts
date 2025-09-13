import { RepositoryRegistry } from "./container/RepositoryRegistry";
import {
  EnrollmentRepository,
  SessionRepository,
  StudentRepository,
  SubjectRepository,
} from "./interfaces";

/**
 * 새로운 RepositoryFactory
 * 의존성 주입 컨테이너를 사용하여 Repository를 생성합니다.
 *
 * @deprecated 이 파일은 하위 호환성을 위해 유지됩니다.
 * 새로운 코드에서는 RepositoryRegistry를 직접 사용하세요.
 */
export class RepositoryFactory {
  /**
   * StudentRepository를 생성합니다.
   * @returns StudentRepository 인스턴스
   * @deprecated RepositoryRegistry.getStudentRepository()를 사용하세요.
   */
  static createStudentRepository(): StudentRepository {
    console.warn(
      "⚠️ RepositoryFactory.createStudentRepository()는 deprecated입니다. RepositoryRegistry.getStudentRepository()를 사용하세요."
    );

    // Repository가 등록되지 않은 경우 자동으로 등록
    if (!RepositoryRegistry.isRegistered()) {
      RepositoryRegistry.registerAll();
    }

    return RepositoryRegistry.getStudentRepository() as StudentRepository;
  }

  /**
   * SubjectRepository를 생성합니다.
   * @returns SubjectRepository 인스턴스
   * @deprecated RepositoryRegistry.getSubjectRepository()를 사용하세요.
   */
  static createSubjectRepository(): SubjectRepository {
    console.warn(
      "⚠️ RepositoryFactory.createSubjectRepository()는 deprecated입니다. RepositoryRegistry.getSubjectRepository()를 사용하세요."
    );

    // Repository가 등록되지 않은 경우 자동으로 등록
    if (!RepositoryRegistry.isRegistered()) {
      RepositoryRegistry.registerAll();
    }

    return RepositoryRegistry.getSubjectRepository() as SubjectRepository;
  }

  /**
   * SessionRepository를 생성합니다.
   * @returns SessionRepository 인스턴스
   * @deprecated RepositoryRegistry.getSessionRepository()를 사용하세요.
   */
  static createSessionRepository(): SessionRepository {
    console.warn(
      "⚠️ RepositoryFactory.createSessionRepository()는 deprecated입니다. RepositoryRegistry.getSessionRepository()를 사용하세요."
    );

    // Repository가 등록되지 않은 경우 자동으로 등록
    if (!RepositoryRegistry.isRegistered()) {
      RepositoryRegistry.registerAll();
    }

    return RepositoryRegistry.getSessionRepository() as SessionRepository;
  }

  /**
   * EnrollmentRepository를 생성합니다.
   * @returns EnrollmentRepository 인스턴스
   * @deprecated RepositoryRegistry.getEnrollmentRepository()를 사용하세요.
   */
  static createEnrollmentRepository(): EnrollmentRepository {
    console.warn(
      "⚠️ RepositoryFactory.createEnrollmentRepository()는 deprecated입니다. RepositoryRegistry.getEnrollmentRepository()를 사용하세요."
    );

    // Repository가 등록되지 않은 경우 자동으로 등록
    if (!RepositoryRegistry.isRegistered()) {
      RepositoryRegistry.registerAll();
    }

    return RepositoryRegistry.getEnrollmentRepository() as EnrollmentRepository;
  }
}

/**
 * 하위 호환성을 위한 함수형 인터페이스
 * @deprecated RepositoryFactory 클래스를 사용하세요.
 */
export function createStudentRepository(): StudentRepository {
  return RepositoryFactory.createStudentRepository();
}

export function createSubjectRepository(): SubjectRepository {
  return RepositoryFactory.createSubjectRepository();
}

export function createSessionRepository(): SessionRepository {
  return RepositoryFactory.createSessionRepository();
}

export function createEnrollmentRepository(): EnrollmentRepository {
  return RepositoryFactory.createEnrollmentRepository();
}
