import { useMemo } from "react";
import type { Enrollment, Session } from "../lib/planner";
import type { DisplaySessions } from "../types/scheduleTypes";
import {
  filterValidTeacherSessions,
  groupSessionsByWeekday,
} from "./teacherSessions";

/**
 * 특정 강사(teacherId)의 세션만 필터링하여 반환하는 훅.
 * useDisplaySessions의 변형으로, teacherId 필터가 추가됨.
 *
 * 검증/필터 순수 로직은 ./teacherSessions 로 추출 (monthly view flat 사용 + unit test 공유).
 */
export const useTeacherDisplaySessions = (
  sessions: Session[],
  enrollments: Enrollment[],
  teacherId: string | null
): DisplaySessions => {
  const displaySessions = useMemo(
    () =>
      groupSessionsByWeekday(
        filterValidTeacherSessions(sessions, enrollments, teacherId)
      ),
    [sessions, enrollments, teacherId]
  );

  return {
    sessions: displaySessions,
    selectedStudentId: null,
  };
};
