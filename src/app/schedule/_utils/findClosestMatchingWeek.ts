/**
 * Cross-week filter empty banner (ADR-020 보강, UAT 2026-05-21).
 *
 * 활성 필터의 AND 매칭 session 이 현재 주 에 0건 + 다른 주에 1건+ 인 경우,
 * 가장 가까운 매칭 주 (week_start_date) + 그 주 매칭 개수 + future/past 방향 계산.
 *
 * tie-breaker: 같은 |delta| 면 future 우선 (다음 수업 안내 의미).
 */
import type { Session } from "../../../lib/planner";
import { sessionMatchesFilters } from "../../../components/molecules/SessionBlock.utils";

interface FindClosestEnrollment {
  id: string;
  studentId: string;
  subjectId: string;
}

export interface FindClosestMatchingWeekInput {
  sessions: Session[];
  enrollments: FindClosestEnrollment[];
  /** 현재 보고 있는 주 (KST 월요일 ISO date "YYYY-MM-DD") */
  currentWeekStart: string;
  selectedStudentIds: string[];
  selectedSubjectIds: string[];
  selectedTeacherIds: string[];
}

export interface FindClosestMatchingWeekResult {
  weekStartDate: string;
  count: number;
  isFuture: boolean;
}

export function findClosestMatchingWeek(
  input: FindClosestMatchingWeekInput,
): FindClosestMatchingWeekResult | null {
  const {
    sessions,
    enrollments,
    currentWeekStart,
    selectedStudentIds,
    selectedSubjectIds,
    selectedTeacherIds,
  } = input;

  const anyActive =
    selectedStudentIds.length > 0 ||
    selectedSubjectIds.length > 0 ||
    selectedTeacherIds.length > 0;
  if (!anyActive) return null;

  const matching = sessions.filter(
    (s) =>
      s.weekStartDate &&
      sessionMatchesFilters(
        s,
        enrollments,
        selectedStudentIds,
        selectedSubjectIds,
        selectedTeacherIds,
      ),
  );
  const inCurrentWeek = matching.some(
    (s) => s.weekStartDate === currentWeekStart,
  );
  if (inCurrentWeek) return null;
  if (matching.length === 0) return null;

  const currentMs = new Date(`${currentWeekStart}T12:00:00+09:00`).getTime();
  let bestWeek: string | null = null;
  let bestDelta = Infinity;
  let bestIsFuture = false;
  for (const s of matching) {
    const wsd = s.weekStartDate!;
    const t = new Date(`${wsd}T12:00:00+09:00`).getTime();
    const delta = Math.abs(t - currentMs);
    const isFuture = t > currentMs;
    if (
      delta < bestDelta ||
      (delta === bestDelta && isFuture && !bestIsFuture)
    ) {
      bestDelta = delta;
      bestWeek = wsd;
      bestIsFuture = isFuture;
    }
  }
  if (!bestWeek) return null;
  const count = matching.filter((s) => s.weekStartDate === bestWeek).length;
  return {
    weekStartDate: bestWeek,
    count,
    isFuture: bestIsFuture,
  };
}
