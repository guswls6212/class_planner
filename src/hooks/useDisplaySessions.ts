import { useMemo } from "react";
import type { Enrollment, Session } from "../lib/planner";
import { warnInvalidSession } from "./_sessionValidationLogger";
import type { DisplaySessions } from "../types/scheduleTypes";

export const useDisplaySessions = (
  sessions: Session[],
  enrollments: Enrollment[],
  selectedStudentId: string
): DisplaySessions => {
  const displaySessions = useMemo(() => {
    const isValidSession = (session: Session): boolean => {
      if (
        !session.startsAt ||
        !session.endsAt ||
        session.weekday === undefined ||
        session.weekday === null
      ) {
        warnInvalidSession("missing-fields", {
          sessionId: session.id,
          startsAt: session.startsAt,
          endsAt: session.endsAt,
          weekday: session.weekday,
        });
        return false;
      }

      if (
        !session.enrollmentIds ||
        !Array.isArray(session.enrollmentIds) ||
        session.enrollmentIds.length === 0
      ) {
        warnInvalidSession("missing-enrollment-ids", {
          sessionId: session.id,
          enrollmentIds: session.enrollmentIds,
        });
        return false;
      }

      const validEnrollments = session.enrollmentIds.filter((enrollmentId) =>
        enrollments.some((e) => e.id === enrollmentId)
      );

      if (validEnrollments.length === 0) {
        warnInvalidSession("no-valid-enrollment", {
          sessionId: session.id,
          enrollmentIds: session.enrollmentIds,
          availableEnrollments: enrollments.map((e) => e.id),
        });
        return false;
      }

      return true;
    };

    const validSessions = sessions.filter(isValidSession);

    if (selectedStudentId) {
      return new Map<number, Session[]>(
        validSessions
          .filter((s) =>
            (s.enrollmentIds || []).some((enrollmentId) => {
              const enrollment = enrollments.find((e) => e.id === enrollmentId);
              return enrollment?.studentId === selectedStudentId;
            })
          )
          .sort((a, b) => (a.startsAt || "").localeCompare(b.startsAt || ""))
          .reduce((acc, s) => {
            const list = acc.get(s.weekday) ?? [];
            list.push(s);
            acc.set(s.weekday, list);
            return acc;
          }, new Map<number, Session[]>())
      );
    } else {
      return new Map<number, Session[]>(
        validSessions
          .sort((a, b) => (a.startsAt || "").localeCompare(b.startsAt || ""))
          .reduce((acc, s) => {
            const list = acc.get(s.weekday) ?? [];
            list.push(s);
            acc.set(s.weekday, list);
            return acc;
          }, new Map<number, Session[]>())
      );
    }
  }, [sessions, enrollments, selectedStudentId]);

  return {
    sessions: displaySessions,
    selectedStudentId: selectedStudentId || null,
  };
};
