function toLocalMidnight(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function formatLocalISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * weekStart (YYYY-MM-DD, 월요일) + weekday(0=월 … 6=일) → 그 occurrence 의 날짜 (YYYY-MM-DD).
 *
 * 순수 calendar 산술 — YYYY-MM-DD 문자열을 local 달력 날짜로 파싱 후 +weekday 일.
 * `new Date(y, m-1, d)` (local 자정) + setDate + formatLocalISO 는 round-trip 이라 timezone
 * 무관하게 입력 달력값 + N일을 돌려준다 (KST instant 앵커 + local getter 의 category 오류 회피).
 * teacher-schedule(출결 모달)·/attendance(주별) 가 같은 date key 를 쓰도록 공유.
 */
export function instanceDateFromWeekStart(
  weekStartISO: string,
  weekday: number
): string {
  const [y, m, d] = weekStartISO.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  date.setDate(date.getDate() + weekday);
  return formatLocalISO(date);
}

export function getWeekStart(date: Date): Date {
  const d = toLocalMidnight(date);
  const dow = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + mondayOffset);
  return d;
}

export function addWeeks(date: Date, weeks: number): Date {
  const d = toLocalMidnight(date);
  d.setDate(d.getDate() + weeks * 7);
  return d;
}

export function eachWeekStart(start: Date, end: Date): Date[] {
  const startMon = getWeekStart(start);
  const endMon = getWeekStart(end);
  const result: Date[] = [];
  let cursor = new Date(startMon);
  while (cursor.getTime() <= endMon.getTime()) {
    result.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 7);
  }
  return result;
}

export function formatWeekRangeLabel(weekStart: Date): string {
  const start = toLocalMidnight(weekStart);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return `${start.getMonth() + 1}/${start.getDate()} – ${end.getMonth() + 1}/${end.getDate()}`;
}

export function getMonthWeekRange(
  year: number,
  month1to12: number
): { start: Date; end: Date } {
  const firstDay = new Date(year, month1to12 - 1, 1);
  const lastDay = new Date(year, month1to12, 0);
  return { start: getWeekStart(firstDay), end: lastDay };
}
