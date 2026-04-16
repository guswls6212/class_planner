import { logger } from "../../lib/logger";
import { EnrollmentRepositoryFactory } from "../factories/EnrollmentRepositoryFactory";
import { SessionRepositoryFactory } from "../factories/SessionRepositoryFactory";
import { StudentRepositoryFactory } from "../factories/StudentRepositoryFactory";
import { SubjectRepositoryFactory } from "../factories/SubjectRepositoryFactory";
import { TeacherRepositoryFactory } from "../factories/TeacherRepositoryFactory";
import {
  EnrollmentRepository,
  SessionRepository,
  StudentRepository,
  SubjectRepository,
  TeacherRepository,
} from "../interfaces";

/**
 * Repository 설정 인터페이스
 * 모든 Repository 인스턴스를 포함합니다.
 */
export interface RepositoryConfig {
  studentRepository: StudentRepository;
  subjectRepository: SubjectRepository;
  sessionRepository: SessionRepository;
  enrollmentRepository: EnrollmentRepository;
  teacherRepository: TeacherRepository;
}

/**
 * Repository 설정 팩토리
 * 환경에 따라 적절한 Repository 설정을 생성합니다.
 */
export class RepositoryConfigFactory {
  /**
   * Repository 설정을 생성합니다.
   * @returns RepositoryConfig 인스턴스
   */
  static create(): RepositoryConfig {
    logger.debug("Repository 설정 생성 중", {
      environment: process.env.NODE_ENV || "development",
    });

    const config: RepositoryConfig = {
      studentRepository: StudentRepositoryFactory.create(),
      subjectRepository: SubjectRepositoryFactory.create(),
      sessionRepository: SessionRepositoryFactory.create(),
      enrollmentRepository: EnrollmentRepositoryFactory.create(),
      teacherRepository: TeacherRepositoryFactory.create(),
    };

    logger.info("✅ Repository 설정 생성 완료", {
      studentRepository: config.studentRepository.constructor.name,
      subjectRepository: config.subjectRepository.constructor.name,
      sessionRepository: config.sessionRepository.constructor.name,
      enrollmentRepository: config.enrollmentRepository.constructor.name,
    });

    return config;
  }

  /**
   * 테스트용 Repository 설정을 생성합니다.
   * @returns RepositoryConfig 인스턴스 (모두 Mock 구현체)
   */
  static createForTest(): RepositoryConfig {
    logger.info("🧪 테스트용 Repository 설정 생성 중...");

    const config: RepositoryConfig = {
      studentRepository: StudentRepositoryFactory.create(),
      subjectRepository: SubjectRepositoryFactory.create(),
      sessionRepository: SessionRepositoryFactory.create(),
      enrollmentRepository: EnrollmentRepositoryFactory.create(),
      teacherRepository: TeacherRepositoryFactory.create(),
    };

    logger.info("✅ 테스트용 Repository 설정 생성 완료");
    return config;
  }

  /**
   * 개발용 Repository 설정을 생성합니다.
   * @returns RepositoryConfig 인스턴스
   */
  static createForDevelopment(): RepositoryConfig {
    logger.info("🛠️ 개발용 Repository 설정 생성 중...");

    const config: RepositoryConfig = {
      studentRepository: StudentRepositoryFactory.create(),
      subjectRepository: SubjectRepositoryFactory.create(),
      sessionRepository: SessionRepositoryFactory.create(),
      enrollmentRepository: EnrollmentRepositoryFactory.create(),
      teacherRepository: TeacherRepositoryFactory.create(),
    };

    logger.info("✅ 개발용 Repository 설정 생성 완료");
    return config;
  }

  /**
   * 프로덕션용 Repository 설정을 생성합니다.
   * @returns RepositoryConfig 인스턴스
   */
  static createForProduction(): RepositoryConfig {
    logger.info("🚀 프로덕션용 Repository 설정 생성 중...");

    const config: RepositoryConfig = {
      studentRepository: StudentRepositoryFactory.create(),
      subjectRepository: SubjectRepositoryFactory.create(),
      sessionRepository: SessionRepositoryFactory.create(),
      enrollmentRepository: EnrollmentRepositoryFactory.create(),
      teacherRepository: TeacherRepositoryFactory.create(),
    };

    logger.info("✅ 프로덕션용 Repository 설정 생성 완료");
    return config;
  }
}
