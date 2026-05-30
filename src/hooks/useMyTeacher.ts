"use client";

import { useMyRole } from "./useMyRole";

export interface MyTeacherData {
  teacherId: string | null;
  teacherName: string | null;
  teacherColor: string | null;
  isLoading: boolean;
}

/**
 * Returns the current user's linked teacher record, or null if not linked.
 * Built on top of useMyRole to avoid double-fetching /api/members.
 */
export function useMyTeacher(): MyTeacherData {
  const { linkedTeacherId, linkedTeacherName, linkedTeacherColor, isLoading } =
    useMyRole();

  return {
    teacherId: linkedTeacherId,
    teacherName: linkedTeacherName,
    teacherColor: linkedTeacherColor,
    isLoading,
  };
}
