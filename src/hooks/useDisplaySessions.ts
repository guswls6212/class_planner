import { useMemo } from "react";
import type { Enrollment, Session } from "../lib/planner";
import type { DisplaySessions } from "../types/scheduleTypes";

export const useDisplaySessions = (
  sessions: Session[],
  enrollments: Enrollment[],
  selectedStudentId: string
): DisplaySessions => {
  const displaySessions = useMemo(() => {
    // 🆕 불완전한 세션 필터링 함수
    const isValidSession = (session: Session): boolean => {
      // 필수 속성들이 모두 존재하는지 확인
      if (
        !session.startsAt ||
        !session.endsAt ||
        session.weekday === undefined ||
        session.weekday === null
      ) {
        console.warn("🔍 불완전한 세션 필터링됨 (필수 속성 누락):", {
          sessionId: session.id,
          startsAt: session.startsAt,
          endsAt: session.endsAt,
          weekday: session.weekday,
        });
        return false;
      }

      // enrollmentIds가 유효한 배열인지 확인
      if (
        !session.enrollmentIds ||
        !Array.isArray(session.enrollmentIds) ||
        session.enrollmentIds.length === 0
      ) {
        console.warn("🔍 불완전한 세션 필터링됨 (enrollmentIds 누락):", {
          sessionId: session.id,
          enrollmentIds: session.enrollmentIds,
        });
        return false;
      }

      // enrollmentIds가 실제로 존재하는 enrollment를 참조하는지 확인
      const validEnrollments = session.enrollmentIds.filter((enrollmentId) =>
        enrollments.some((e) => e.id === enrollmentId)
      );

      if (validEnrollments.length === 0) {
        console.warn("🔍 불완전한 세션 필터링됨 (유효한 enrollment 없음):", {
          sessionId: session.id,
          enrollmentIds: session.enrollmentIds,
          availableEnrollments: enrollments.map((e) => e.id),
        });
        return false;
      }

      return true;
    };

    // 🆕 유효한 세션만 필터링
    const validSessions = sessions.filter(isValidSession);

    if (selectedStudentId) {
      // 선택된 학생이 있으면 해당 학생의 세션만 필터링
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
      // 전체 학생의 세션 표시
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
