export type Student = { id: string; name: string; gender?: string };
export type Subject = { id: string; name: string; color?: string };
export type Enrollment = { id: string; studentId: string; subjectId: string };
export type Session = {
  id: string; // 세션 고유 식별자
  enrollmentId: string; // 수강신청 ID (어떤 학생이 어떤 과목을 수강하는지)
  weekday: number; // 요일 (0: 월요일, 1: 화요일, ..., 6: 일요일)
  startsAt: string; // 시작 시간 (HH:MM 형식)
  endsAt: string; // 종료 시간 (HH:MM 형식)
  room?: string; // 강의실 (선택적)
};

export function uid() {
  return crypto.randomUUID();
}

export const weekdays = ['월', '화', '수', '목', '금', '토', '일'];
export const SLOT_MIN = 15;
export const DAY_START_MIN = 9 * 60;
export const DAY_END_MIN = 24 * 60;
export const SLOT_PX = 16;

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
export function minutesToTime(m: number): string {
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}
export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
export function snapToSlot(mins: number): number {
  return Math.floor(mins / SLOT_MIN) * SLOT_MIN;
}

export function sessionsOverlapSameStudent(
  a: {
    enrollmentId: string;
    weekday: number;
    startsAt: string;
    endsAt: string;
  },
  b: {
    enrollmentId: string;
    weekday: number;
    startsAt: string;
    endsAt: string;
  },
  enrolls: Enrollment[]
) {
  if (a.weekday !== b.weekday) return false;
  const aStudent = enrolls.find(e => e.id === a.enrollmentId)?.studentId;
  const bStudent = enrolls.find(e => e.id === b.enrollmentId)?.studentId;
  if (!aStudent || !bStudent || aStudent !== bStudent) return false;
  return a.startsAt < b.endsAt && b.startsAt < a.endsAt;
}

export const store = {
  get<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },
  set<T>(key: string, value: T) {
    localStorage.setItem(key, JSON.stringify(value));
  },
};
