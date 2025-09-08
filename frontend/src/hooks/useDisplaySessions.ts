import { useMemo } from 'react';
import type { Enrollment, Session } from '../lib/planner';
import type { DisplaySessions } from '../types/scheduleTypes';

export const useDisplaySessions = (
  sessions: Session[],
  enrollments: Enrollment[],
  selectedStudentId: string,
): DisplaySessions => {
  const displaySessions = useMemo(() => {
    if (selectedStudentId) {
      // 선택된 학생이 있으면 해당 학생의 세션만 필터링
      return new Map<number, Session[]>(
        sessions
          .filter(s =>
            s.enrollmentIds.some(enrollmentId => {
              const enrollment = enrollments.find(e => e.id === enrollmentId);
              return enrollment?.studentId === selectedStudentId;
            }),
          )
          .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
          .reduce((acc, s) => {
            const list = acc.get(s.weekday) ?? [];
            list.push(s);
            acc.set(s.weekday, list);
            return acc;
          }, new Map<number, Session[]>()),
      );
    } else {
      // 전체 학생의 세션 표시
      return new Map<number, Session[]>(
        sessions
          .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
          .reduce((acc, s) => {
            const list = acc.get(s.weekday) ?? [];
            list.push(s);
            acc.set(s.weekday, list);
            return acc;
          }, new Map<number, Session[]>()),
      );
    }
  }, [sessions, enrollments, selectedStudentId]);

  return {
    sessions: displaySessions,
    selectedStudentId: selectedStudentId || null,
  };
};
