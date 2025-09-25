import { describe, expect, it } from "vitest";
import type { Enrollment, Session, Subject } from "../planner";
import { repositionSessions } from "../sessionCollisionUtils";

const subjects: Subject[] = [
  { id: "sub-1", name: "수학", color: "#000" } as Subject,
];
const enrollments: Enrollment[] = [
  { id: "en-1", studentId: "st-1", subjectId: "sub-1" } as Enrollment,
  { id: "en-2", studentId: "st-2", subjectId: "sub-1" } as Enrollment,
];

function sess(
  id: string,
  weekday: number,
  start: string,
  end: string,
  y: number,
  eids: string[]
): Session {
  return {
    id,
    subjectId: "sub-1",
    studentIds: [],
    weekday,
    startsAt: start,
    endsAt: end,
    yPosition: y,
    room: "",
    enrollmentIds: eids,
  } as Session;
}

describe("교차-요일 이동 시 원래 요일 yPos 압축", () => {
  it("화요일(y=3,5)에서 수요일로 하나 이동하면, 화요일은 [1,2]로 압축되어야 한다", () => {
    const tue = 2; // 화요일
    const wed = 3; // 수요일

    const sA = sess("A", tue, "10:00", "11:00", 3, ["en-1"]);
    const sB = sess("B", tue, "11:00", "12:00", 5, ["en-2"]);

    const sessions = [sA, sB];

    // A를 수요일 y=2로 이동한다고 가정
    const result = repositionSessions(
      sessions,
      enrollments,
      subjects,
      wed,
      "10:00",
      "11:00",
      2,
      "A"
    );

    const tueSessions = result.filter((s) => s.weekday === tue);
    const wedSessions = result.filter((s) => s.weekday === wed);

    expect(wedSessions.some((s) => s.id === "A")).toBe(true);
    expect(wedSessions.find((s) => s.id === "A")?.yPosition).toBe(1);

    // 화요일에는 B만 남되 yPosition이 1로 압축
    expect(tueSessions).toHaveLength(1);
    expect(tueSessions[0].id).toBe("B");
    expect(tueSessions[0].yPosition).toBe(1);
  });
});
