/**
 * Application Services Factory
 * RepositoryRegistry를 사용하여 Application Services를 생성합니다.
 */

import { RepositoryRegistry } from "@/infrastructure";
import { SessionApplicationServiceImpl } from "./SessionApplicationService";
import { StudentApplicationServiceImpl } from "./StudentApplicationService";
import { SubjectApplicationServiceImpl } from "./SubjectApplicationService";

/**
 * Application Services Factory
 * 새로운 RepositoryRegistry 구조를 사용하여 서비스를 생성합니다.
 */
export class ServiceFactory {
  /**
   * StudentApplicationService 인스턴스를 생성합니다.
   * @returns StudentApplicationService 인스턴스
   */
  static createStudentService(): StudentApplicationServiceImpl {
    const studentRepository = RepositoryRegistry.getStudentRepository();
    return new StudentApplicationServiceImpl(studentRepository);
  }

  /**
   * SubjectApplicationService 인스턴스를 생성합니다.
   * @returns SubjectApplicationService 인스턴스
   */
  static createSubjectService(): SubjectApplicationServiceImpl {
    const subjectRepository = RepositoryRegistry.getSubjectRepository();
    return new SubjectApplicationServiceImpl(subjectRepository);
  }

  /**
   * SessionApplicationService 인스턴스를 생성합니다.
   * @returns SessionApplicationService 인스턴스
   */
  static createSessionService(): SessionApplicationServiceImpl {
    const sessionRepository = RepositoryRegistry.getSessionRepository();
    return new SessionApplicationServiceImpl(sessionRepository);
  }

  /**
   * 모든 Application Services를 생성합니다.
   * @returns 모든 서비스 인스턴스
   */
  static createAllServices() {
    return {
      studentService: this.createStudentService(),
      subjectService: this.createSubjectService(),
      sessionService: this.createSessionService(),
    };
  }
}

/**
 * 하위 호환성을 위한 함수형 인터페이스
 * @deprecated ServiceFactory 클래스를 사용하세요.
 */
export function createStudentService(): StudentApplicationServiceImpl {
  console.warn(
    "⚠️ createStudentService()는 deprecated입니다. ServiceFactory.createStudentService()를 사용하세요."
  );
  return ServiceFactory.createStudentService();
}

export function createSubjectService(): SubjectApplicationServiceImpl {
  console.warn(
    "⚠️ createSubjectService()는 deprecated입니다. ServiceFactory.createSubjectService()를 사용하세요."
  );
  return ServiceFactory.createSubjectService();
}

export function createSessionService(): SessionApplicationServiceImpl {
  console.warn(
    "⚠️ createSessionService()는 deprecated입니다. ServiceFactory.createSessionService()를 사용하세요."
  );
  return ServiceFactory.createSessionService();
}


