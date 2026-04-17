function toLocalMidnight(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function formatLocalISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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
