import type { Session } from "@/lib/planner";

/**
 * 세션 fixture — Required<Omit<Session, "room">> 패턴.
 * Variant: normal / group / conflict / no-teacher.
 *
 * weekStartDate는 stable mock value로 — testing 시점 무관하게 fixture 결정성 유지.
 */
type FullSession = Required<Omit<Session, "room" | "publicDescription" | "internalNote">>;

const FIXED_WEEK = "2026-05-04"; // KST 기준 월요일

export const FIXTURE_SESSION_NORMAL: FullSession = {
  id: "sess-normal",
  subjectId: "sub-1",
  enrollmentIds: ["enr-1"],
  weekday: 0, // 월요일
  startsAt: "09:00",
  endsAt: "10:00",
  weekStartDate: FIXED_WEEK,
  yPosition: 1,
  teacherId: "tc-owner",
};

/** 그룹 수업: 같은 subjectId, 여러 enrollmentIds */
export const FIXTURE_SESSION_GROUP: FullSession = {
  id: "sess-group",
  subjectId: "sub-2",
  enrollmentIds: ["enr-grp-1", "enr-grp-2", "enr-grp-3"],
  weekday: 1, // 화요일
  startsAt: "14:00",
  endsAt: "15:30",
  weekStartDate: FIXED_WEEK,
  yPosition: 1,
  teacherId: "tc-admin",
};

/** 충돌 시나리오 A: 같은 시간대, yPosition=1 */
export const FIXTURE_SESSION_CONFLICT_A: FullSession = {
  id: "sess-conflict-a",
  subjectId: "sub-1",
  enrollmentIds: ["enr-1"],
  weekday: 2, // 수요일
  startsAt: "10:00",
  endsAt: "11:00",
  weekStartDate: FIXED_WEEK,
  yPosition: 1,
  teacherId: "tc-owner",
};

/** 충돌 시나리오 B: 같은 시간대, yPosition=2 (auto-lane 결과) */
export const FIXTURE_SESSION_CONFLICT_B: FullSession = {
  id: "sess-conflict-b",
  subjectId: "sub-2",
  enrollmentIds: ["enr-grp-2"],
  weekday: 2, // 수요일
  startsAt: "10:00",
  endsAt: "11:00",
  weekStartDate: FIXED_WEEK,
  yPosition: 2,
  teacherId: "tc-admin",
};

/** 강사 미지정 — teacherId: null */
export const FIXTURE_SESSION_NO_TEACHER: FullSession = {
  id: "sess-no-teacher",
  subjectId: "sub-3",
  enrollmentIds: ["enr-1"],
  weekday: 3, // 목요일
  startsAt: "16:00",
  endsAt: "17:00",
  weekStartDate: FIXED_WEEK,
  yPosition: 1,
  teacherId: null,
};

export const FIXTURE_SESSIONS: Session[] = [
  FIXTURE_SESSION_NORMAL,
  FIXTURE_SESSION_GROUP,
  FIXTURE_SESSION_CONFLICT_A,
  FIXTURE_SESSION_CONFLICT_B,
  FIXTURE_SESSION_NO_TEACHER,
];

export const FIXTURE_SESSIONS_CONFLICT_PAIR: Session[] = [
  FIXTURE_SESSION_CONFLICT_A,
  FIXTURE_SESSION_CONFLICT_B,
];

export const FIXTURE_SESSION_WEEK_START = FIXED_WEEK;
