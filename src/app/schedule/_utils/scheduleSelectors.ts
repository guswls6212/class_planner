import type { Enrollment, Session, Student } from "../../../lib/planner";

export interface SelectedStudentOption {
  id: string;
  name: string;
  gender?: string | null;
  birthDate?: string | null;
  grade?: string | null;
  school?: string | null;
}

export const buildSelectedStudents = (
  enrollmentIds: string[] | undefined,
  enrollments: Enrollment[],
  tempEnrollments: Enrollment[],
  students: Student[]
): SelectedStudentOption[] => {
  if (!enrollmentIds || enrollmentIds.length === 0) return [];
  const allEnrollments = [...enrollments, ...tempEnrollments];
  return (
    enrollmentIds
      .map((enrollmentId: string) => {
        const enrollment = allEnrollments.find((e) => e.id === enrollmentId);
        if (!enrollment) return null;
        const student = students.find((s) => s.id === enrollment.studentId);
        return student
          ? {
              id: student.id,
              name: student.name,
              gender: student.gender ?? null,
              birthDate: student.birthDate ?? null,
              grade: student.grade ?? null,
              school: student.school ?? null,
            }
          : null;
      })
      .filter(Boolean) as SelectedStudentOption[]
  );
};

export interface EditableStudentOption {
  id: string;
  name: string;
  gender?: string | null;
  birthDate?: string | null;
  grade?: string | null;
  school?: string | null;
}

export const filterEditableStudents = (
  query: string,
  editModalData: Session | null,
  enrollments: Enrollment[],
  tempEnrollments: Enrollment[],
  students: Student[]
): EditableStudentOption[] => {
  if (!editModalData) return [];
  const q = query.toLowerCase();
  const allEnrollments = [...enrollments, ...tempEnrollments];
  return students
    .filter((student) =>
      student.name.toLowerCase().includes(q) &&
      !editModalData.enrollmentIds?.some((enrollmentId) => {
        const enrollment = allEnrollments.find((e) => e.id === enrollmentId);
        return enrollment?.studentId === student.id;
      })
    )
    .map((s) => ({
      id: s.id,
      name: s.name,
      gender: s.gender ?? null,
      birthDate: s.birthDate ?? null,
      grade: s.grade ?? null,
      school: s.school ?? null,
    }));
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


