import jsPDF from "jspdf";
import {
  calculateGridDimensions,
  getCellPosition,
  drawGridLines,
} from "./PdfGridLayout";
import { drawHeader, drawFooter } from "./PdfHeader";
import { drawSessionBlock } from "./PdfSessionBlock";
import { PRETENDARD_REGULAR_BASE64 } from "./fonts/pretendard-regular";
import { PRETENDARD_BOLD_BASE64 } from "./fonts/pretendard-bold";
import { eachWeekStart, formatWeekRangeLabel, getWeekStart } from "@/lib/dateUtils";
import { computeRequiredLanes } from "@/lib/sessionCollisionUtils";
import type {
  Session,
  Subject,
  Student,
  Enrollment,
  Teacher,
} from "@/lib/planner";

export interface PdfRenderOptions {
  academyName?: string;
  filterStudentId?: string;
  filename?: string;
  title?: string;
  weekRange?: { startDate: string; endDate: string };
  /** 표시할 요일 인덱스 배열 (0=월, 6=일). 미설정 시 7일 전체 표시. */
  operatingDays?: number[];
  /** 강사별 분할 여부 — 푸터 메타 표기용 */
  perTeacher?: boolean;
}

const WEEKDAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];
const START_HOUR = 9;
const END_HOUR = 23;

function toMin(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/**
 * 요일별 세션에 lane 번호를 자동 할당한다 (greedy interval graph coloring).
 * yPosition을 완전히 무시하고 시작 시각 순으로 정렬한 뒤 비어있는 lane을 재사용.
 * - totalLanes = computeRequiredLanes 결과와 항상 일치
 * - yPosition 오염(삭제된 세션 흔적, 드래그 잔상)에 면역
 */
function assignLanesForDay(sessions: Session[]): Map<string, number> {
  const sorted = [...sessions].sort((a, b) => toMin(a.startsAt) - toMin(b.startsAt));
  const laneEndTimes: number[] = [];
  const result = new Map<string, number>();

  for (const s of sorted) {
    const start = toMin(s.startsAt);
    const end = toMin(s.endsAt);
    const available = laneEndTimes.findIndex((t) => t <= start);
    const lane = available === -1 ? laneEndTimes.length : available;
    laneEndTimes[lane] = end;
    result.set(s.id, lane);
  }

  return result;
}

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [100, 100, 100];
}

function getStudentNames(
  session: Session,
  enrollments: Enrollment[],
  students: Student[]
): string[] {
  if (!session.enrollmentIds || session.enrollmentIds.length === 0) return [];
  return session.enrollmentIds.flatMap((eid) => {
    const enrollment = enrollments.find((e) => e.id === eid);
    if (!enrollment) return [];
    const student = students.find((s) => s.id === enrollment.studentId);
    return student ? [student.name] : [];
  });
}

function registerPretendardFont(doc: jsPDF): void {
  doc.addFileToVFS("Pretendard-Regular.ttf", PRETENDARD_REGULAR_BASE64);
  doc.addFont("Pretendard-Regular.ttf", "Pretendard", "normal");
  doc.addFileToVFS("Pretendard-Bold.ttf", PRETENDARD_BOLD_BASE64);
  doc.addFont("Pretendard-Bold.ttf", "Pretendard", "bold");
  doc.setFont("Pretendard", "normal");
}

function filterSessions(
  sessions: Session[],
  enrollments: Enrollment[],
  filterStudentId?: string
): Session[] {
  if (!filterStudentId) return sessions;
  const studentEnrollmentIds = new Set(
    enrollments
      .filter((e) => e.studentId === filterStudentId)
      .map((e) => e.id)
  );
  return sessions.filter((s) =>
    s.enrollmentIds?.some((eid) => studentEnrollmentIds.has(eid))
  );
}

function drawTeacherLegend(
  doc: jsPDF,
  dims: ReturnType<typeof calculateGridDimensions>,
  sessions: Session[],
  teachers: Teacher[]
): void {
  const assignedTeachers = teachers.filter((t) =>
    sessions.some((s) => s.teacherId === t.id)
  );
  if (assignedTeachers.length === 0) return;

  const legendY = dims.pageHeight - dims.margin.bottom + 3;
  let legendX = dims.margin.left;
  doc.setFont("Pretendard", "normal");
  doc.setFontSize(6.5);

  assignedTeachers.forEach((teacher) => {
    const [r, g, b] = hexToRgb(teacher.color);
    doc.setFillColor(r, g, b);
    doc.circle(legendX + 1.5, legendY - 1, 1.5, "F");
    doc.setTextColor(60, 60, 60);
    const label = teacher.name;
    doc.text(label, legendX + 4.5, legendY);
    const textWidth = doc.getTextWidth(label);
    legendX += textWidth + 10;
  });
}

function drawWeekPage(
  doc: jsPDF,
  weekStart: Date,
  sessions: Session[],
  subjects: Subject[],
  students: Student[],
  enrollments: Enrollment[],
  teachers: Teacher[],
  options: PdfRenderOptions
): void {
  const operatingDays = options.operatingDays ?? [0, 1, 2, 3, 4, 5, 6];
  const weekdayCount = operatingDays.length;
  const dims = calculateGridDimensions(weekdayCount, START_HOUR, END_HOUR);
  const weekdayLabels = operatingDays.map((d) => WEEKDAY_LABELS[d]);

  drawHeader(doc, dims, {
    academyName: options.title ?? options.academyName ?? "CLASS PLANNER",
    dateRange: formatWeekRangeLabel(weekStart),
    printDate: new Date().toISOString().slice(0, 10),
  });

  drawGridLines(doc, dims, weekdayLabels, START_HOUR, END_HOUR);

  const targetSessions = filterSessions(sessions, enrollments, options.filterStudentId);

  // 요일별 lane 수 + 세션별 lane 번호 사전 계산
  // yPosition에 의존하지 않는 greedy 자동 할당으로 overflow 버그 방지
  const lanesByWeekday = new Map<number, number>();
  const laneMapByWeekday = new Map<number, Map<string, number>>();
  for (const wd of operatingDays) {
    const daySessions = targetSessions.filter((s) => s.weekday === wd);
    const laneMap = assignLanesForDay(daySessions);
    laneMapByWeekday.set(wd, laneMap);
    lanesByWeekday.set(wd, computeRequiredLanes(daySessions));
  }

  for (const session of targetSessions) {
    if (!session.startsAt || !session.endsAt) continue;
    const [sh] = session.startsAt.split(":").map(Number);
    if (sh < START_HOUR || sh >= END_HOUR) continue;

    const colIndex = operatingDays.indexOf(session.weekday);
    if (colIndex === -1) continue;

    const totalLanes = lanesByWeekday.get(session.weekday) ?? 1;
    const laneIndex = laneMapByWeekday.get(session.weekday)?.get(session.id) ?? 0;

    const cell = getCellPosition(
      dims,
      colIndex,
      session.startsAt,
      session.endsAt,
      START_HOUR,
      laneIndex,
      totalLanes
    );
    const enrollment = enrollments.find((e) =>
      session.enrollmentIds?.includes(e.id)
    );
    const subject = enrollment
      ? subjects.find((s) => s.id === enrollment.subjectId)
      : undefined;
    const studentNames = getStudentNames(session, enrollments, students);
    const teacher = teachers.find((t) => t.id === session.teacherId);
    const isFilterMode = !!options.filterStudentId;

    drawSessionBlock(doc, cell, {
      subjectName: subject?.name ?? "",
      studentNames: isFilterMode ? [] : studentNames,
      color: subject?.color ?? "#3b82f6",
      startsAt: session.startsAt,
      endsAt: session.endsAt,
      teacherName: teacher?.name,
      teacherColor: isFilterMode ? teacher?.color : undefined,
    });
  }

  if (!options.filterStudentId) {
    drawTeacherLegend(doc, dims, targetSessions, teachers);
  }

  const maxLanes = Math.max(1, ...operatingDays.map((wd) => lanesByWeekday.get(wd) ?? 1));
  const splitLabel = options.perTeacher ? "강사별" : "전체";
  drawFooter(doc, dims, {
    meta: `출력 범위 ${START_HOUR}:00~${END_HOUR}:00 · 분할: ${splitLabel} · 동시간 최대 ${maxLanes}건`,
  });
}

function buildFilename(opts: PdfRenderOptions): string {
  if (opts.filename) return opts.filename;
  const academy = opts.academyName ?? "시간표";
  if (opts.weekRange) {
    return `${academy}_${opts.weekRange.startDate}_${opts.weekRange.endDate}.pdf`;
  }
  return `${academy}_전체시간표.pdf`;
}

export function renderSchedulePdf(
  sessions: Session[],
  subjects: Subject[],
  students: Student[],
  enrollments: Enrollment[],
  teachers: Teacher[],
  options: PdfRenderOptions = {}
): void {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  registerPretendardFont(doc);

  const weekStarts = options.weekRange
    ? eachWeekStart(
        new Date(options.weekRange.startDate),
        new Date(options.weekRange.endDate)
      )
    : [getWeekStart(new Date())];

  weekStarts.forEach((weekStart, idx) => {
    if (idx > 0) doc.addPage();
    drawWeekPage(doc, weekStart, sessions, subjects, students, enrollments, teachers, options);
  });

  doc.save(buildFilename(options));
}
