/**
 * teacherSessions 순수 helper 테스트.
 *
 * 핵심 회귀 가드: PDF 5-column 중복 (teacher-schedule-pdf-followup Issue 1).
 * 주별 격리 모델에서 같은 (weekday, time, teacher) 수업은 주마다 별도 Session row 로 존재한다.
 * 호출 측(teacher-schedule page)이 선택된 주(weekStartDate)로 먼저 필터하면 1개만 남아야 하고,
 * 그게 PdfRenderer 의 lane 중복(5 column)을 막는 유일한 방어선이다 (PR #486).
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const warnMock = vi.fn();

vi.mock("../../lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    warn: (...args: unknown[]) => warnMock(...args),
  },
}));

import type { Enrollment, Session } from "../../lib/planner";
import {
  filterValidTeacherSessions,
  groupSessionsByWeekday,
  isValidSession,
} from "../teacherSessions";
import { _resetSessionValidationLoggerCache } from "../_sessionValidationLogger";

const ENROLLMENTS: Enrollment[] = [
  { id: "enr-1", studentId: "stu-1", subjectId: "sub-1" },
  { id: "enr-2", studentId: "stu-2", subjectId: "sub-1" },
];

function makeSession(over: Partial<Session> = {}): Session {
  return {
    id: "ses-default",
    weekday: 0,
    startsAt: "09:00",
    endsAt: "10:00",
    weekStartDate: "2026-05-25",
    enrollmentIds: ["enr-1"],
    teacherId: "tea-1",
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  warnMock.mockClear();
  _resetSessionValidationLoggerCache();
});

describe("isValidSession", () => {
  it("필수 필드 + 유효 enrollment 가 있으면 valid", () => {
    expect(isValidSession(makeSession(), ENROLLMENTS)).toBe(true);
  });

  it("enrollmentIds 비어있으면 invalid", () => {
    expect(isValidSession(makeSession({ enrollmentIds: [] }), ENROLLMENTS)).toBe(
      false
    );
  });

  it("매칭되는 enrollment 가 하나도 없으면 invalid", () => {
    expect(
      isValidSession(makeSession({ enrollmentIds: ["ghost"] }), ENROLLMENTS)
    ).toBe(false);
  });

  it("startsAt 누락 시 invalid", () => {
    expect(
      isValidSession(makeSession({ startsAt: "" }), ENROLLMENTS)
    ).toBe(false);
  });
});

describe("filterValidTeacherSessions", () => {
  it("teacherId 로 본인 수업만 남긴다", () => {
    const sessions = [
      makeSession({ id: "mine", teacherId: "tea-1" }),
      makeSession({ id: "other", teacherId: "tea-2", startsAt: "11:00" }),
    ];
    const result = filterValidTeacherSessions(sessions, ENROLLMENTS, "tea-1");
    expect(result.map((s) => s.id)).toEqual(["mine"]);
  });

  it("teacherId 가 null 이면 유효 session 전체 반환 (강사 미연결 fallback)", () => {
    const sessions = [
      makeSession({ id: "a", teacherId: "tea-1" }),
      makeSession({ id: "b", teacherId: "tea-2", startsAt: "11:00" }),
    ];
    const result = filterValidTeacherSessions(sessions, ENROLLMENTS, null);
    expect(result).toHaveLength(2);
  });

  it("invalid session 은 제거한다", () => {
    const sessions = [
      makeSession({ id: "ok" }),
      makeSession({ id: "bad", enrollmentIds: [] }),
    ];
    const result = filterValidTeacherSessions(sessions, ENROLLMENTS, "tea-1");
    expect(result.map((s) => s.id)).toEqual(["ok"]);
  });

  it("startsAt 기준 시간순 정렬", () => {
    const sessions = [
      makeSession({ id: "late", startsAt: "15:00" }),
      makeSession({ id: "early", startsAt: "08:00" }),
      makeSession({ id: "mid", startsAt: "11:00" }),
    ];
    const result = filterValidTeacherSessions(sessions, ENROLLMENTS, "tea-1");
    expect(result.map((s) => s.id)).toEqual(["early", "mid", "late"]);
  });

  it("[회귀] 같은 (weekday,time,teacher) 5주치 → 선택된 주 필터 후 1개만 (PDF 5-column 방어선)", () => {
    const weeks = [
      "2026-05-04",
      "2026-05-11",
      "2026-05-18",
      "2026-05-25",
      "2026-06-01",
    ];
    const fiveWeeks: Session[] = weeks.map((wk) =>
      makeSession({
        id: `ses-${wk}`,
        weekStartDate: wk,
        weekday: 0,
        startsAt: "09:00",
        endsAt: "10:00",
        teacherId: "tea-1",
      })
    );

    // helper 단독으로는 전 주를 반환 (monthly view 의 정상 동작 — 각 주 occurrence 는 실제 수업)
    expect(
      filterValidTeacherSessions(fiveWeeks, ENROLLMENTS, "tea-1")
    ).toHaveLength(5);

    // teacher-schedule page 처럼 선택된 주로 먼저 필터하면 1개만 → PDF lane 중복 차단
    const selectedWeek = "2026-05-25";
    const weekFiltered = fiveWeeks.filter(
      (s) => s.weekStartDate === selectedWeek
    );
    const result = filterValidTeacherSessions(
      weekFiltered,
      ENROLLMENTS,
      "tea-1"
    );
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("ses-2026-05-25");
  });
});

describe("groupSessionsByWeekday", () => {
  it("weekday 별로 group 한다", () => {
    const sessions = [
      makeSession({ id: "mon", weekday: 0 }),
      makeSession({ id: "wed", weekday: 2 }),
      makeSession({ id: "mon2", weekday: 0, startsAt: "11:00" }),
    ];
    const map = groupSessionsByWeekday(sessions);
    expect(map.get(0)?.map((s) => s.id)).toEqual(["mon", "mon2"]);
    expect(map.get(2)?.map((s) => s.id)).toEqual(["wed"]);
    expect(map.has(1)).toBe(false);
  });
});
