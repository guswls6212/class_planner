import { describe, expect, it } from "vitest";
import type { Enrollment, Session, Subject } from "../planner";
import { computeRequiredLanes, computeTentativeLayout, repositionSessions } from "../sessionCollisionUtils";

const sub = (id: string, name: string): Subject => ({
  id,
  name,
  color: "#000",
});
const enr = (id: string, studentId: string, subjectId: string): Enrollment => ({
  id,
  studentId,
  subjectId,
});

describe("repositionSessions - 충돌/재배치", () => {
  it("드래그 이동: 이동 대상은 목표 y 유지, 겹치는 세션만 한 칸 아래로", () => {
    const subjects: Subject[] = [
      sub("sub1", "중등수학"),
      sub("sub2", "초등수학"),
    ];
    const enrollments: Enrollment[] = [
      enr("e1", "s1", "sub1"),
      enr("e2", "s2", "sub2"),
    ];

    const sessions: Session[] = [
      {
        id: "sess1",
        weekday: 0,
        startsAt: "10:00",
        endsAt: "11:00",
        yPosition: 1,
        enrollmentIds: ["e1"],
        room: "",
      },
      {
        id: "sess2",
        weekday: 0,
        startsAt: "09:30",
        endsAt: "10:30",
        yPosition: 2,
        enrollmentIds: ["e2"],
        room: "",
      },
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

    const byId = Object.fromEntries(result.map((s) => [s.id, s]));
    // 압축 로직에 의해 yPosition이 1부터 연속적으로 재배치됨
    expect(byId["sess1"].yPosition).toBe(1); // 이동한 세션이 첫 번째 위치
    expect(byId["sess2"].yPosition).toBe(2); // 밀려난 세션이 두 번째 위치
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
      {
        id: "m",
        weekday: 0,
        startsAt: "10:00",
        endsAt: "11:00",
        yPosition: 3,
        enrollmentIds: ["e1"],
        room: "",
      },
      {
        id: "a",
        weekday: 0,
        startsAt: "11:00",
        endsAt: "12:00",
        yPosition: 3,
        enrollmentIds: ["e2"],
        room: "",
      },
      {
        id: "b",
        weekday: 0,
        startsAt: "10:30",
        endsAt: "11:30",
        yPosition: 4,
        enrollmentIds: ["e3"],
        room: "",
      },
      {
        id: "c",
        weekday: 0,
        startsAt: "11:30",
        endsAt: "12:30",
        yPosition: 5,
        enrollmentIds: ["e4"],
        room: "",
      },
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

    const byId = Object.fromEntries(result.map((s) => [s.id, s]));
    // 압축 로직에 의해 yPosition이 1부터 연속적으로 재배치됨
    expect(byId["m"].yPosition).toBe(1); // 편집된 세션이 첫 번째 위치
    expect(byId["m"].endsAt).toBe("11:30");
    expect(byId["a"].yPosition).toBe(2); // 고등수학이 두 번째 위치로 밀려남
    expect(byId["b"].yPosition).toBe(3); // 중등과학이 세 번째 위치로 밀려남(체인 전파)
    expect(byId["c"].yPosition).toBe(3); // 중등국어도 세 번째 위치로 밀려남 (b와 같은 위치)
  });

  it("서로 다른 요일로 이동 시 이동 대상이 중복되지 않는다", () => {
    const subjects: Subject[] = [sub("sub1", "중등수학")];
    const enrollments: Enrollment[] = [enr("e1", "s1", "sub1")];

    const sessions: Session[] = [
      {
        id: "sessA",
        weekday: 1,
        startsAt: "10:30",
        endsAt: "11:30",
        yPosition: 1,
        enrollmentIds: ["e1"],
        room: "",
      },
    ];

    const result = repositionSessions(
      sessions,
      enrollments,
      subjects,
      2, // 수요일로 이동
      "10:30",
      "11:30",
      1,
      "sessA"
    );

    const count = result.filter((s) => s.id === "sessA").length;
    expect(count).toBe(1);
    expect(result.find((s) => s.id === "sessA")?.weekday).toBe(2);
  });
});

const makeSession = (
  id: string,
  startsAt: string,
  endsAt: string,
  yPosition = 1
): Session => ({
  id,
  weekday: 0,
  startsAt,
  endsAt,
  yPosition,
  enrollmentIds: [],
});

describe("computeRequiredLanes", () => {
  it("빈 세션 배열 → 1 lane", () => {
    expect(computeRequiredLanes([])).toBe(1);
  });

  it("단일 세션 → 1 lane (yPosition과 무관)", () => {
    expect(computeRequiredLanes([makeSession("s1", "09:00", "10:00", 2)])).toBe(1);
  });

  it("시간이 겹치지 않는 2개 세션 → 1 lane", () => {
    const sessions = [
      makeSession("s1", "09:00", "10:00"),
      makeSession("s2", "10:00", "11:00"),
    ];
    expect(computeRequiredLanes(sessions)).toBe(1);
  });

  it("시간이 겹치는 2개 세션 → 2 lanes", () => {
    const sessions = [
      makeSession("s1", "09:00", "10:00"),
      makeSession("s2", "09:30", "10:30"),
    ];
    expect(computeRequiredLanes(sessions)).toBe(2);
  });

  it("3개 세션이 모두 겹침 → 3 lanes", () => {
    const sessions = [
      makeSession("s1", "09:00", "10:00"),
      makeSession("s2", "09:00", "10:00"),
      makeSession("s3", "09:00", "10:00"),
    ];
    expect(computeRequiredLanes(sessions)).toBe(3);
  });

  it("고아 yPosition=2 단독 세션 → 1 lane (Bug 4 핵심 케이스)", () => {
    expect(computeRequiredLanes([makeSession("s1", "09:00", "10:00", 2)])).toBe(1);
  });
});

describe("computeTentativeLayout", () => {
  const enroll = (id: string, studentId: string, subjectId: string): Enrollment => ({
    id,
    studentId,
    subjectId,
  });
  const subject = (id: string): Subject => ({ id, name: "수학", color: "#000" });

  const makeSessionFull = (
    id: string,
    weekday: number,
    startsAt: string,
    endsAt: string,
    yPosition = 1
  ): Session => ({
    id,
    weekday,
    startsAt,
    endsAt,
    yPosition,
    enrollmentIds: ["e1"],
    room: "",
  });

  it("drag 없음 → 원본 Map 참조 그대로 반환", () => {
    const map = new Map<number, Session[]>();
    map.set(0, [makeSessionFull("s1", 0, "09:00", "10:00")]);
    const result = computeTentativeLayout(map, [], [], null, null, null, null);
    expect(result).toBe(map);
  });

  it("드래그된 세션이 빈 lane으로 이동 → 해당 weekday에 새 위치로 나타남", () => {
    const dragged = makeSessionFull("s1", 0, "09:00", "10:00", 1);
    const map = new Map<number, Session[]>();
    map.set(0, [dragged]);
    const enrollments = [enroll("e1", "st1", "sub1")];
    const subjects = [subject("sub1")];

    const result = computeTentativeLayout(
      map, enrollments, subjects, dragged, 0, "11:00", 1
    );
    const day0 = result.get(0) ?? [];
    const movedSession = day0.find((s) => s.id === "s1");
    expect(movedSession).toBeDefined();
    expect(movedSession?.startsAt).toBe("11:00");
    expect(movedSession?.endsAt).toBe("12:00");
  });

  it("드래그된 세션이 점유된 lane으로 이동 → 기존 세션이 다음 lane으로 밀려남", () => {
    const dragged = makeSessionFull("dragged", 0, "09:00", "10:00", 1);
    const occupant = makeSessionFull("occupant", 0, "09:30", "10:30", 1);
    const map = new Map<number, Session[]>();
    map.set(0, [dragged, occupant]);
    const enrollments = [
      enroll("e1", "st1", "sub1"),
      enroll("e2", "st2", "sub1"),
    ];
    const subjects = [subject("sub1")];

    const result = computeTentativeLayout(
      map, enrollments, subjects, dragged, 0, "09:00", 1
    );
    const day0 = result.get(0) ?? [];
    const byId = Object.fromEntries(day0.map((s) => [s.id, s]));
    expect(byId["dragged"].yPosition).toBe(1);
    expect(byId["occupant"].yPosition).toBeGreaterThan(1);
  });

  it("다른 요일로 드래그 → 원본 요일에 세션 없음, 목표 요일에 나타남", () => {
    const dragged = makeSessionFull("s1", 0, "09:00", "10:00", 1);
    const map = new Map<number, Session[]>();
    map.set(0, [dragged]);
    map.set(1, []);
    const enrollments = [enroll("e1", "st1", "sub1")];
    const subjects = [subject("sub1")];

    const result = computeTentativeLayout(
      map, enrollments, subjects, dragged, 1, "09:00", 1
    );
    const day0 = result.get(0) ?? [];
    const day1 = result.get(1) ?? [];
    expect(day0.find((s) => s.id === "s1")).toBeUndefined();
    expect(day1.find((s) => s.id === "s1")).toBeDefined();
    expect(day1.find((s) => s.id === "s1")?.weekday).toBe(1);
  });
});
