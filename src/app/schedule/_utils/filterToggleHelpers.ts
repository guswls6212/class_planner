/**
 * tryToggleStudent / tryToggleSubject / tryToggleTeacher 의 공통 logic.
 *
 * 기존: 3 handler 가 동일 구조 (이미 선택? → 해제 / 아니면 다음 selected set 으로
 * sessionMatchesFilters 시도 → wouldMatch 안 되면 토스트 + 거부 / 아니면 선택).
 * 각 33 줄 = 100 줄 총합. dependency 가 8+ 라 hook 추출 비효율.
 *
 * 본 utils: pure function `planFilterToggleAttempt` 1 개 — kind 로 student/subject
 * /teacher 분기. result 의 action 으로 page 가 toggle / 토스트 결정.
 *
 * Sub-proposal: schedule-page-split-refactor PR 9 (loop iteration 4, utils 패턴 확장).
 */

import type { Session, Enrollment } from "@/lib/planner";
import { sessionMatchesFilters } from "@/components/molecules/SessionBlock.utils";

export type FilterKind = "student" | "subject" | "teacher";

export type ToggleAttemptOutcome =
  /** 이미 선택된 id → 해제 */
  | { action: "deselect" }
  /** 새 chip 추가 시 wouldMatch sessions ≥ 1 → 선택 허용 */
  | { action: "select" }
  /** wouldMatch=0 → 거부. page 가 토스트 표시 */
  | { action: "rejected"; entityName: string };

export function planFilterToggleAttempt(params: {
  /** toggle 시도 대상 id */
  id: string;
  kind: FilterKind;
  sessions: Session[];
  enrollments: Enrollment[];
  selectedStudentIds: string[];
  selectedSubjectIds: string[];
  selectedTeacherIds: string[];
  /** rejected 시 토스트 메시지에 쓰일 entity 이름 (lookup 실패 시 "이 학생" 등 fallback) */
  entityName: string;
}): ToggleAttemptOutcome {
  const currentSelected =
    params.kind === "student"
      ? params.selectedStudentIds
      : params.kind === "subject"
        ? params.selectedSubjectIds
        : params.selectedTeacherIds;

  // 이미 선택된 id → 해제 (거부 없음).
  if (currentSelected.includes(params.id)) {
    return { action: "deselect" };
  }

  // 새 id 추가 시 매칭 sessions 가 0 이면 거부.
  const nextSelected = [...currentSelected, params.id];
  const studentIds =
    params.kind === "student" ? nextSelected : params.selectedStudentIds;
  const subjectIds =
    params.kind === "subject" ? nextSelected : params.selectedSubjectIds;
  const teacherIds =
    params.kind === "teacher" ? nextSelected : params.selectedTeacherIds;

  const wouldMatch = params.sessions.some((s) =>
    sessionMatchesFilters(
      s,
      params.enrollments,
      studentIds,
      subjectIds,
      teacherIds,
    ),
  );

  if (!wouldMatch) {
    return { action: "rejected", entityName: params.entityName };
  }

  return { action: "select" };
}
