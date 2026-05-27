import { describe, it, expect } from "vitest";
import {
  planSessionAdd,
  buildRepositionedSessionsAfterAdd,
} from "../sessionAddHelpers";
import type { Session, Enrollment, Subject } from "@/lib/planner";

const makeSession = (
  id: string,
  weekday: number,
  startsAt: string,
  endsAt: string,
  opts: Partial<Session> = {},
): Session =>
  ({
    id,
    weekday,
    startsAt,
    endsAt,
    yPosition: 1,
    enrollmentIds: [],
    weekStartDate: "2026-05-04",
    subjectId: "subj-1",
    ...opts,
  }) as Session;

const subj = (id: string): Subject => ({
  id,
  name: `Subject ${id}`,
  color: "#FF0000",
});

describe("planSessionAdd", () => {
  it("기존 enrollment 재사용 → newEnrollments 비어있음", () => {
    const enrollments: Enrollment[] = [
      { id: "e1", studentId: "stu-1", subjectId: "subj-1" },
    ];
    const result = planSessionAdd({
      input: {
        subjectId: "subj-1",
        studentIds: ["stu-1"],
        weekday: 0,
        startTime: "09:00",
        endTime: "10:00",
      },
      sessions: [],
      enrollments,
      fallbackWeekStartDate: "2026-05-04",
    });
    expect(result.newEnrollments).toHaveLength(0);
    expect(result.newSession.enrollmentIds).toEqual(["e1"]);
  });

  it("기존 enrollment 없으면 새로 생성", () => {
    const result = planSessionAdd({
      input: {
        subjectId: "subj-1",
        studentIds: ["stu-new"],
        weekday: 0,
        startTime: "09:00",
        endTime: "10:00",
      },
      sessions: [],
      enrollments: [],
      fallbackWeekStartDate: "2026-05-04",
    });
    expect(result.newEnrollments).toHaveLength(1);
    expect(result.newEnrollments[0]).toMatchObject({
      studentId: "stu-new",
      subjectId: "subj-1",
    });
    expect(result.newSession.enrollmentIds).toHaveLength(1);
  });

  it("teacherId 있으면 새 session 에 포함", () => {
    const result = planSessionAdd({
      input: {
        subjectId: "subj-1",
        studentIds: [],
        teacherId: "tea-1",
        weekday: 0,
        startTime: "09:00",
        endTime: "10:00",
      },
      sessions: [],
      enrollments: [],
      fallbackWeekStartDate: "2026-05-04",
    });
    expect(result.newSession.teacherId).toBe("tea-1");
  });

  it("teacherId 없으면 새 session 에 추가 안 함", () => {
    const result = planSessionAdd({
      input: {
        subjectId: "subj-1",
        studentIds: [],
        weekday: 0,
        startTime: "09:00",
        endTime: "10:00",
      },
      sessions: [],
      enrollments: [],
      fallbackWeekStartDate: "2026-05-04",
    });
    expect("teacherId" in result.newSession).toBe(false);
  });

  it("input.weekStartDate 우선 사용 (다른 주 등록 시)", () => {
    const result = planSessionAdd({
      input: {
        subjectId: "subj-1",
        studentIds: [],
        weekday: 0,
        startTime: "09:00",
        endTime: "10:00",
        weekStartDate: "2026-05-11",
      },
      sessions: [],
      enrollments: [],
      fallbackWeekStartDate: "2026-05-04",
    });
    expect(result.newSession.weekStartDate).toBe("2026-05-11");
  });

  it("input.weekStartDate 없으면 fallback 사용", () => {
    const result = planSessionAdd({
      input: {
        subjectId: "subj-1",
        studentIds: [],
        weekday: 0,
        startTime: "09:00",
        endTime: "10:00",
      },
      sessions: [],
      enrollments: [],
      fallbackWeekStartDate: "2026-05-04",
    });
    expect(result.newSession.weekStartDate).toBe("2026-05-04");
  });

  it("yPosition 미지정 시 default 1", () => {
    const result = planSessionAdd({
      input: {
        subjectId: "subj-1",
        studentIds: [],
        weekday: 0,
        startTime: "09:00",
        endTime: "10:00",
      },
      sessions: [],
      enrollments: [],
      fallbackWeekStartDate: "2026-05-04",
    });
    expect(result.newSession.yPosition).toBe(1);
  });

  it("yPosition=0 도 default 1 (truthy 체크 — 의도된 동작)", () => {
    const result = planSessionAdd({
      input: {
        subjectId: "subj-1",
        studentIds: [],
        weekday: 0,
        startTime: "09:00",
        endTime: "10:00",
        yPosition: 0,
      },
      sessions: [],
      enrollments: [],
      fallbackWeekStartDate: "2026-05-04",
    });
    // 원본 동작 보존: `sessionData.yPosition || 1` → 0 은 falsy 라 1
    expect(result.newSession.yPosition).toBe(1);
  });

  it("yPosition>0 그대로 유지", () => {
    const result = planSessionAdd({
      input: {
        subjectId: "subj-1",
        studentIds: [],
        weekday: 0,
        startTime: "09:00",
        endTime: "10:00",
        yPosition: 3,
      },
      sessions: [],
      enrollments: [],
      fallbackWeekStartDate: "2026-05-04",
    });
    expect(result.newSession.yPosition).toBe(3);
  });

  it("room 미지정 시 빈 문자열", () => {
    const result = planSessionAdd({
      input: {
        subjectId: "subj-1",
        studentIds: [],
        weekday: 0,
        startTime: "09:00",
        endTime: "10:00",
      },
      sessions: [],
      enrollments: [],
      fallbackWeekStartDate: "2026-05-04",
    });
    expect(result.newSession.room).toBe("");
  });

  it("mergedSessions = [...sessions, newSession]", () => {
    const existingSession = makeSession("existing", 0, "08:00", "09:00");
    const result = planSessionAdd({
      input: {
        subjectId: "subj-1",
        studentIds: [],
        weekday: 0,
        startTime: "09:00",
        endTime: "10:00",
      },
      sessions: [existingSession],
      enrollments: [],
      fallbackWeekStartDate: "2026-05-04",
    });
    expect(result.mergedSessions).toHaveLength(2);
    expect(result.mergedSessions[0]).toBe(existingSession);
    expect(result.mergedSessions[1]).toBe(result.newSession);
  });

  it("mergedEnrollments — newEnrollments 없으면 same reference", () => {
    const existingEnrollments: Enrollment[] = [
      { id: "e1", studentId: "stu-1", subjectId: "subj-1" },
    ];
    const result = planSessionAdd({
      input: {
        subjectId: "subj-1",
        studentIds: ["stu-1"], // 이미 enrollment 존재
        weekday: 0,
        startTime: "09:00",
        endTime: "10:00",
      },
      sessions: [],
      enrollments: existingEnrollments,
      fallbackWeekStartDate: "2026-05-04",
    });
    // newEnrollments 빈 배열 → page 는 enrollments 필드 미사용. mergedEnrollments 는 same ref.
    expect(result.newEnrollments).toHaveLength(0);
    expect(result.mergedEnrollments).toBe(existingEnrollments);
  });

  it("mergedEnrollments — newEnrollments 있으면 append", () => {
    const existingEnrollments: Enrollment[] = [
      { id: "e1", studentId: "stu-1", subjectId: "subj-other" },
    ];
    const result = planSessionAdd({
      input: {
        subjectId: "subj-1",
        studentIds: ["stu-1"], // subj-1 에 대해 새 enrollment 필요
        weekday: 0,
        startTime: "09:00",
        endTime: "10:00",
      },
      sessions: [],
      enrollments: existingEnrollments,
      fallbackWeekStartDate: "2026-05-04",
    });
    expect(result.newEnrollments).toHaveLength(1);
    expect(result.mergedEnrollments).toHaveLength(2);
  });

  it("multi-student 일괄 enrollment 처리", () => {
    const enrollments: Enrollment[] = [
      { id: "e1", studentId: "stu-1", subjectId: "subj-1" }, // 기존 — 재사용
    ];
    const result = planSessionAdd({
      input: {
        subjectId: "subj-1",
        studentIds: ["stu-1", "stu-2", "stu-3"], // stu-1 재사용, stu-2/3 새로
        weekday: 0,
        startTime: "09:00",
        endTime: "10:00",
      },
      sessions: [],
      enrollments,
      fallbackWeekStartDate: "2026-05-04",
    });
    expect(result.newEnrollments).toHaveLength(2); // stu-2, stu-3
    expect(result.newSession.enrollmentIds).toHaveLength(3);
    expect(result.newSession.enrollmentIds?.[0]).toBe("e1"); // 기존 첫번째
  });
});

describe("buildRepositionedSessionsAfterAdd", () => {
  it("새 session 추가 후 reposition — 같은 시간 충돌 시 다른 lane", () => {
    const newSession = makeSession("new", 0, "09:00", "10:00", {
      yPosition: 1,
      subjectId: "subj-1",
    });
    const existing = makeSession("ex", 0, "09:00", "10:00", {
      yPosition: 1,
      subjectId: "subj-1",
    });

    const { repositionedSessions, mergedEnrollments } =
      buildRepositionedSessionsAfterAdd({
        newSession,
        sessions: [existing],
        enrollments: [],
        newEnrollments: [],
        subjects: [subj("subj-1")],
        weekday: 0,
        startTime: "09:00",
        endTime: "10:00",
        yPosition: 1,
      });

    // 두 session 모두 존재 + lane 분리
    expect(repositionedSessions).toHaveLength(2);
    const repositionedNew = repositionedSessions.find((s) => s.id === "new");
    const repositionedEx = repositionedSessions.find((s) => s.id === "ex");
    expect(repositionedNew).toBeDefined();
    expect(repositionedEx).toBeDefined();
    expect(mergedEnrollments).toHaveLength(0);
  });

  it("newEnrollments 있으면 mergedEnrollments append", () => {
    const newSession = makeSession("new", 0, "09:00", "10:00");
    const existingEnr: Enrollment[] = [
      { id: "e1", studentId: "stu-1", subjectId: "subj-1" },
    ];
    const newEnr: Enrollment[] = [
      { id: "e2", studentId: "stu-2", subjectId: "subj-1" },
    ];

    const { mergedEnrollments } = buildRepositionedSessionsAfterAdd({
      newSession,
      sessions: [],
      enrollments: existingEnr,
      newEnrollments: newEnr,
      subjects: [subj("subj-1")],
      weekday: 0,
      startTime: "09:00",
      endTime: "10:00",
      yPosition: 1,
    });

    expect(mergedEnrollments).toHaveLength(2);
  });
});
