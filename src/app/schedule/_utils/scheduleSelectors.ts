import type { Enrollment, Session, Student } from "../../../lib/planner";

export const buildSelectedStudents = (
  enrollmentIds: string[] | undefined,
  enrollments: Enrollment[],
  tempEnrollments: Enrollment[],
  students: Student[]
): { id: string; name: string }[] => {
  if (!enrollmentIds || enrollmentIds.length === 0) return [];
  const allEnrollments = [...enrollments, ...tempEnrollments];
  return (
    enrollmentIds
      .map((enrollmentId: string) => {
        const enrollment = allEnrollments.find((e) => e.id === enrollmentId);
        if (!enrollment) return null;
        const student = students.find((s) => s.id === enrollment.studentId);
        return student ? { id: student.id, name: student.name } : null;
      })
      .filter(Boolean) as { id: string; name: string }[]
  );
};

export const filterEditableStudents = (
  query: string,
  editModalData: Session | null,
  enrollments: Enrollment[],
  students: Student[]
): { id: string; name: string }[] => {
  if (!editModalData) return [];
  const q = query.toLowerCase();
  return students
    .filter((student) =>
      student.name.toLowerCase().includes(q) &&
      !editModalData.enrollmentIds?.some((enrollmentId) => {
        const enrollment = enrollments.find((e) => e.id === enrollmentId);
        return enrollment?.studentId === student.id;
      })
    )
    .map((s) => ({ id: s.id, name: s.name }));
};

export const removeStudentFromEnrollmentIds = (
  studentId: string,
  currentEnrollmentIds: string[] | undefined,
  enrollments: Enrollment[],
  tempEnrollments: Enrollment[]
): string[] => {
  const allEnrollments = [...enrollments, ...tempEnrollments];
  return (
    currentEnrollmentIds?.filter((id: string) => {
      const enrollment = allEnrollments.find((e) => e.id === id);
      return enrollment?.studentId !== studentId;
    }) || []
  );
};


