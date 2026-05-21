import { describe, expect, it } from "vitest";
import { findClosestMatchingWeek } from "../findClosestMatchingWeek";
import type { Session } from "../../../../lib/planner";

const ENROLLMENTS = [
  { id: "e-A-math", studentId: "stu-A", subjectId: "sub-math" },
  { id: "e-B-math", studentId: "stu-B", subjectId: "sub-math" },
];

function mkSession(
  id: string,
  weekStartDate: string,
  overrides: Partial<Session> = {},
): Session {
  return {
    id,
    enrollmentIds: ["e-A-math"],
    teacherId: "tch-1",
    weekday: 0,
    startsAt: "09:00",
    endsAt: "10:00",
    yPosition: 1,
    weekStartDate,
    ...overrides,
  };
}

const baseInput = {
  sessions: [] as Session[],
  enrollments: ENROLLMENTS,
  currentWeekStart: "2026-05-18",
  selectedStudentIds: [],
  selectedSubjectIds: [],
  selectedTeacherIds: [],
};

describe("findClosestMatchingWeek", () => {
  it("필터 0개 → null", () => {
    expect(
      findClosestMatchingWeek({
        ...baseInput,
        sessions: [mkSession("s1", "2026-05-11")],
      }),
    ).toBeNull();
  });

  it("매칭 session 0건 → null", () => {
    expect(
      findClosestMatchingWeek({
        ...baseInput,
        sessions: [mkSession("s1", "2026-05-11", { enrollmentIds: ["e-B-math"] })],
        selectedStudentIds: ["stu-A"],
      }),
    ).toBeNull();
  });

  it("현재 주에 매칭 있음 → null (banner 불필요)", () => {
    expect(
      findClosestMatchingWeek({
        ...baseInput,
        sessions: [mkSession("s-current", "2026-05-18")],
        selectedStudentIds: ["stu-A"],
      }),
    ).toBeNull();
  });

  it("과거 주에만 매칭 → 그 주 결과 + isFuture=false", () => {
    const out = findClosestMatchingWeek({
      ...baseInput,
      sessions: [mkSession("s-past", "2026-05-11")],
      selectedStudentIds: ["stu-A"],
    });
    expect(out).toEqual({
      weekStartDate: "2026-05-11",
      count: 1,
      isFuture: false,
    });
  });

  it("미래 주에만 매칭 → isFuture=true", () => {
    const out = findClosestMatchingWeek({
      ...baseInput,
      sessions: [mkSession("s-future", "2026-05-25")],
      selectedStudentIds: ["stu-A"],
    });
    expect(out).toEqual({
      weekStartDate: "2026-05-25",
      count: 1,
      isFuture: true,
    });
  });

  it("과거 + 미래 매칭 — 가장 가까운 주 선택 (delta 최소)", () => {
    const out = findClosestMatchingWeek({
      ...baseInput,
      sessions: [
        mkSession("s-past-far", "2026-04-27"), // 3주 전
        mkSession("s-past-near", "2026-05-11"), // 1주 전
        mkSession("s-future-far", "2026-06-08"), // 3주 후
      ],
      selectedStudentIds: ["stu-A"],
    });
    expect(out?.weekStartDate).toBe("2026-05-11");
    expect(out?.isFuture).toBe(false);
  });

  it("tie-breaker — 같은 |delta| 면 future 우선", () => {
    const out = findClosestMatchingWeek({
      ...baseInput,
      sessions: [
        mkSession("s-past", "2026-05-11"), // 1주 전
        mkSession("s-future", "2026-05-25"), // 1주 후
      ],
      selectedStudentIds: ["stu-A"],
    });
    expect(out?.weekStartDate).toBe("2026-05-25");
    expect(out?.isFuture).toBe(true);
  });

  it("count — 가장 가까운 주에 매칭 session 여러 개면 그 개수 반환", () => {
    const out = findClosestMatchingWeek({
      ...baseInput,
      sessions: [
        mkSession("s-1", "2026-05-11"),
        mkSession("s-2", "2026-05-11"),
        mkSession("s-3", "2026-05-11"),
        mkSession("s-other", "2026-04-27"),
      ],
      selectedStudentIds: ["stu-A"],
    });
    expect(out?.count).toBe(3);
  });

  it("weekStartDate 없는 session 은 무시", () => {
    const out = findClosestMatchingWeek({
      ...baseInput,
      sessions: [
        // @ts-expect-error — 의도적으로 weekStartDate 누락 (legacy 데이터 시뮬레이션)
        { ...mkSession("s-broken", ""), weekStartDate: undefined },
        mkSession("s-ok", "2026-05-11"),
      ],
      selectedStudentIds: ["stu-A"],
    });
    expect(out?.weekStartDate).toBe("2026-05-11");
  });

  it("다중 type 필터 (학생 + 강사 AND) — 모두 만족하는 session 의 주만", () => {
    const out = findClosestMatchingWeek({
      ...baseInput,
      sessions: [
        // 학생 A 매칭 / 강사 tch-2 (X)
        mkSession("s-wrong-teacher", "2026-05-11", { teacherId: "tch-2" }),
        // 학생 A 매칭 / 강사 tch-1 (O)
        mkSession("s-correct", "2026-05-04", { teacherId: "tch-1" }),
      ],
      selectedStudentIds: ["stu-A"],
      selectedTeacherIds: ["tch-1"],
    });
    expect(out?.weekStartDate).toBe("2026-05-04");
  });
});
