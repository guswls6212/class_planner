import type {
  Session,
  Subject,
  Student,
  Teacher,
  Enrollment,
} from "@/lib/planner";
import type { ScheduleTemplate } from "@/shared/types/templateTypes";

export interface BuildApplyTemplateContext {
  subjects: Subject[];
  students: Student[];
  teachers: Teacher[];
  enrollments: Enrollment[];
  weekStartDate: string;
  /** Override for crypto.randomUUID — test 환경에서 결정적 id 주입용. */
  generateId?: () => string;
}

export interface BuildApplyTemplateResult {
  /** 적용할 새 sessions (각자 고유 id, 현재 주 weekStartDate). */
  newSessions: Session[];
  /** 새로 만들어야 할 enrollments (기존 enrollment 재사용 후 부족분만). */
  newEnrollments: Array<{ id: string; studentId: string; subjectId: string }>;
  /** 매칭 실패 항목 — 사용자 토스트에 노출. 중복 가능. */
  missingEntities: string[];
}

/**
 * 템플릿 → (newSessions, newEnrollments, missingEntities) 변환.
 *
 * 도메인 객체 매칭만 담당하는 pure function. localStorage / server / state /
 * reposition 은 관여하지 않음 (호출 측 doApplyTemplate 에서 처리).
 *
 * id 기반 매칭: 템플릿의 subjectId / studentIds / teacherId 가 현재 academy 의
 * subject / student / teacher 와 매칭. 매칭 실패 시 missingEntities 에 사람-읽을
 * 라벨 (`과목 "X"` / `학생 "Y"` / `강사 "Z"`) 추가하고 가능하면 session 진행.
 *
 * 학생이 0명 매칭이면 그 session 자체는 건너뜀 (단독 학생 없는 수업은 무의미).
 * 강사 매칭 실패는 session 진행하되 teacherId 필드 미포함.
 */
export function buildApplyTemplatePayload(
  template: ScheduleTemplate,
  ctx: BuildApplyTemplateContext,
): BuildApplyTemplateResult {
  const {
    subjects,
    students,
    teachers,
    enrollments,
    weekStartDate,
    generateId = () => crypto.randomUUID(),
  } = ctx;

  const newSessions: Session[] = [];
  const newEnrollments: Array<{ id: string; studentId: string; subjectId: string }> = [];
  const missingEntities: string[] = [];

  for (const tplSession of template.templateData.sessions) {
    const subject = subjects.find((s) => s.id === tplSession.subjectId);
    if (!subject) {
      missingEntities.push(
        `과목 "${tplSession.subjectName ?? tplSession.subjectId}"`,
      );
      continue;
    }

    const matchedStudentIds: string[] = [];
    for (const stId of tplSession.studentIds ?? []) {
      const st = students.find((s) => s.id === stId);
      if (st) {
        matchedStudentIds.push(st.id);
      } else {
        const nameIdx = (tplSession.studentIds ?? []).indexOf(stId);
        const name = tplSession.studentNames?.[nameIdx];
        missingEntities.push(`학생 "${name ?? stId}"`);
      }
    }
    if (matchedStudentIds.length === 0) continue;

    let matchedTeacherId: string | undefined;
    if (tplSession.teacherId) {
      const t = teachers.find((tc) => tc.id === tplSession.teacherId);
      if (t) {
        matchedTeacherId = t.id;
      } else {
        missingEntities.push(
          `강사 "${tplSession.teacherName ?? tplSession.teacherId}"`,
        );
      }
    }

    // enrollment 보장 — 기존 enrollment 우선, 없으면 신규
    const enrollmentIds: string[] = [];
    for (const studentId of matchedStudentIds) {
      const existing = enrollments.find(
        (e) => e.studentId === studentId && e.subjectId === subject.id,
      );
      if (existing) {
        enrollmentIds.push(existing.id);
      } else {
        const ne = {
          id: generateId(),
          studentId,
          subjectId: subject.id,
        };
        newEnrollments.push(ne);
        enrollmentIds.push(ne.id);
      }
    }

    newSessions.push({
      id: generateId(),
      subjectId: subject.id,
      ...(matchedTeacherId && { teacherId: matchedTeacherId }),
      weekday: tplSession.weekday,
      startsAt: tplSession.startsAt,
      endsAt: tplSession.endsAt,
      weekStartDate,
      room: tplSession.room ?? "",
      enrollmentIds,
      yPosition: tplSession.yPosition ?? 1,
    } as Session);
  }

  return { newSessions, newEnrollments, missingEntities };
}
