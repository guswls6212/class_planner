import type { TempEnrollment } from "./sessionSaveUtils";

/**
 * EditSessionModal 의 `tempEnrollments` 에서 현재 students 배열에 존재하지 않는
 * studentId 를 갖는 entry 를 제거.
 *
 * Why: 인라인 "+ 새 학생 추가" → createStudent 5초 await 동안 dropdown 에 temp id
 * 학생이 노출. 사용자가 dropdown 에서 한 번 더 클릭하면 tempEnrollments 에 temp
 * studentId 가 들어가고, await 끝난 후 handleEditCreateStudentAndAdd 가 reconciled
 * studentId 로도 add → 같은 학생이 두 enrollment 로 tempEnrollments 에 남음. save
 * 시 processTempEnrollments 가 각 tempEnrollment 마다 addEnrollment(staleStudentId,
 * subjectId) server POST → FK 위반 → 500 + outbox 무한 retry.
 *
 * editModalData.enrollmentIds 에도 stale tempEnrollment id 가 들어있으므로 그것
 * 도 동시에 sanitize (removedIds 반환으로 호출부가 따로 정리).
 *
 * 멱등: 변경 없음이면 kept === tempEnrollments + removedIds.size === 0.
 */
export function sanitizeTempEnrollments(
  tempEnrollments: TempEnrollment[],
  students: ReadonlyArray<{ id: string }>,
): { kept: TempEnrollment[]; removedIds: Set<string> } {
  const removedIds = new Set<string>();
  const kept = tempEnrollments.filter((te) => {
    const valid = students.some((s) => s.id === te.studentId);
    if (!valid) removedIds.add(te.id);
    return valid;
  });
  if (removedIds.size === 0) return { kept: tempEnrollments, removedIds };
  return { kept, removedIds };
}
