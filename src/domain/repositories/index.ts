/**
 * 🏢 Domain Repository Interfaces
 *
 * 도메인 레이어의 리포지토리 인터페이스들을 정의합니다.
 * 인프라스트럭처 레이어에서 구현됩니다.
 */

import { Student } from '../entities/Student';
import { Subject } from '../entities/Subject';
import { StudentId } from '../value-objects/StudentId';
import { SubjectId } from '../value-objects/SubjectId';

// ===== Student Repository Interface =====

export interface IStudentRepository {
  /**
   * ID로 학생을 조회합니다.
   */
  findById(id: StudentId): Promise<Student | null>;

  /**
   * 모든 학생을 조회합니다.
   */
  findAll(): Promise<Student[]>;

  /**
   * 학생을 저장합니다 (생성 또는 업데이트).
   */
  save(student: Student): Promise<Student>;

  /**
   * 학생을 삭제합니다.
   */
  delete(id: StudentId): Promise<void>;

  /**
   * 이름으로 학생을 검색합니다.
   */
  findByName(name: string): Promise<Student | null>;

  /**
   * 학생이 존재하는지 확인합니다.
   */
  exists(id: StudentId): Promise<boolean>;

  /**
   * 학생 수를 반환합니다.
   */
  count(): Promise<number>;
}

// ===== Subject Repository Interface =====

export interface ISubjectRepository {
  /**
   * ID로 과목을 조회합니다.
   */
  findById(id: SubjectId): Promise<Subject | null>;

  /**
   * 모든 과목을 조회합니다.
   */
  findAll(): Promise<Subject[]>;

  /**
   * 과목을 저장합니다 (생성 또는 업데이트).
   */
  save(subject: Subject): Promise<Subject>;

  /**
   * 과목을 삭제합니다.
   */
  delete(id: SubjectId): Promise<void>;

  /**
   * 이름으로 과목을 검색합니다.
   */
  findByName(name: string): Promise<Subject | null>;

  /**
   * 과목이 존재하는지 확인합니다.
   */
  exists(id: SubjectId): Promise<boolean>;

  /**
   * 과목 수를 반환합니다.
   */
  count(): Promise<number>;
}

// ===== Session Repository Interface =====

export interface ISessionRepository {
  /**
   * 모든 세션을 조회합니다.
   */
  findAll(): Promise<any[]>; // Session 엔티티가 아직 없으므로 any 사용

  /**
   * 세션을 저장합니다.
   */
  save(session: any): Promise<any>;

  /**
   * 세션을 삭제합니다.
   */
  delete(id: string): Promise<void>;

  /**
   * 특정 요일에 해당하는 세션들을 조회합니다.
   */
  findByWeekday(weekday: number): Promise<any[]>;
}

// ===== Enrollment Repository Interface =====

export interface IEnrollmentRepository {
  /**
   * 모든 수강신청을 조회합니다.
   */
  findAll(): Promise<any[]>; // Enrollment 엔티티가 아직 없으므로 any 사용

  /**
   * 수강신청을 저장합니다.
   */
  save(enrollment: any): Promise<any>;

  /**
   * 수강신청을 삭제합니다.
   */
  delete(id: string): Promise<void>;

  /**
   * 특정 학생의 수강신청을 조회합니다.
   */
  findByStudentId(studentId: string): Promise<any[]>;

  /**
   * 특정 과목의 수강신청을 조회합니다.
   */
  findBySubjectId(subjectId: string): Promise<any[]>;
}
