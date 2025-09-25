import { describe, it, expect } from "vitest";
import { repositionSessions } from "../sessionCollisionUtils";
import type { Enrollment, Session, Subject } from "../planner";

function buildSession(
  id: string,
  weekday: number,
  startsAt: string,
  endsAt: string,
  yPosition: number,
  enrollmentIds: string[]
): Session {
  return {
    id,
    subjectId: "sub-1",
    studentIds: [],
    weekday,
    startsAt,
    endsAt,
    room: "",
    enrollmentIds,
    yPosition,
  } as Session;
}

const subjects: Subject[] = [
  { id: "sub-1", name: "수학", color: "#000000" } as Subject,
];

const enrollments: Enrollment[] = [
  { id: "en-1", studentId: "st-1", subjectId: "sub-1" } as Enrollment,
  { id: "en-2", studentId: "st-2", subjectId: "sub-1" } as Enrollment,
  { id: "en-3", studentId: "st-3", subjectId: "sub-1" } as Enrollment,
];

describe("repositionSessions - 빈 yPos 압축", () => {
  it("해당 요일에 yPos가 [3],[6]만 있을 때 압축 후 [1],[2]로 재배치되어야 한다", () => {
    const weekday = 4; // 목요일
    const sessionA = buildSession("A", weekday, "10:00", "11:00", 3, ["en-1"]);
    const sessionB = buildSession("B", weekday, "11:00", "12:00", 6, ["en-2"]);
    const sessionC = buildSession("C", weekday, "12:00", "13:00", 6, ["en-3"]);

    // 다른 요일 세션 하나 (영향 X)
    const other = buildSession("Z", 3, "10:00", "11:00", 2, ["en-1"]);

    const sessions = [sessionA, sessionB, sessionC, other];

    // 충돌이 없도록 A를 그대로 옮기는 시나리오(anchor=3)
    const result = repositionSessions(
      sessions,
      enrollments,
      subjects,
      weekday,
      sessionA.startsAt,
      sessionA.endsAt,
      sessionA.yPosition || 1,
      sessionA.id
    );

    const thu = result.filter((s) => s.weekday === weekday);
    // 압축 후 yPosition은 1부터 연속
    const positions = thu.map((s) => s.yPosition || 1).sort((a, b) => a - b);
    expect(positions).toEqual([1, 2, 2]);
  });

  it("해당 요일이 비어 있고 yPos=4로 추가되어도 압축되어 yPos=1이 되어야 한다", () => {
    const weekday = 4; // 목요일

    // 목요일엔 새 세션 하나만, yPos=4로 존재하는 상황 가정 (add 이후 즉시 재배치 단계)
    const newSession = buildSession(
      "NEW",
      weekday,
      "10:30",
      "11:30",
      4,
      ["en-1"]
    );

    const sessions = [newSession];

    const result = repositionSessions(
      sessions,
      enrollments,
      subjects,
      weekday,
      newSession.startsAt,
      newSession.endsAt,
      newSession.yPosition || 1,
      newSession.id
    );

    const thu = result.filter((s) => s.weekday === weekday);
    expect(thu).toHaveLength(1);
    expect(thu[0].yPosition).toBe(1);
  });
});


