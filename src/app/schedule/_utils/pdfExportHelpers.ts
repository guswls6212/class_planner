/**
 * handlePdfExport 의 logic 만 pure function 으로 추출.
 *
 * 기존: schedule/page.tsx 의 handlePdfExport (140+ 줄) 가 화면 필터 적용 + auto time
 * range 계산 + perStudent/perTeacher/default 분기 + renderSchedulePdf 호출 + 토스트
 * /다이얼로그 close 모두 inline.
 *
 * 본 utils: **state mutation / 외부 호출 안 함**. 필터된 sessions + 분기별 plan
 * 배열 (sessions + PdfRenderOptions) 만 반환. renderSchedulePdf 호출은 page 가
 * iteration. setIsDownloading / closePdfDialog 도 page 안 유지.
 *
 * 분기:
 *   - perStudent: 선택 학생 (또는 전체) 별로 1 plan
 *   - perTeacher: 선택 강사 (또는 전체) 별로 1 plan
 *   - default: 1 plan (selectedStudent/Teacher 첫번째로 title 결정)
 *
 * Sub-proposal: schedule-page-split-refactor PR 7 (loop iteration 2, utils 패턴 확장).
 */

import type {
  Session,
  Enrollment,
  Student,
  Teacher,
} from "@/lib/planner";
import type { PdfExportRange } from "@/components/molecules/PdfExportRangeModal";
import type { PdfRenderOptions } from "@/lib/pdf/PdfRenderer";
import { sessionMatchesFilters } from "@/components/molecules/SessionBlock.utils";

/** ADR-021 D2: data-tight + 1h padding. */
const PDF_PADDING_HOURS = 1;

const ACADEMY_NAME = "CLASS PLANNER";

/** "HH:MM" → 분 */
function timeToMin(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/**
 * scoped sessions 기준으로 PDF startHour/endHour 자동 계산.
 * sessions empty 시 user fallback (안전망).
 */
export function computePdfAutoRange(
  scopedSessions: Session[],
  userTimeRange: { startHour: number; endHour: number },
): { startHour: number; endHour: number } {
  if (!scopedSessions.length) {
    return {
      startHour: userTimeRange.startHour,
      endHour: userTimeRange.endHour + 1,
    };
  }
  const minMin = Math.min(
    ...scopedSessions.map((s) => timeToMin(s.startsAt)),
  );
  const maxMin = Math.max(...scopedSessions.map((s) => timeToMin(s.endsAt)));
  return {
    startHour: Math.max(0, Math.floor(minMin / 60) - PDF_PADDING_HOURS),
    endHour: Math.min(24, Math.ceil(maxMin / 60) + PDF_PADDING_HOURS),
  };
}

/**
 * 화면 필터 적용 + applyFilter 결정 → 최종 PDF 대상 sessions.
 * ADR-020 보강 (UAT 2026-05-21): 화면 필터 chip 활성 시 인쇄 sessions 도 사전 필터.
 * PR #432: range.applyFilter === false 시 (모달의 "전체 수업" 선택) 필터 무시.
 */
export function filterPdfSessions(params: {
  allSessionsRaw: Session[];
  enrollments: Enrollment[];
  selectedStudentIds: string[];
  selectedSubjectIds: string[];
  selectedTeacherIds: string[];
  applyFilter: boolean;
}): Session[] {
  const isAnyFilter =
    params.selectedStudentIds.length > 0 ||
    params.selectedSubjectIds.length > 0 ||
    params.selectedTeacherIds.length > 0;
  if (!isAnyFilter || !params.applyFilter) {
    return params.allSessionsRaw;
  }
  return params.allSessionsRaw.filter((s) =>
    sessionMatchesFilters(
      s,
      params.enrollments,
      params.selectedStudentIds,
      params.selectedSubjectIds,
      params.selectedTeacherIds,
    ),
  );
}

export interface PdfRenderPlan {
  sessions: Session[];
  options: PdfRenderOptions;
}

/**
 * handlePdfExport 의 핵심 — range 와 active filter 로부터 분기 + plan 배열 생성.
 *
 * @returns plans 배열. 각 plan = { sessions, options }. page 가 iterate 하면서
 * renderSchedulePdf(sessions, subjects, students, enrollments, teachers, options) 호출.
 */
export function planPdfExport(params: {
  range: PdfExportRange;
  allSessionsRaw: Session[];
  enrollments: Enrollment[];
  students: Student[];
  teachers: Teacher[];
  selectedStudentIds: string[];
  selectedSubjectIds: string[];
  selectedTeacherIds: string[];
  userTimeRange: { startHour: number; endHour: number };
}): PdfRenderPlan[] {
  const applyFilter = params.range.applyFilter !== false;
  const allSessions = filterPdfSessions({
    allSessionsRaw: params.allSessionsRaw,
    enrollments: params.enrollments,
    selectedStudentIds: params.selectedStudentIds,
    selectedSubjectIds: params.selectedSubjectIds,
    selectedTeacherIds: params.selectedTeacherIds,
    applyFilter,
  });

  if (params.range.perStudent) {
    return planPerStudentExport({
      range: params.range,
      allSessions,
      enrollments: params.enrollments,
      students: params.students,
      userTimeRange: params.userTimeRange,
    });
  }

  if (params.range.perTeacher) {
    return planPerTeacherExport({
      range: params.range,
      allSessions,
      teachers: params.teachers,
      userTimeRange: params.userTimeRange,
    });
  }

  return planDefaultExport({
    range: params.range,
    allSessions,
    students: params.students,
    teachers: params.teachers,
    selectedStudentIds: params.selectedStudentIds,
    selectedTeacherIds: params.selectedTeacherIds,
    userTimeRange: params.userTimeRange,
  });
}

function planPerStudentExport(params: {
  range: PdfExportRange;
  allSessions: Session[];
  enrollments: Enrollment[];
  students: Student[];
  userTimeRange: { startHour: number; endHour: number };
}): PdfRenderPlan[] {
  const studentsToExport = params.range.selectedStudentIds?.length
    ? params.students.filter((s) =>
        params.range.selectedStudentIds!.includes(s.id),
      )
    : params.students;

  const plans: PdfRenderPlan[] = [];
  for (const student of studentsToExport) {
    const studentEnrollmentIds = new Set(
      params.enrollments
        .filter((e) => e.studentId === student.id)
        .map((e) => e.id),
    );
    const studentSessions = params.allSessions.filter((s) =>
      s.enrollmentIds?.some((eid) => studentEnrollmentIds.has(eid)),
    );
    if (studentSessions.length === 0) continue;
    const { startHour, endHour } = computePdfAutoRange(
      studentSessions,
      params.userTimeRange,
    );
    plans.push({
      sessions: studentSessions,
      options: {
        academyName: ACADEMY_NAME,
        title: `${student.name} 학생 시간표`,
        filename: `${student.name}_시간표_${params.range.startDate}.pdf`,
        weekRange: {
          startDate: params.range.startDate,
          endDate: params.range.endDate,
        },
        filterStudentId: student.id,
        perStudent: true,
        startHour,
        endHour,
      },
    });
  }
  return plans;
}

function planPerTeacherExport(params: {
  range: PdfExportRange;
  allSessions: Session[];
  teachers: Teacher[];
  userTimeRange: { startHour: number; endHour: number };
}): PdfRenderPlan[] {
  const teachersToExport = params.range.selectedTeacherIds?.length
    ? params.teachers.filter((t) =>
        params.range.selectedTeacherIds!.includes(t.id),
      )
    : params.teachers;

  const plans: PdfRenderPlan[] = [];
  for (const teacher of teachersToExport) {
    const teacherSessions = params.allSessions.filter(
      (s) => s.teacherId === teacher.id,
    );
    if (teacherSessions.length === 0) continue;
    const { startHour, endHour } = computePdfAutoRange(
      teacherSessions,
      params.userTimeRange,
    );
    plans.push({
      sessions: teacherSessions,
      options: {
        academyName: ACADEMY_NAME,
        title: `${teacher.name} 선생님 시간표`,
        filename: `${teacher.name}_시간표_${params.range.startDate}.pdf`,
        weekRange: {
          startDate: params.range.startDate,
          endDate: params.range.endDate,
        },
        filterTeacherId: teacher.id,
        showStudentNames: params.range.showStudentNames ?? false,
        startHour,
        endHour,
      },
    });
  }
  return plans;
}

function planDefaultExport(params: {
  range: PdfExportRange;
  allSessions: Session[];
  students: Student[];
  teachers: Teacher[];
  selectedStudentIds: string[];
  selectedTeacherIds: string[];
  userTimeRange: { startHour: number; endHour: number };
}): PdfRenderPlan[] {
  // 활성 필터 첫번째 항목으로 title 결정.
  let pdfTitle: string | undefined;
  if (params.selectedStudentIds.length > 0) {
    const student = params.students.find(
      (s) => s.id === params.selectedStudentIds[0],
    );
    if (student) pdfTitle = `${student.name} 학생 시간표`;
  } else if (params.selectedTeacherIds.length > 0) {
    const teacher = params.teachers.find(
      (t) => t.id === params.selectedTeacherIds[0],
    );
    if (teacher) pdfTitle = `${teacher.name} 선생님 시간표`;
  }

  const { startHour, endHour } = computePdfAutoRange(
    params.allSessions,
    params.userTimeRange,
  );

  return [
    {
      sessions: params.allSessions,
      options: {
        academyName: ACADEMY_NAME,
        title: pdfTitle,
        filterStudentId: params.selectedStudentIds[0] ?? undefined,
        weekRange: params.range,
        startHour,
        endHour,
      },
    },
  ];
}
