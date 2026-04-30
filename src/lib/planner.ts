import { logger } from "./logger";

export type Student = {
  id: string;
  name: string;
  gender?: string;
  birthDate?: string;
  grade?: string;
  school?: string;
  phone?: string;
};

export type Teacher = {
  id: string;
  name: string;
  color: string;
  userId?: string | null;
};

export type Subject = {
  id: string;
  name: string;
  color?: string;
};

// 🆕 그룹 수업을 위한 새로운 타입 정의
export type Enrollment = {
  id: string;
  studentId: string;
  subjectId: string;
};

export type Session = {
  id: string; // 세션 고유 식별자
  enrollmentIds?: string[]; // 여러 수강신청 ID (그룹 수업 지원)
  weekday: number; // 요일 (0: 월요일, 1: 화요일, ..., 6: 일요일)
  startsAt: string; // 시작 시간 (HH:MM 형식)
  endsAt: string; // 종료 시간 (HH:MM 형식)
  weekStartDate: string; // 주 월요일 ISO date "YYYY-MM-DD" (KST 기준)
  room?: string; // 강의실 (선택적)
  yPosition?: number; // 사용자 정의 Y축 위치 (논리적 위치: 1, 2, 3...)
  teacherId?: string; // 담당 강사 ID (선택적)
};

// 🆕 그룹 수업 판단을 위한 헬퍼 타입
export type SessionCandidate = {
  studentId: string;
  subjectId: string;
  weekday: number;
  startsAt: string;
  endsAt: string;
  room?: string;
};

export function uid() {
  return crypto.randomUUID();
}

export const weekdays = ["월", "화", "수", "목", "금", "토", "일"];
export const SLOT_MIN = 15;
export const DAY_START_MIN = 9 * 60;
export const DAY_END_MIN = 24 * 60;
export const SLOT_PX = 16;

export function timeToMinutes(t: string): number {
  if (!t || typeof t !== "string") {
    logger.warn("Invalid time format", { time: t });
    return 0;
  }
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(m: number): string {
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function snapToSlot(mins: number): number {
  return Math.floor(mins / SLOT_MIN) * SLOT_MIN;
}

// 🆕 그룹 수업 판단 함수
export function canFormGroupSession(
  candidate: SessionCandidate,
  existingSessions: Session[],
  enrollments: Enrollment[]
): { canForm: boolean; existingSessionId?: string } {
  // 같은 요일, 시간대, 과목인 기존 세션이 있는지 확인
  const matchingSession = existingSessions.find(
    (session) =>
      session.weekday === candidate.weekday &&
      session.startsAt === candidate.startsAt &&
      session.endsAt === candidate.endsAt &&
      // 과목이 같은지 확인 (enrollmentIds를 통해)
      (session.enrollmentIds || []).some((enrollmentId) => {
        const enrollment = enrollments.find((e) => e.id === enrollmentId);
        return enrollment?.subjectId === candidate.subjectId;
      })
  );

  if (matchingSession) {
    return { canForm: true, existingSessionId: matchingSession.id };
  }

  return { canForm: false };
}

// 🆕 그룹 수업으로 병합하는 함수
export function mergeIntoGroupSession(
  candidate: SessionCandidate,
  existingSession: Session,
  enrollments: Enrollment[]
): Session {
  // 기존 세션에 새로운 학생의 enrollment 추가
  const newEnrollment = enrollments.find(
    (e) =>
      e.studentId === candidate.studentId && e.subjectId === candidate.subjectId
  );

  if (!newEnrollment) {
    throw new Error("Enrollment not found");
  }

  // 중복 enrollment 방지
  const existingIds = existingSession.enrollmentIds || [];
  if (!existingIds.includes(newEnrollment.id)) {
    return {
      ...existingSession,
      enrollmentIds: [...existingIds, newEnrollment.id],
    };
  }

  return existingSession;
}

// 🆕 새로운 그룹 세션 생성 함수
export function createGroupSession(
  candidate: SessionCandidate,
  enrollments: Enrollment[]
): Session {
  const enrollment = enrollments.find(
    (e) =>
      e.studentId === candidate.studentId && e.subjectId === candidate.subjectId
  );

  if (!enrollment) {
    throw new Error("Enrollment not found");
  }

  return {
    id: crypto.randomUUID(),
    enrollmentIds: [enrollment.id],
    weekday: candidate.weekday,
    startsAt: candidate.startsAt,
    endsAt: candidate.endsAt,
    weekStartDate: "",
    room: candidate.room,
  };
}

export function sessionsOverlapSameStudent(
  a: {
    enrollmentIds: string[]; // 🆕 enrollmentId → enrollmentIds로 변경
    weekday: number;
    startsAt: string;
    endsAt: string;
  },
  b: {
    enrollmentIds: string[]; // 🆕 enrollmentId → enrollmentIds로 변경
    weekday: number;
    startsAt: string;
    endsAt: string;
  },
  enrolls: Enrollment[]
) {
  if (a.weekday !== b.weekday) return false;

  // 🆕 여러 enrollment에서 학생 ID들을 추출
  const aStudentIds = a.enrollmentIds
    .map(
      (enrollmentId) => enrolls.find((e) => e.id === enrollmentId)?.studentId
    )
    .filter(Boolean) as string[];

  const bStudentIds = b.enrollmentIds
    .map(
      (enrollmentId) => enrolls.find((e) => e.id === enrollmentId)?.studentId
    )
    .filter(Boolean) as string[];

  // 🆕 같은 학생이 있는지 확인 (겹치는 학생이 있으면 겹침으로 판단)
  const hasCommonStudent = aStudentIds.some((studentId) =>
    bStudentIds.includes(studentId)
  );

  if (!hasCommonStudent) return false;

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
