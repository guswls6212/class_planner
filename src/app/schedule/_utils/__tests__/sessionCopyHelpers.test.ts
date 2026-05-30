import { describe, it, expect } from "vitest";
import {
  planBulkSessionCopy,
  planSingleSessionCopy,
} from "../sessionCopyHelpers";
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

const subj = (id: string, color = "#FF0000"): Subject => ({
  id,
  name: `Subject ${id}`,
  color,
});

const SELECTED_DATE = new Date("2026-05-07T00:00:00+09:00"); // 목요일

describe("planBulkSessionCopy", () => {
  it("canManage=false → failure (no-permission)", () => {
    const result = planBulkSessionCopy({
      canManage: false,
      sessions: [],
      enrollments: [],
      subjects: [],
      anchorSessionId: "a",
      newWeekday: 0,
      newTime: "10:00",
      newYPosition: 1,
      selectedSessionIds: ["a"],
      selectedDate: SELECTED_DATE,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("no-permission");
  });

  it("2개 선택 + 기존 enrollment 재사용 → newEnrollments 비어있음", () => {
    const enrollments: Enrollment[] = [
      { id: "e1", studentId: "stu-1", subjectId: "subj-1" },
      { id: "e2", studentId: "stu-2", subjectId: "subj-1" },
    ];
    const sessions: Session[] = [
      makeSession("a", 0, "09:00", "10:00", {
        subjectId: "subj-1",
        enrollmentIds: ["e1"],
      }),
      makeSession("b", 0, "11:00", "12:00", {
        subjectId: "subj-1",
        enrollmentIds: ["e2"],
      }),
    ];
    const result = planBulkSessionCopy({
      canManage: true,
      sessions,
      enrollments,
      subjects: [subj("subj-1")],
      anchorSessionId: "a",
      newWeekday: 2,
      newTime: "13:00",
      newYPosition: 1,
      selectedSessionIds: ["a", "b"],
      selectedDate: SELECTED_DATE,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.copiedCount).toBe(2);
    expect(result.outOfRange).toBe(0);
    expect(result.newEnrollments).toHaveLength(0);
    expect(result.newSessions).toHaveLength(2);
    // 새 session 의 enrollmentIds 가 기존 enrollment 재사용
    const newSessionEnrollmentIds = result.newSessions.flatMap(
      (s) => s.enrollmentIds ?? [],
    );
    expect(newSessionEnrollmentIds).toEqual(
      expect.arrayContaining(["e1", "e2"]),
    );
  });

  it("기존 enrollment 없으면 새로 생성", () => {
    const enrollments: Enrollment[] = [
      { id: "e1", studentId: "stu-1", subjectId: "subj-other" }, // 다른 subject
    ];
    const sessions: Session[] = [
      makeSession("a", 0, "09:00", "10:00", {
        subjectId: "subj-1",
        enrollmentIds: ["e1"], // 이 enrollment 는 subj-other 라서 재사용 못함
      }),
    ];
    // session.enrollmentIds 가 e1 을 가리키지만 e1.subjectId 가 subj-other 라
    // 새 enrollment 가 stu-1/subj-1 로 생성되어야 함... 아니, enrollmentIds 가 e1 인데
    // enrollments[e1].subjectId 가 subj-other 이면 studentIds 추출 시 stu-1 나오고
    // 새 copy 의 subject 가 subj-1 이라 stu-1 + subj-1 enrollment 가 없으면 새로 생성.
    const result = planBulkSessionCopy({
      canManage: true,
      sessions,
      enrollments,
      subjects: [subj("subj-1")],
      anchorSessionId: "a",
      newWeekday: 2,
      newTime: "13:00",
      newYPosition: 1,
      selectedSessionIds: ["a"],
      selectedDate: SELECTED_DATE,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.newEnrollments).toHaveLength(1);
    expect(result.newEnrollments[0]).toMatchObject({
      studentId: "stu-1",
      subjectId: "subj-1",
    });
  });

  it("teacherId 있으면 새 session 에 보존", () => {
    const sessions: Session[] = [
      makeSession("a", 0, "09:00", "10:00", {
        subjectId: "subj-1",
        teacherId: "tea-1",
        enrollmentIds: [],
      }),
    ];
    const result = planBulkSessionCopy({
      canManage: true,
      sessions,
      enrollments: [],
      subjects: [subj("subj-1")],
      anchorSessionId: "a",
      newWeekday: 2,
      newTime: "13:00",
      newYPosition: 1,
      selectedSessionIds: ["a"],
      selectedDate: SELECTED_DATE,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.newSessions[0].teacherId).toBe("tea-1");
  });

  it("teacherId 없으면 새 session 에 추가 안 함", () => {
    const sessions: Session[] = [
      makeSession("a", 0, "09:00", "10:00", {
        subjectId: "subj-1",
        enrollmentIds: [],
      }),
    ];
    const result = planBulkSessionCopy({
      canManage: true,
      sessions,
      enrollments: [],
      subjects: [subj("subj-1")],
      anchorSessionId: "a",
      newWeekday: 2,
      newTime: "13:00",
      newYPosition: 1,
      selectedSessionIds: ["a"],
      selectedDate: SELECTED_DATE,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect("teacherId" in result.newSessions[0]).toBe(false);
  });

  it("subjectId 없는 source session 은 skip", () => {
    const sessions: Session[] = [
      makeSession("a", 0, "09:00", "10:00", {
        subjectId: undefined,
        enrollmentIds: [],
      }),
    ];
    const result = planBulkSessionCopy({
      canManage: true,
      sessions,
      enrollments: [],
      subjects: [],
      anchorSessionId: "a",
      newWeekday: 2,
      newTime: "13:00",
      newYPosition: 1,
      selectedSessionIds: ["a"],
      selectedDate: SELECTED_DATE,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.copiedCount).toBe(0);
    expect(result.newSessions).toHaveLength(0);
  });

  it("weekStartDate 가 selectedDate 의 주 월요일로 설정됨", () => {
    const sessions: Session[] = [
      makeSession("a", 0, "09:00", "10:00", {
        subjectId: "subj-1",
        enrollmentIds: [],
      }),
    ];
    // 2026-05-07 (목) → 주 월요일 = 2026-05-04
    const result = planBulkSessionCopy({
      canManage: true,
      sessions,
      enrollments: [],
      subjects: [subj("subj-1")],
      anchorSessionId: "a",
      newWeekday: 2,
      newTime: "13:00",
      newYPosition: 1,
      selectedSessionIds: ["a"],
      selectedDate: SELECTED_DATE,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.newSessions[0].weekStartDate).toBe("2026-05-04");
  });

  it("자정 이전(음수 시간) → outOfRange 카운트 반영", () => {
    // computeBulkMoveTargets 의 outOfRange 는 targetStartMin < 0 케이스만.
    // anchor 가 09:00, newTime=00:30 → delta = -8h30m
    // a: 09:00 → 00:30 (OK)
    // b: 09:00 - 0 = ... 음 follower 가 anchor 보다 늦은 시각이면 OK 가능.
    // 따라서 follower 가 anchor 보다 이른 case 가 필요. 하지만 sortedCandidates 가 yPos 정렬
    // 이라 yPos 같으면 어떤 순서든 가능. 명시적 음수 case 는 일찍 시작하는 session 을 follower 로.
    const sessions: Session[] = [
      makeSession("a", 0, "09:00", "10:00", {
        subjectId: "subj-1",
        enrollmentIds: [],
        yPosition: 2,
      }),
      makeSession("b", 0, "08:00", "09:00", {
        subjectId: "subj-1",
        enrollmentIds: [],
        yPosition: 1,
      }),
    ];
    // anchor=a (09:00), newTime=00:30 → dMinutes = -8h30m
    // a: 09:00 + (-510) = 30min ≥ 0 → OK
    // b: 08:00 + (-510) = -30min < 0 → outOfRange
    const result = planBulkSessionCopy({
      canManage: true,
      sessions,
      enrollments: [],
      subjects: [subj("subj-1")],
      anchorSessionId: "a",
      newWeekday: 0,
      newTime: "00:30",
      newYPosition: 1,
      selectedSessionIds: ["a", "b"],
      selectedDate: SELECTED_DATE,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.outOfRange).toBe(1);
    expect(result.copiedCount).toBe(1);
  });
});

describe("planSingleSessionCopy", () => {
  it("canManage=false → failure (no-permission)", () => {
    const result = planSingleSessionCopy({
      canManage: false,
      sessions: [],
      enrollments: [],
      sessionId: "a",
      newWeekday: 0,
      newTime: "10:00",
      newYPosition: 1,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("no-permission");
      expect(result.sessionId).toBe("a");
    }
  });

  it("session not found → failure (session-not-found)", () => {
    const result = planSingleSessionCopy({
      canManage: true,
      sessions: [],
      enrollments: [],
      sessionId: "missing",
      newWeekday: 0,
      newTime: "10:00",
      newYPosition: 1,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("session-not-found");
      expect(result.sessionId).toBe("missing");
    }
  });

  it("subjectId 없으면 failure (missing-subject)", () => {
    const sessions: Session[] = [
      makeSession("a", 0, "09:00", "10:00", { subjectId: undefined }),
    ];
    const result = planSingleSessionCopy({
      canManage: true,
      sessions,
      enrollments: [],
      sessionId: "a",
      newWeekday: 0,
      newTime: "10:00",
      newYPosition: 1,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("missing-subject");
  });

  it("happy path — duration 보존 + studentIds 매핑", () => {
    const enrollments: Enrollment[] = [
      { id: "e1", studentId: "stu-1", subjectId: "subj-1" },
      { id: "e2", studentId: "stu-2", subjectId: "subj-1" },
    ];
    const sessions: Session[] = [
      makeSession("a", 0, "09:00", "10:30", {
        subjectId: "subj-1",
        enrollmentIds: ["e1", "e2"],
        teacherId: "tea-1",
        room: "201",
      }),
    ];
    const result = planSingleSessionCopy({
      canManage: true,
      sessions,
      enrollments,
      sessionId: "a",
      newWeekday: 3,
      newTime: "14:00",
      newYPosition: 2,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload).toEqual({
      subjectId: "subj-1",
      studentIds: ["stu-1", "stu-2"],
      teacherId: "tea-1",
      weekday: 3,
      startTime: "14:00",
      endTime: "15:30", // 90분 보존
      yPosition: 2,
      room: "201",
    });
  });

  it("teacherId 없으면 payload.teacherId 도 undefined", () => {
    const sessions: Session[] = [
      makeSession("a", 0, "09:00", "10:00", {
        subjectId: "subj-1",
        enrollmentIds: [],
      }),
    ];
    const result = planSingleSessionCopy({
      canManage: true,
      sessions,
      enrollments: [],
      sessionId: "a",
      newWeekday: 0,
      newTime: "10:00",
      newYPosition: 1,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.teacherId).toBeUndefined();
  });

  it("enrollment 매핑 시 누락된 studentId 는 skip", () => {
    // session.enrollmentIds 에 "e2" 가 있지만 enrollments 배열에는 e2 가 없음 (orphan)
    const sessions: Session[] = [
      makeSession("a", 0, "09:00", "10:00", {
        subjectId: "subj-1",
        enrollmentIds: ["e1", "e2"],
      }),
    ];
    const enrollments: Enrollment[] = [
      { id: "e1", studentId: "stu-1", subjectId: "subj-1" },
    ];
    const result = planSingleSessionCopy({
      canManage: true,
      sessions,
      enrollments,
      sessionId: "a",
      newWeekday: 0,
      newTime: "10:00",
      newYPosition: 1,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.studentIds).toEqual(["stu-1"]);
  });
});
