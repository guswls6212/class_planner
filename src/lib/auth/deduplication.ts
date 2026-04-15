import type { Student, Subject, Enrollment, Session } from "../planner";

/**
 * 서버 데이터 우선 원칙에 따라 로컬 엔티티와 서버 엔티티 간 중복 여부를 판단하는 순수 함수 모듈.
 */

/**
 * 학생 중복 판단.
 * name + gender + birthDate 세 필드가 모두 존재하고 모두 일치할 때만 중복으로 판단한다.
 * 어느 한 쪽이라도 필드가 없으면 null 반환.
 */
export function findDuplicateStudent(
  local: Student,
  serverStudents: Student[]
): Student | null {
  const localName = local.name?.trim();
  const localGender = local.gender?.trim();
  const localBirthDate = local.birthDate?.trim();

  if (!localName || !localGender || !localBirthDate) return null;

  for (const server of serverStudents) {
    const serverName = server.name?.trim();
    const serverGender = server.gender?.trim();
    const serverBirthDate = server.birthDate?.trim();

    if (!serverName || !serverGender || !serverBirthDate) continue;

    if (
      localName === serverName &&
      localGender === serverGender &&
      localBirthDate === serverBirthDate
    ) {
      return server;
    }
  }

  return null;
}

/**
 * 과목 중복 판단.
 * name이 정확히 일치하면 중복으로 판단한다 (대소문자 구분).
 */
export function findDuplicateSubject(
  local: Subject,
  serverSubjects: Subject[]
): Subject | null {
  for (const server of serverSubjects) {
    if (local.name === server.name) {
      return server;
    }
  }
  return null;
}

/**
 * 수강 중복 판단.
 * studentIdMap/subjectIdMap을 통해 로컬 ID를 서버 ID로 변환한 뒤,
 * 서버 수강 중 (mappedStudentId, mappedSubjectId) 쌍이 일치하는 것을 찾는다.
 */
export function findDuplicateEnrollment(
  local: Enrollment,
  serverEnrollments: Enrollment[],
  studentIdMap: Map<string, string>,
  subjectIdMap: Map<string, string>
): Enrollment | null {
  const mappedStudentId = studentIdMap.get(local.studentId);
  const mappedSubjectId = subjectIdMap.get(local.subjectId);

  if (mappedStudentId === undefined || mappedSubjectId === undefined) return null;

  for (const server of serverEnrollments) {
    if (
      server.studentId === mappedStudentId &&
      server.subjectId === mappedSubjectId
    ) {
      return server;
    }
  }

  return null;
}

/**
 * 수업 중복 판단.
 * 같은 요일(weekday) + 시작 시간(startsAt) + 학생/과목 조합 중 하나라도 겹치면 중복으로 판단한다.
 */
export function findDuplicateSession(
  local: Session,
  serverSessions: Session[],
  enrollmentIdMap: Map<string, string>,
  localEnrollments: Enrollment[],
  serverEnrollments: Enrollment[],
  studentIdMap: Map<string, string>,
  subjectIdMap: Map<string, string>
): Session | null {
  // 로컬 세션의 학생/과목 쌍을 서버 ID 기준으로 변환
  const localPairs = new Set<string>();
  for (const localEnrollmentId of local.enrollmentIds ?? []) {
    const enrollment = localEnrollments.find((e) => e.id === localEnrollmentId);
    if (!enrollment) continue;
    const mappedStudentId = studentIdMap.get(enrollment.studentId);
    const mappedSubjectId = subjectIdMap.get(enrollment.subjectId);
    if (mappedStudentId === undefined || mappedSubjectId === undefined) continue;
    localPairs.add(`${mappedStudentId}:${mappedSubjectId}`);
  }

  if (localPairs.size === 0) return null;

  for (const server of serverSessions) {
    // 요일과 시작 시간이 다르면 스킵
    if (server.weekday !== local.weekday || server.startsAt !== local.startsAt) {
      continue;
    }

    // 서버 세션의 학생/과목 쌍을 수집 (서버 ID 그대로 사용)
    const serverPairs = new Set<string>();
    for (const serverEnrollmentId of server.enrollmentIds ?? []) {
      const enrollment = serverEnrollments.find((e) => e.id === serverEnrollmentId);
      if (!enrollment) continue;
      serverPairs.add(`${enrollment.studentId}:${enrollment.subjectId}`);
    }

    // 두 집합 간 교집합이 있으면 중복
    for (const pair of localPairs) {
      if (serverPairs.has(pair)) {
        return server;
      }
    }
  }

  return null;
}
