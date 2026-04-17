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
  weekRange?: { startDate: string; endDate: string };
}

const WEEKDAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];
const START_HOUR = 9;
const END_HOUR = 23;

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

function drawWeekPage(
  doc: jsPDF,
  weekStart: Date,
  sessions: Session[],
  subjects: Subject[],
  students: Student[],
  enrollments: Enrollment[],
  options: PdfRenderOptions
): void {
  const usedWeekdays = new Set(sessions.map((s) => s.weekday));
  const maxWeekday = usedWeekdays.size > 0 ? Math.max(...usedWeekdays) : 4;
  const weekdayCount = Math.max(5, maxWeekday + 1);
  const dims = calculateGridDimensions(weekdayCount, START_HOUR, END_HOUR);
  const weekdayLabels = WEEKDAY_LABELS.slice(0, weekdayCount);

  drawHeader(doc, dims, {
    academyName: options.academyName ?? "CLASS PLANNER",
    dateRange: formatWeekRangeLabel(weekStart),
    printDate: new Date().toISOString().slice(0, 10),
  });

  drawGridLines(doc, dims, weekdayLabels, START_HOUR, END_HOUR);

  const targetSessions = filterSessions(sessions, enrollments, options.filterStudentId);

  for (const session of targetSessions) {
    if (!session.startsAt || !session.endsAt) continue;
    const [sh] = session.startsAt.split(":").map(Number);
    if (sh < START_HOUR || sh >= END_HOUR) continue;

    const cell = getCellPosition(
      dims,
      session.weekday,
      session.startsAt,
      session.endsAt,
      START_HOUR
    );
    const enrollment = enrollments.find((e) =>
      session.enrollmentIds?.includes(e.id)
    );
    const subject = enrollment
      ? subjects.find((s) => s.id === enrollment.subjectId)
      : undefined;
    const studentNames = getStudentNames(session, enrollments, students);

    drawSessionBlock(doc, cell, {
      subjectName: subject?.name ?? "",
      studentNames,
      color: subject?.color ?? "#3b82f6",
      startsAt: session.startsAt,
      endsAt: session.endsAt,
    });
  }

  drawFooter(doc, dims);
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
  _teachers: Teacher[],
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
    drawWeekPage(doc, weekStart, sessions, subjects, students, enrollments, options);
  });

  doc.save(buildFilename(options));
}
