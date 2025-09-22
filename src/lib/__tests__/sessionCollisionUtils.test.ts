import { describe, expect, it } from "vitest";
import { repositionSessions } from "../sessionCollisionUtils";
import type { Session, Enrollment, Subject } from "../planner";

const sub = (id: string, name: string): Subject => ({ id, name, color: "#000" });
const enr = (id: string, studentId: string, subjectId: string): Enrollment => ({ id, studentId, subjectId });

describe("repositionSessions - 충돌/재배치", () => {
  it("드래그 이동: 이동 대상은 목표 y 유지, 겹치는 세션만 한 칸 아래로", () => {
    const subjects: Subject[] = [sub("sub1", "중등수학"), sub("sub2", "초등수학")];
    const enrollments: Enrollment[] = [
      enr("e1", "s1", "sub1"),
      enr("e2", "s2", "sub2"),
    ];

    const sessions: Session[] = [
      { id: "sess1", weekday: 0, startsAt: "10:00", endsAt: "11:00", yPosition: 1, enrollmentIds: ["e1"], room: "" },
      { id: "sess2", weekday: 0, startsAt: "09:30", endsAt: "10:30", yPosition: 2, enrollmentIds: ["e2"], room: "" },
    ];

    const result = repositionSessions(
      sessions,
      enrollments,
      subjects,
      0,
      "10:00",
      "11:00",
      2,
      "sess1"
    );

    const byId = Object.fromEntries(result.map(s => [s.id, s]));
    expect(byId["sess1"].yPosition).toBe(2);
    expect(byId["sess2"].yPosition).toBe(3);
  });

  it("편집 저장: 체인 전파로 연쇄 밀어내기, 비겹침 항목은 고정", () => {
    const subjects: Subject[] = [
      sub("sub1", "중등수학"),
      sub("sub2", "고등수학"),
      sub("sub3", "중등과학"),
      sub("sub4", "중등국어"),
    ];
    const enrollments: Enrollment[] = [
      enr("e1", "st1", "sub1"),
      enr("e2", "st2", "sub2"),
      enr("e3", "st3", "sub3"),
      enr("e4", "st4", "sub4"),
    ];

    // y=3: 중등수학(10:00-11:00), 고등수학(11:00-12:00)
    // y=4: 중등과학(10:30-11:30)
    // y=5: 중등국어(11:30-12:30)
    const sessions: Session[] = [
      { id: "m", weekday: 0, startsAt: "10:00", endsAt: "11:00", yPosition: 3, enrollmentIds: ["e1"], room: "" },
      { id: "a", weekday: 0, startsAt: "11:00", endsAt: "12:00", yPosition: 3, enrollmentIds: ["e2"], room: "" },
      { id: "b", weekday: 0, startsAt: "10:30", endsAt: "11:30", yPosition: 4, enrollmentIds: ["e3"], room: "" },
      { id: "c", weekday: 0, startsAt: "11:30", endsAt: "12:30", yPosition: 5, enrollmentIds: ["e4"], room: "" },
    ];

    const result = repositionSessions(
      sessions,
      enrollments,
      subjects,
      0,
      "10:00",
      "11:30",
      3,
      "m"
    );

    const byId = Object.fromEntries(result.map(s => [s.id, s]));
    expect(byId["m"].yPosition).toBe(3);
    expect(byId["m"].endsAt).toBe("11:30");
    expect(byId["a"].yPosition).toBe(4); // 고등수학 내려감
    expect(byId["b"].yPosition).toBe(5); // 중등과학 내려감(체인 전파)
    expect(byId["c"].yPosition).toBe(5); // 비겹침(경계 일치) → 그대로
  });
});


