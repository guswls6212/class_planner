const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/**
 * KST(UTC+9) 기준으로 주어진 날짜가 속한 주의 월요일 날짜를 "YYYY-MM-DD" 형식으로 반환.
 * 한국 학원 관행: 주 시작 = 월요일.
 */
export function getWeekStartDate(date: Date): string {
  const kstMs = date.getTime() + KST_OFFSET_MS;
  const kst = new Date(kstMs);
  const utcDayOfWeek = kst.getUTCDay(); // 0=일, 1=월, ..., 6=토
  const daysSinceMonday = utcDayOfWeek === 0 ? 6 : utcDayOfWeek - 1;
  const mondayMs = kst.getTime() - daysSinceMonday * 86400000;
  const monday = new Date(mondayMs);
  return monday.toISOString().slice(0, 10);
}

/**
 * "YYYY-MM-DD" 형식의 ISO date 문자열을 받아 그 날짜가 속한 주의 월요일을 반환.
 */
export function parseDateToWeekStart(isoDate: string): string {
  return getWeekStartDate(new Date(`${isoDate}T12:00:00+09:00`));
}
