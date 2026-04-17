import type { Enrollment, Session } from "@/lib/planner";

export function filterSessionsByStudents(
  sessions: Session[],
  selectedStudentIds: string[],
  enrollments: Enrollment[]
): Session[] {
  if (selectedStudentIds.length === 0) return sessions;

  const selectedSet = new Set(selectedStudentIds);

  return sessions.filter((session) =>
    (session.enrollmentIds ?? []).some((eid) => {
      const enrollment = enrollments.find((e) => e.id === eid);
      return enrollment != null && selectedSet.has(enrollment.studentId);
    })
  );
}
