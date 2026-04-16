import type { Enrollment } from "../../../lib/planner";

export interface TempEnrollment {
  id: string;
  studentId: string;
  subjectId: string;
}

export interface SessionSaveData {
  enrollmentIds: string[];
  studentIds: string[];
  subjectId: string;
  teacherId?: string;
  weekday: number;
  startTime: string;
  endTime: string;
  room: string;
}

/**
 * 임시 enrollment들을 실제 enrollment로 변환하고 병합
 */
export const processTempEnrollments = async (
  tempEnrollments: TempEnrollment[],
  addEnrollment: (studentId: string, subjectId: string) => Promise<boolean>,
  getClassPlannerData: () => { enrollments: Enrollment[] }
): Promise<{
  allEnrollments: Enrollment[];
  currentEnrollmentIds: string[];
}> => {
  // 임시 enrollments를 실제로 추가
  if (tempEnrollments.length > 0) {
    for (const tempEnrollment of tempEnrollments) {
      await addEnrollment(tempEnrollment.studentId, tempEnrollment.subjectId);
    }
  }

  // 업데이트된 데이터 가져오기
  const updatedData = getClassPlannerData();
  const allEnrollments = updatedData.enrollments;

  // 기존 enrollmentIds 필터링 (유효한 것만)
  const currentEnrollmentIds: string[] = [];

  // 임시 enrollment들에서 실제 enrollment 찾아서 추가
  for (const tempEnrollment of tempEnrollments) {
    const realEnrollment = allEnrollments.find(
      (e) =>
        e.studentId === tempEnrollment.studentId &&
        e.subjectId === tempEnrollment.subjectId
    );
    if (realEnrollment && !currentEnrollmentIds.includes(realEnrollment.id)) {
      currentEnrollmentIds.push(realEnrollment.id);
    }
  }

  return { allEnrollments, currentEnrollmentIds };
};

/**
 * enrollmentIds에서 studentIds 추출
 */
export const extractStudentIds = (
  enrollmentIds: string[],
  allEnrollments: Enrollment[]
): string[] => {
  return enrollmentIds
    .map(
      (enrollmentId) =>
        allEnrollments.find((e) => e.id === enrollmentId)?.studentId
    )
    .filter(Boolean) as string[];
};

/**
 * 세션 저장 데이터 생성
 */
export const buildSessionSaveData = (
  currentEnrollmentIds: string[],
  currentStudentIds: string[],
  currentSubjectId: string,
  weekday: number,
  startTime: string,
  endTime: string,
  room: string,
  teacherId?: string
): SessionSaveData => {
  return {
    enrollmentIds: currentEnrollmentIds,
    studentIds: currentStudentIds,
    subjectId: currentSubjectId,
    ...(teacherId !== undefined && { teacherId }),
    weekday,
    startTime,
    endTime,
    room,
  };
};

/**
 * 주어진 학생 IDs에 대해 특정 과목(subjectId)에 맞는 enrollment들을 보장하고 ID 목록을 반환
 */
export const ensureEnrollmentIdsForSubject = async (
  studentIds: string[],
  subjectId: string,
  addEnrollment: (studentId: string, subjectId: string) => Promise<boolean>,
  getClassPlannerData: () => { enrollments: Enrollment[] },
  baseEnrollments: Enrollment[]
): Promise<{ enrollmentIds: string[]; allEnrollments: Enrollment[] }> => {
  let allEnrollments = baseEnrollments;
  const ensuredIds: string[] = [];

  for (const studentId of studentIds) {
    let found = allEnrollments.find(
      (e) => e.studentId === studentId && e.subjectId === subjectId
    );
    if (!found) {
      await addEnrollment(studentId, subjectId);
      const data = getClassPlannerData();
      allEnrollments = data.enrollments;
      found = allEnrollments.find(
        (e) => e.studentId === studentId && e.subjectId === subjectId
      );
    }
    if (found) ensuredIds.push(found.id);
  }

  return { enrollmentIds: ensuredIds, allEnrollments };
};
