import { useMemo } from "react";
import type { Enrollment, Session } from "../lib/planner";
import { logger } from "../lib/logger";
import type { DisplaySessions } from "../types/scheduleTypes";

/**
 * 특정 강사(teacherId)의 세션만 필터링하여 반환하는 훅.
 * useDisplaySessions의 변형으로, teacherId 필터가 추가됨.
 */
export const useTeacherDisplaySessions = (
  sessions: Session[],
  enrollments: Enrollment[],
  teacherId: string | null
): DisplaySessions => {
  const displaySessions = useMemo(() => {
    const isValidSession = (session: Session): boolean => {
      if (
        !session.startsAt ||
        !session.endsAt ||
        session.weekday === undefined ||
        session.weekday === null
      ) {
        logger.warn("불완전한 세션 필터링됨 (필수 속성 누락)", {
          sessionId: session.id,
        });
        return false;
      }

      if (
        !session.enrollmentIds ||
        !Array.isArray(session.enrollmentIds) ||
        session.enrollmentIds.length === 0
      ) {
        logger.warn("불완전한 세션 필터링됨 (enrollmentIds 누락)", {
          sessionId: session.id,
        });
        return false;
      }

      const validEnrollments = session.enrollmentIds.filter((enrollmentId) =>
        enrollments.some((e) => e.id === enrollmentId)
      );

      if (validEnrollments.length === 0) {
        logger.warn("불완전한 세션 필터링됨 (유효한 enrollment 없음)", {
          sessionId: session.id,
        });
        return false;
      }

      return true;
    };

    const validSessions = sessions.filter(isValidSession);

    // teacherId로 필터링 (null이면 전체)
    const filtered = teacherId
      ? validSessions.filter((s) => s.teacherId === teacherId)
      : validSessions;

    return new Map<number, Session[]>(
      filtered
        .sort((a, b) => (a.startsAt || "").localeCompare(b.startsAt || ""))
        .reduce((acc, s) => {
          const list = acc.get(s.weekday) ?? [];
          list.push(s);
          acc.set(s.weekday, list);
          return acc;
        }, new Map<number, Session[]>())
    );
  }, [sessions, enrollments, teacherId]);

  return {
    sessions: displaySessions,
    selectedStudentId: null,
  };
};
