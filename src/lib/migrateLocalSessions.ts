import { getWeekStartDate } from "./weekStart";

export function migrateLocalSessionsIfNeeded<T extends { sessions?: any[] }>(data: T): T {
  if (!data.sessions) return data;
  const currentWeek = getWeekStartDate(new Date());
  return {
    ...data,
    sessions: data.sessions.map((s) =>
      s.weekStartDate ? s : { ...s, weekStartDate: currentWeek }
    ),
  };
}
