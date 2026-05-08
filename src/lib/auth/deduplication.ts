import type { Student, Subject, Enrollment, Session } from "../planner";

/**
 * 서버 데이터 우선 원칙에 따라 로컬 엔티티와 서버 엔티티 간 중복 여부를 판단하는 순수 함수 모듈.
 */

/**
 * 학생 중복 판단 (graceful 매칭).
 *
 * 규칙:
 *  1) 이름이 서로 다르면 null.
 *  2) 같은 이름의 server 후보가 1명이고 양쪽 모두 birthDate+gender가 채워져 있으면
 *     strict 비교 (값이 다르면 null → 폴백에 위임).
 *  3) 같은 이름의 server 후보가 1명이고 한쪽이라도 메타가 비어있으면 이름이 학원 내
 *     unique key 역할을 한다고 가정하고 그 server를 반환한다 (UAT 케이스).
 *  4) 동명이인 다수면 양쪽 모두 메타가 채워졌을 때만 strict 비교, 아니면 null (모호).
 *
 * 가정: academy 단위로 격리되며 한 학원 안에서 동일 이름은 거의 같은 사람이다.
 * 동명이인 우려는 (4)의 strict 비교로 보호한다.
 */
export function findDuplicateStudent(
  local: Student,
  serverStudents: Student[]
): Student | null {
  const localName = local.name?.trim();
  if (!localName) return null;

  const sameName = serverStudents.filter((s) => s.name?.trim() === localName);
  if (sameName.length === 0) return null;

  const localGender = local.gender?.trim();
  const localBirthDate = local.birthDate?.trim();

  if (sameName.length === 1) {
    const candidate = sameName[0];
    const candGender = candidate.gender?.trim();
    const candBirthDate = candidate.birthDate?.trim();

    // 양쪽 모두 메타가 완전한 경우에만 strict 비교 — mismatch면 null로 폴백 위임.
    // (예: 같은 이름이지만 다른 성별/생일 = 다른 학생일 가능성)
    if (localGender && localBirthDate && candGender && candBirthDate) {
      return localGender === candGender && localBirthDate === candBirthDate
        ? candidate
        : null;
    }
    // 부분 정보 — 이름이 unique key 역할, 그 server 반환.
    return candidate;
  }

  // 동명이인 다수 — 모호. 메타가 부족하면 폴백에 위임.
  if (!localGender || !localBirthDate) return null;

  for (const candidate of sameName) {
    const candGender = candidate.gender?.trim();
    const candBirthDate = candidate.birthDate?.trim();
    if (!candGender || !candBirthDate) continue;
    if (
      localGender === candGender &&
      localBirthDate === candBirthDate
    ) {
      return candidate;
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
