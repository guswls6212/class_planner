/**
 * Filter cascading auto-deselect logic 만 pure function 으로 추출.
 *
 * 기존: schedule/page.tsx 의 useEffect (58 줄) — selected chip 이 cascading 매칭 set
 * 에 없어졌으면 silent 해제. 다른 chip 선택으로 매칭 sessions 가 0 이 된 selected
 * 도 cleanup. Variant C (N/M badge) 의 인지 신호 제공.
 *
 * 본 utils: **state mutation 안 함**. 다음 selected set + removed id 목록 반환.
 * useEffect 의 toggle / set 호출은 page 가 결정.
 *
 * Sub-proposal: schedule-page-split-refactor PR 14 (loop iteration 9, utils 패턴 확장).
 */

import type { Session, Enrollment } from "@/lib/planner";
import { sessionMatchesFilters } from "@/components/molecules/SessionBlock.utils";

export interface FilterCascadeAutoDeselectPlan {
  /** filter cleanup 필요? false 면 page 가 useEffect skip */
  shouldCleanup: boolean;
  /** toggleStudentFilter 호출할 id 들 (현재 selected 인데 valid set 에 없음) */
  removedStudentIds: string[];
  /** setSelectedSubjectIds 의 새 array (현재와 다르면 적용) */
  nextSubjectIds: string[];
  /** subjects 변경 필요? (nextSubjectIds.length !== current.length) */
  subjectsChanged: boolean;
  /** toggleTeacherFilter 호출할 id 들 */
  removedTeacherIds: string[];
}

export function computeFilterCascadeAutoDeselect(params: {
  sessions: Session[];
  enrollments: Enrollment[];
  selectedStudentIds: string[];
  selectedSubjectIds: string[];
  selectedTeacherIds: string[];
}): FilterCascadeAutoDeselectPlan {
  // Guard 1: corrupted localStorage (object 등) — useLocal 이 type 검증 X.
  if (
    !Array.isArray(params.selectedStudentIds) ||
    !Array.isArray(params.selectedSubjectIds) ||
    !Array.isArray(params.selectedTeacherIds)
  ) {
    return {
      shouldCleanup: false,
      removedStudentIds: [],
      nextSubjectIds: [],
      subjectsChanged: false,
      removedTeacherIds: [],
    };
  }

  // Guard 2: 모두 빈 filter — cleanup 불필요.
  if (
    params.selectedStudentIds.length === 0 &&
    params.selectedSubjectIds.length === 0 &&
    params.selectedTeacherIds.length === 0
  ) {
    return {
      shouldCleanup: false,
      removedStudentIds: [],
      nextSubjectIds: [],
      subjectsChanged: false,
      removedTeacherIds: [],
    };
  }

  // 1 단계: 매칭 sessions 계산.
  const matching = params.sessions.filter((s) =>
    sessionMatchesFilters(
      s,
      params.enrollments,
      params.selectedStudentIds,
      params.selectedSubjectIds,
      params.selectedTeacherIds,
    ),
  );

  // 2 단계: 매칭 sessions 의 entity set 추출.
  const enrollmentById = new Map(params.enrollments.map((e) => [e.id, e]));
  const validStudents = new Set<string>();
  const validSubjects = new Set<string>();
  const validTeachers = new Set<string>();
  for (const sess of matching) {
    for (const eid of sess.enrollmentIds ?? []) {
      const e = enrollmentById.get(eid);
      if (e) {
        validStudents.add(e.studentId);
        validSubjects.add(e.subjectId);
      }
    }
    if (sess.teacherId) validTeachers.add(sess.teacherId);
  }

  // 3 단계: cleanup 대상 결정 — selected 중 valid set 에 없는 것.
  const removedStudentIds = params.selectedStudentIds.filter(
    (id) => !validStudents.has(id),
  );
  const nextSubjectIds = params.selectedSubjectIds.filter((id) =>
    validSubjects.has(id),
  );
  const subjectsChanged =
    nextSubjectIds.length !== params.selectedSubjectIds.length;
  const removedTeacherIds = params.selectedTeacherIds.filter(
    (id) => !validTeachers.has(id),
  );

  const shouldCleanup =
    removedStudentIds.length > 0 ||
    subjectsChanged ||
    removedTeacherIds.length > 0;

  return {
    shouldCleanup,
    removedStudentIds,
    nextSubjectIds,
    subjectsChanged,
    removedTeacherIds,
  };
}
