/**
 * Application Services Factory
 * RepositoryRegistry를 사용하여 Application Services를 생성합니다.
 */

import { RepositoryRegistry } from "@/infrastructure";
import { EnrollmentApplicationServiceImpl } from "./EnrollmentApplicationService";
import { SessionApplicationServiceImpl } from "./SessionApplicationService";
import { StudentApplicationServiceImpl } from "./StudentApplicationService";
import { SubjectApplicationServiceImpl } from "./SubjectApplicationService";
import { TeacherApplicationServiceImpl } from "./TeacherApplicationService";

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
    const studentRepository = RepositoryRegistry.getStudentRepository() as import('@/infrastructure/interfaces').StudentRepository;
    return new StudentApplicationServiceImpl(studentRepository);
  }

  /**
   * SubjectApplicationService 인스턴스를 생성합니다.
   * @returns SubjectApplicationService 인스턴스
   */
  static createSubjectService(): SubjectApplicationServiceImpl {
    const subjectRepository = RepositoryRegistry.getSubjectRepository() as import('@/infrastructure/interfaces').SubjectRepository;
    return new SubjectApplicationServiceImpl(subjectRepository);
  }

  /**
   * SessionApplicationService 인스턴스를 생성합니다.
   * @returns SessionApplicationService 인스턴스
   */
  static createSessionService(): SessionApplicationServiceImpl {
    const sessionRepository = RepositoryRegistry.getSessionRepository() as import('@/infrastructure/interfaces').SessionRepository;
    return new SessionApplicationServiceImpl(sessionRepository);
  }

  /**
   * EnrollmentApplicationService 인스턴스를 생성합니다.
   * @returns EnrollmentApplicationService 인스턴스
   */
  static createEnrollmentService(): EnrollmentApplicationServiceImpl {
    const enrollmentRepository = RepositoryRegistry.getEnrollmentRepository() as import('@/infrastructure/interfaces').EnrollmentRepository;
    return new EnrollmentApplicationServiceImpl(enrollmentRepository);
  }

  /**
   * TeacherApplicationService 인스턴스를 생성합니다.
   */
  static createTeacherService(): TeacherApplicationServiceImpl {
    const teacherRepository = RepositoryRegistry.getTeacherRepository() as import('@/infrastructure/interfaces').TeacherRepository;
    return new TeacherApplicationServiceImpl(teacherRepository);
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
      enrollmentService: this.createEnrollmentService(),
      teacherService: this.createTeacherService(),
    };
  }
}

