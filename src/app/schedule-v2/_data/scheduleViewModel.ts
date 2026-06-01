/**
 * schedule-v2 뷰모델 — 실제 academy 데이터(세션/수강/학생/과목/강사)를
 * 공부방형 두 뷰(그리드 page1 / 학생별 표 page2)로 변환.
 *
 * 원자 단위 = enrollment(학생 1명) → 블록. 한 세션의 여러 학생은 각각 블록으로 펼침
 * (그룹 세션이면 같은 시간, 1인 세션이면 학생별 개별 시간 = 공부방 staggered).
 * 색 = 강사(teacher.color), 없으면 과목색 fallback.
 */

import {
  timeToMinutes,
  weekdays,
  type Enrollment,
  type Session,
  type Student,
  type Subject,
  type Teacher,
} from "@/lib/planner";

export interface RealData {
  sessions: Session[];
  enrollments: Enrollment[];
  students: Student[];
  subjects: Subject[];
  teachers: Teacher[];
}

export interface ViewBlock {
  id: string;
  weekday: number; // 0=월 ~ 6=일
  studentName: string;
  subjectName: string;
  teacherName: string | null;
  color: string; // hex
  start: number; // 분
  end: number;
}

export interface TableRow {
  subject: string;
  color: string;
  times: Record<number, string>; // weekday → "HH:MM-HH:MM"
}
export interface TableStudent {
  id: string;
  name: string;
  weekdays: number[];
  rows: TableRow[];
}

export interface ScheduleVM {
  blocks: ViewBlock[];
  students: TableStudent[];
  weekStartDate: string | null;
  teachers: string[];
}

export function weekdayLabel(wd: number): string {
  return weekdays[wd] ?? "?";
}

/** 표시할 주(weekStartDate) 선택 — 현재 주가 있으면 현재 주, 없으면 가장 최근 주. */
export function pickWeek(sessions: Session[], currentMonday: string): string | null {
  const weeks = Array.from(
    new Set(sessions.map((s) => s.weekStartDate).filter((w): w is string => !!w))
  ).sort();
  if (weeks.length === 0) return null;
  return weeks.includes(currentMonday) ? currentMonday : weeks[weeks.length - 1];
}

/** 로컬 타임존 기준 이번 주 월요일 "YYYY-MM-DD". */
export function localWeekMonday(now: Date): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const mondayOffset = (d.getDay() + 6) % 7; // 0=월
  d.setDate(d.getDate() - mondayOffset);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** 주-필터된 세션들 → 뷰모델. */
export function buildScheduleVM(data: RealData, weekSessions: Session[]): ScheduleVM {
  const subjById = new Map(data.subjects.map((s) => [s.id, s]));
  const stuById = new Map(data.students.map((s) => [s.id, s]));
  const teaById = new Map(data.teachers.map((t) => [t.id, t]));
  const enrById = new Map(data.enrollments.map((e) => [e.id, e]));

  const blocks: ViewBlock[] = [];
  // studentId → { name, subjects: subjectName → { color, times: weekday→str } }
  const acc = new Map<
    string,
    { name: string; subjects: Map<string, { color: string; times: Map<number, string> }> }
  >();

  for (const sess of weekSessions) {
    if (sess.weekday === undefined || sess.weekday === null || !sess.startsAt || !sess.endsAt) continue;
    const teacher = sess.teacherId ? teaById.get(sess.teacherId) : undefined;
    for (const eid of sess.enrollmentIds ?? []) {
      const enr = enrById.get(eid);
      if (!enr) continue;
      const stu = stuById.get(enr.studentId);
      if (!stu) continue;
      const subj = subjById.get(enr.subjectId);
      const subjectName = subj?.name ?? "수업";
      // 색 = 과목 (2026-06-01 사용자 결정 — 그리드/표 모두 과목색). 강사는 메타(필터/팝오버).
      const color = subj?.color ?? teacher?.color ?? "#6b7280";

      blocks.push({
        id: `${sess.id}:${eid}`,
        weekday: sess.weekday,
        studentName: stu.name,
        subjectName,
        teacherName: teacher?.name ?? null,
        color,
        start: timeToMinutes(sess.startsAt),
        end: timeToMinutes(sess.endsAt),
      });

      let row = acc.get(stu.id);
      if (!row) {
        row = { name: stu.name, subjects: new Map() };
        acc.set(stu.id, row);
      }
      let sub = row.subjects.get(subjectName);
      if (!sub) {
        sub = { color, times: new Map() };
        row.subjects.set(subjectName, sub);
      }
      sub.times.set(sess.weekday, `${sess.startsAt}-${sess.endsAt}`);
    }
  }

  const students: TableStudent[] = [];
  for (const [id, row] of acc) {
    const wdSet = new Set<number>();
    const rows: TableRow[] = [];
    for (const [subject, sub] of row.subjects) {
      rows.push({ subject, color: sub.color, times: Object.fromEntries(sub.times) });
      for (const wd of sub.times.keys()) wdSet.add(wd);
    }
    students.push({ id, name: row.name, weekdays: Array.from(wdSet).sort((a, b) => a - b), rows });
  }
  students.sort((a, b) => a.name.localeCompare(b.name, "ko"));

  const teacherNames = Array.from(
    new Set(blocks.map((b) => b.teacherName).filter((n): n is string => !!n))
  );

  return {
    blocks,
    students,
    weekStartDate: weekSessions.find((s) => s.weekStartDate)?.weekStartDate ?? null,
    teachers: teacherNames,
  };
}

export interface PackedBlock extends ViewBlock {
  lane: number;
}

/** 한 요일 블록 레인 패킹(겹치면 다음 레인). */
export function packDay(blocks: ViewBlock[]): { items: PackedBlock[]; lanes: number } {
  const items = blocks
    .map((b) => ({ ...b, lane: 0 }))
    .sort((x, y) => x.start - y.start || x.end - y.end);
  const laneEnds: number[] = [];
  for (const blk of items) {
    let placed = false;
    for (let i = 0; i < laneEnds.length; i++) {
      if (laneEnds[i] <= blk.start) {
        blk.lane = i;
        laneEnds[i] = blk.end;
        placed = true;
        break;
      }
    }
    if (!placed) {
      blk.lane = laneEnds.length;
      laneEnds.push(blk.end);
    }
  }
  return { items, lanes: Math.max(laneEnds.length, 1) };
}

/** 블록 전체로 시간축 [start,end](분, 정시 라운딩). */
export function axisOf(blocks: ViewBlock[]): { start: number; end: number } {
  let min = Infinity;
  let max = -Infinity;
  for (const b of blocks) {
    min = Math.min(min, b.start);
    max = Math.max(max, b.end);
  }
  if (!isFinite(min)) return { start: 13 * 60, end: 18 * 60 };
  return { start: Math.floor(min / 60) * 60, end: Math.ceil(max / 60) * 60 };
}
