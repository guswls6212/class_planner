/**
 * Modal 의 selected studentIds 에서 현재 students 배열에 존재하지 않는 stale id 제거.
 *
 * Why: 인라인 학생 생성(temp id → server reconcile → reconciled id) 흐름에서 모달의
 * React state 가 reconcile 을 자동으로 따라가지 못함. 결과적으로 사용자가 같은
 * 학생을 두 id (temp + reconciled) 로 selected 에 갖게 되면 POST 페이로드에 stale id
 * 가 그대로 들어가 server FK 위반 → 500 → outbox 무한 retry (omni-radar 2026-05-13).
 *
 * 멱등: 변경 없음이면 입력 배열을 그대로 반환 (referential equality 보존 — 불필요한
 * setState 회피).
 */
export function sanitizeStudentIds(
  studentIds: string[],
  students: ReadonlyArray<{ id: string }>,
): string[] {
  const validStudentIds = studentIds.filter((id) =>
    students.some((s) => s.id === id),
  );
  if (validStudentIds.length === studentIds.length) return studentIds;
  return validStudentIds;
}
