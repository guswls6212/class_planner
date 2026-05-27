/**
 * PDF 다이얼로그 / 카운트 / chip label 관련 pure function 모음.
 *
 * 기존: schedule/page.tsx 의 3 useMemo + 1 useMemo (60+ 줄) 가 displaySessions 의
 * filter + count + chip label 계산 inline. 같은 sessionMatchesFilters 호출이 2개
 * useMemo 에서 중복.
 *
 * 본 utils: **state mutation 안 함**. filteredSessions / allSessionsRaw / chipLabel
 * 만 반환. page 의 useMemo 는 isPdfDialogOpen 가드 + helper 호출만.
 *
 * Sub-proposal: schedule-page-split-refactor PR 17 (loop iteration 13, utils 패턴 확장).
 */

import type {
  Session,
  Enrollment,
  Student,
  Teacher,
  Subject,
} from "@/lib/planner";
import { sessionMatchesFilters } from "@/components/molecules/SessionBlock.utils";

export interface FilteredSessionsResult {
  /** displaySessions.values() flat — 모든 sessions */
  allSessionsRaw: Session[];
  /** 활성 필터 적용된 sessions (filter 비활성 시 same ref as allSessionsRaw) */
  filteredSessions: Session[];
  /** 활성 필터 존재 여부 */
  hasAnyFilter: boolean;
}

/**
 * displaySessions Map → 필터 적용 결과.
 * pdfPreflightResult, pdfCounts 양쪽에서 사용 — duplication 제거.
 */
export function computeFilteredAndAllSessions(params: {
  displaySessions: Map<number, Session[]>;
  enrollments: Enrollment[];
  selectedStudentIds: string[];
  selectedSubjectIds: string[];
  selectedTeacherIds: string[];
}): FilteredSessionsResult {
  const allSessionsRaw = Array.from(params.displaySessions.values()).flat();
  const hasAnyFilter =
    params.selectedStudentIds.length > 0 ||
    params.selectedSubjectIds.length > 0 ||
    params.selectedTeacherIds.length > 0;
  const filteredSessions = hasAnyFilter
    ? allSessionsRaw.filter((s) =>
        sessionMatchesFilters(
          s,
          params.enrollments,
          params.selectedStudentIds,
          params.selectedSubjectIds,
          params.selectedTeacherIds,
        ),
      )
    : allSessionsRaw;
  return { allSessionsRaw, filteredSessions, hasAnyFilter };
}

/**
 * 첫 활성 필터의 label — B1 amber pill 에 표시.
 *
 * Priority: 학생 → 과목 → 강사. 첫 priority 의 첫 entity name. 2+ 면 "X 외 N".
 * 미매칭 entity 는 default ("학생" / "과목" / "강사") 로 fallback.
 *
 * PR #435: B1 amber pill — 첫 활성 필터의 label.
 */
export function computeFilterChipLabel(params: {
  selectedStudentIds: string[];
  selectedSubjectIds: string[];
  selectedTeacherIds: string[];
  students: Student[];
  subjects: Subject[];
  teachers: Teacher[];
}): string | undefined {
  if (params.selectedStudentIds.length > 0) {
    const s = params.students.find(
      (x) => x.id === params.selectedStudentIds[0],
    );
    const name = s?.name ?? "학생";
    return params.selectedStudentIds.length === 1
      ? name
      : `${name} 외 ${params.selectedStudentIds.length - 1}`;
  }
  if (params.selectedSubjectIds.length > 0) {
    const s = params.subjects.find(
      (x) => x.id === params.selectedSubjectIds[0],
    );
    const name = s?.name ?? "과목";
    return params.selectedSubjectIds.length === 1
      ? name
      : `${name} 외 ${params.selectedSubjectIds.length - 1}`;
  }
  if (params.selectedTeacherIds.length > 0) {
    const t = params.teachers.find(
      (x) => x.id === params.selectedTeacherIds[0],
    );
    const name = t?.name ?? "강사";
    return params.selectedTeacherIds.length === 1
      ? name
      : `${name} 외 ${params.selectedTeacherIds.length - 1}`;
  }
  return undefined;
}
