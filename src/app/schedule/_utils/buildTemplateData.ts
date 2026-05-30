import type {
  Session,
  Teacher,
  Subject,
  Enrollment,
  Student,
} from "@/lib/planner";
import type { TemplateData } from "@/shared/types/templateTypes";

export interface BuildTemplateDataArgs {
  sessions: Session[];
  teachers: Teacher[];
  subjects: Subject[];
  enrollments: Enrollment[];
  students: Student[];
}

export function buildTemplateDataPure({
  sessions,
  teachers,
  subjects,
  enrollments,
  students,
}: BuildTemplateDataArgs): TemplateData {
  return {
    version: "1.0",
    sessions: sessions.map((session) => {
      const firstEnrollment = enrollments.find((e) =>
        (session.enrollmentIds ?? []).includes(e.id)
      );
      const subject = subjects.find((s) => s.id === firstEnrollment?.subjectId);

      const sessionStudentNames = (session.enrollmentIds ?? [])
        .map((eid) => {
          const enrollment = enrollments.find((e) => e.id === eid);
          if (!enrollment) return null;
          return students.find((st) => st.id === enrollment.studentId)?.name ?? null;
        })
        .filter((n): n is string => n !== null);

      const sessionStudentIds = (session.enrollmentIds ?? [])
        .map((eid) => {
          const enrollment = enrollments.find((e) => e.id === eid);
          if (!enrollment) return null;
          return students.find((st) => st.id === enrollment.studentId)?.id ?? null;
        })
        .filter((id): id is string => id !== null);

      const teacher = session.teacherId
        ? teachers.find((t) => t.id === session.teacherId)
        : undefined;

      return {
        weekday: session.weekday,
        startsAt: session.startsAt,
        endsAt: session.endsAt,
        subjectId: subject?.id ?? "",
        subjectName: subject?.name ?? "미지정",
        subjectColor: subject?.color ?? "#6366f1",
        studentIds: sessionStudentIds,
        studentNames: sessionStudentNames,
        ...(teacher && { teacherId: teacher.id, teacherName: teacher.name }),
        ...(session.room && { room: session.room }),
        ...(session.yPosition !== undefined && { yPosition: session.yPosition }),
      };
    }),
  };
}
