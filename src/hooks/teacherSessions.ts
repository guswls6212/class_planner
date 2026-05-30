import type { Enrollment, Session } from "../lib/planner";
import { warnInvalidSession } from "./_sessionValidationLogger";

/**
 * teacherSessions: 강사 본인 수업의 유효성 검증 + 필터링 순수 로직.
 *
 * 한 문장 책임: "주어진 sessions 에서 렌더 가능한(유효한) 강사 본인 수업만 시간순으로 추린다."
 *
 * useTeacherDisplaySessions(weekly/daily 용 Map) 와 monthly view(flat Session[]) 가
 * 동일 규칙을 공유하도록 추출. React 비의존 → unit test seam.
 * 회귀 가드: PDF 5-column 중복(같은 weekday+time+teacher 가 주별 N row)은 호출 측의
 * weekStartDate 필터로 차단하며, 본 helper 의 테스트가 그 단일화를 검증한다.
 */

/** 렌더 가능한 session 인지 — 필수 필드 + 최소 1개 유효 enrollment 보유. */
export function isValidSession(
  session: Session,
  enrollments: Enrollment[]
): boolean {
  if (
    !session.startsAt ||
    !session.endsAt ||
    session.weekday === undefined ||
    session.weekday === null
  ) {
    warnInvalidSession("missing-fields", { sessionId: session.id });
    return false;
  }

  if (
    !session.enrollmentIds ||
    !Array.isArray(session.enrollmentIds) ||
    session.enrollmentIds.length === 0
  ) {
    warnInvalidSession("missing-enrollment-ids", { sessionId: session.id });
    return false;
  }

  const hasValidEnrollment = session.enrollmentIds.some((enrollmentId) =>
    enrollments.some((e) => e.id === enrollmentId)
  );

  if (!hasValidEnrollment) {
    warnInvalidSession("no-valid-enrollment", { sessionId: session.id });
    return false;
  }

  return true;
}

/**
 * 유효한 강사 본인 수업만 시간순(startsAt) 정렬해 flat 으로 반환.
 * teacherId 가 null 이면 (강사 미연결) 유효 session 전체를 반환한다 — 기존 hook 동작 보존.
 */
export function filterValidTeacherSessions(
  sessions: Session[],
  enrollments: Enrollment[],
  teacherId: string | null
): Session[] {
  const valid = sessions.filter((s) => isValidSession(s, enrollments));
  const scoped = teacherId
    ? valid.filter((s) => s.teacherId === teacherId)
    : valid;
  return scoped
    .slice()
    .sort((a, b) => (a.startsAt || "").localeCompare(b.startsAt || ""));
}

/** flat Session[] 를 weekday → Session[] Map 으로 group (weekly/daily grid 입력형). */
export function groupSessionsByWeekday(
  sessions: Session[]
): Map<number, Session[]> {
  return sessions.reduce((acc, s) => {
    const list = acc.get(s.weekday) ?? [];
    list.push(s);
    acc.set(s.weekday, list);
    return acc;
  }, new Map<number, Session[]>());
}
