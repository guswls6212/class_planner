import { logger } from "@/lib/logger";
import type { Session, Subject } from "@/lib/planner";

/**
 * 세션의 첫 번째 enrollment를 통해 과목 정보를 가져옵니다.
 * 과목을 찾을 수 없으면 null을 반환합니다.
 *
 * @canonical src/lib/schedule/getSessionSubject.ts
 * SessionBlock.utils.ts, ScheduleDailyView.tsx, MonthDayCell.tsx에서 중복 구현됨.
 * Phase 5-B에서 이 파일이 정규 위치로 승격됨.
 */
export const getSessionSubject = (
  session: Session,
  enrollments: Array<{ id: string; studentId: string; subjectId: string }>,
  subjects: Subject[]
): Subject | null => {
  if (!session.enrollmentIds || session.enrollmentIds.length === 0) {
    logger.warn("getSessionSubject: enrollmentIds가 비어있음", { sessionId: session.id });
    return null;
  }

  const enrollmentIds = session.enrollmentIds || [];
  const firstEnrollment = enrollments?.find((e) => e.id === enrollmentIds[0]);
  if (!firstEnrollment) {
    logger.warn("getSessionSubject: enrollment를 찾을 수 없음", {
      sessionId: session.id,
      enrollmentId: enrollmentIds[0],
      availableEnrollments: enrollments?.map((e) => e.id),
    });
    return null;
  }

  const subject = subjects?.find((s) => s.id === firstEnrollment.subjectId);
  if (!subject) {
    logger.warn("getSessionSubject: 과목을 찾을 수 없음", {
      sessionId: session.id,
      enrollmentId: firstEnrollment.id,
      subjectId: firstEnrollment.subjectId,
      availableSubjects: subjects?.map((s) => ({ id: s.id, name: s.name })),
    });

    if (subjects && subjects.length > 0) {
      logger.debug("getSessionSubject: 기본 과목 사용", { subject: subjects[0] });
      return subjects[0];
    }
    return null;
  }

  return subject;
};
