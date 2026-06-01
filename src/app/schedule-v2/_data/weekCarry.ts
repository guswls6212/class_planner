/**
 * schedule-v2 주 연속성(자동 이어가기, A2) 순수 헬퍼.
 *
 * 세션은 (weekday + weekStartDate) 로 주마다 격리 저장된다. enrollment(학생+과목)는
 * 주-독립이라, 직전 주 세션을 "현재 주"로 가져오려면 *세션만* clone(새 id, 같은
 * enrollmentIds 재사용)하면 된다 — /schedule buildApplyTemplate 의 cross-academy
 * 재매칭보다 단순/안전(같은 학원 enrollment 는 그대로 존재).
 *
 * 사용자 결정(2026-06-01): 방향 A 자동 이어가기, UX = A2(빈 주 진입 시 1회 확인).
 * proposal: schedule-v2-week-continuity (parent: study-room-fit-validation).
 */

import type { Enrollment, Session } from "@/lib/planner";

/** 현재 주(currentMonday) *이전*에 데이터가 있는 가장 가까운 주의 weekStartDate. 없으면 null. */
export function previousWeekWithData(
  sessions: Session[],
  currentMonday: string,
): string | null {
  const weeks = Array.from(
    new Set(
      sessions.map((s) => s.weekStartDate).filter((w): w is string => !!w),
    ),
  )
    .filter((w) => w < currentMonday)
    .sort();
  return weeks.length ? weeks[weeks.length - 1] : null;
}

/**
 * sourceMonday 주의 세션을 targetMonday 로 clone.
 * - 새 id(genId), weekStartDate = targetMonday
 * - enrollmentIds 는 그대로 재사용하되 *현존* enrollment 만 남김(퇴원 학생 제외)
 * - 유효 enrollment 0 인 세션은 제외(빈 세션 방지)
 */
export function carryForwardSessions(params: {
  sessions: Session[];
  enrollments: Enrollment[];
  sourceMonday: string;
  targetMonday: string;
  genId: () => string;
}): Session[] {
  const enrIds = new Set(params.enrollments.map((e) => e.id));
  const result: Session[] = [];
  for (const s of params.sessions) {
    if (s.weekStartDate !== params.sourceMonday) continue;
    const validEnrollmentIds = (s.enrollmentIds ?? []).filter((id) =>
      enrIds.has(id),
    );
    if (validEnrollmentIds.length === 0) continue;
    result.push({
      ...s,
      id: params.genId(),
      weekStartDate: params.targetMonday,
      enrollmentIds: validEnrollmentIds,
    });
  }
  return result;
}

/** "이 주는 비움(이어가기 안 함)" 사용자 의도 플래그 localStorage 키. */
export function emptyWeekFlagKey(userId: string | null, monday: string): string {
  return `cp:v2-empty-week:${userId ?? "anonymous"}:${monday}`;
}
