/**
 * 필터 옵션 cascading (ADR-020 보강, UAT 2026-05-21).
 *
 * 현재 selected (학생/과목/강사) 의 AND 매칭 session 에 등장하는 entity 만 visible.
 * 활성/비활성 type 무관 — selected 자기 자신은 자기 type 매칭 set 에 항상 포함 (chip 해제 가능 보장).
 *
 * 매칭 정의는 `sessionMatchesFilters` 와 일치 (AND 결합).
 */
import type { Session } from "../../../lib/planner";
import { sessionMatchesFilters } from "../../../components/molecules/SessionBlock.utils";

interface FilterEntity {
  id: string;
}

interface FilterEnrollment {
  id: string;
  studentId: string;
  subjectId: string;
}

export interface CascadeFilterInput<S extends FilterEntity, J extends FilterEntity, T extends FilterEntity> {
  students: S[];
  subjects: J[];
  teachers: T[];
  sessions: Session[];
  enrollments: FilterEnrollment[];
  selectedStudentIds: string[];
  selectedSubjectIds: string[];
  selectedTeacherIds: string[];
}

export interface CascadeFilterOutput<S, J, T> {
  students: S[];
  subjects: J[];
  teachers: T[];
}

export function cascadeFilterOptions<
  S extends FilterEntity,
  J extends FilterEntity,
  T extends FilterEntity,
>(input: CascadeFilterInput<S, J, T>): CascadeFilterOutput<S, J, T> {
  const {
    students,
    subjects,
    teachers,
    sessions,
    enrollments,
    selectedStudentIds,
    selectedSubjectIds,
    selectedTeacherIds,
  } = input;

  const anyActive =
    selectedStudentIds.length > 0 ||
    selectedSubjectIds.length > 0 ||
    selectedTeacherIds.length > 0;
  if (!anyActive) {
    return { students, subjects, teachers };
  }

  const matching = sessions.filter((s) =>
    sessionMatchesFilters(
      s,
      enrollments,
      selectedStudentIds,
      selectedSubjectIds,
      selectedTeacherIds,
    ),
  );
  const enrollmentById = new Map(enrollments.map((e) => [e.id, e]));
  const visibleStudents = new Set<string>(selectedStudentIds);
  const visibleSubjects = new Set<string>(selectedSubjectIds);
  const visibleTeachers = new Set<string>(selectedTeacherIds);
  for (const sess of matching) {
    for (const eid of sess.enrollmentIds ?? []) {
      const e = enrollmentById.get(eid);
      if (e) {
        visibleStudents.add(e.studentId);
        visibleSubjects.add(e.subjectId);
      }
    }
    if (sess.teacherId) visibleTeachers.add(sess.teacherId);
  }
  return {
    students: students.filter((s) => visibleStudents.has(s.id)),
    subjects: subjects.filter((s) => visibleSubjects.has(s.id)),
    teachers: teachers.filter((t) => visibleTeachers.has(t.id)),
  };
}
