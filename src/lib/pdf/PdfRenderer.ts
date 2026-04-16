import jsPDF from "jspdf";
import {
  calculateGridDimensions,
  getCellPosition,
  drawGridLines,
} from "./PdfGridLayout";
import { drawHeader, drawFooter } from "./PdfHeader";
import { drawSessionBlock } from "./PdfSessionBlock";
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
}

const WEEKDAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];
const START_HOUR = 9;
const END_HOUR = 23;

function getCurrentWeekRange(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday
  const mon = new Date(now);
  mon.setDate(now.getDate() + diff);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
  return `${fmt(mon)} – ${fmt(sun)}`;
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

export function renderSchedulePdf(
  sessions: Session[],
  subjects: Subject[],
  students: Student[],
  enrollments: Enrollment[],
  _teachers: Teacher[],
  options: PdfRenderOptions = {}
): void {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  // Determine which weekdays are used — use max index+1 so columns cover all used days
  const usedWeekdays = new Set(sessions.map((s) => s.weekday));
  const maxWeekday = usedWeekdays.size > 0 ? Math.max(...usedWeekdays) : 4;
  const weekdayCount = Math.max(5, maxWeekday + 1); // min 5 (Mon-Fri)
  const dims = calculateGridDimensions(weekdayCount, START_HOUR, END_HOUR);
  const weekdayLabels = WEEKDAY_LABELS.slice(0, weekdayCount);

  drawHeader(doc, dims, {
    academyName: options.academyName ?? "CLASS PLANNER",
    dateRange: getCurrentWeekRange(),
    printDate: new Date().toISOString().slice(0, 10),
  });

  drawGridLines(doc, dims, weekdayLabels, START_HOUR, END_HOUR);

  // Filter sessions
  let targetSessions = sessions;
  if (options.filterStudentId) {
    const studentEnrollmentIds = new Set(
      enrollments
        .filter((e) => e.studentId === options.filterStudentId)
        .map((e) => e.id)
    );
    targetSessions = sessions.filter((s) =>
      s.enrollmentIds?.some((eid) => studentEnrollmentIds.has(eid))
    );
  }

  for (const session of targetSessions) {
    // Guard against malformed time strings
    if (!session.startsAt || !session.endsAt) continue;
    // Skip sessions outside grid range
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

  const filename =
    options.filename ?? `${options.academyName ?? "시간표"}_전체시간표.pdf`;
  doc.save(filename);
}
