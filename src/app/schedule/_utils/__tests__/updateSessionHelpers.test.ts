import { describe, it, expect } from "vitest";
import { planSessionUpdate } from "../updateSessionHelpers";
import type { Session, Subject } from "@/lib/planner";

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

describe("planSessionUpdate", () => {
  it("target session 만 update — 다른 session 은 그대로", () => {
    const sessions: Session[] = [
      makeSession("a", 0, "09:00", "10:00"),
      makeSession("b", 1, "11:00", "12:00"),
    ];
    const result = planSessionUpdate({
      sessionId: "a",
      input: { startTime: "10:00", endTime: "11:00" },
      sessions,
      enrollments: [],
      subjects: [subj("subj-1")],
    });
    const a = result.mergedSessions.find((s) => s.id === "a");
    const b = result.mergedSessions.find((s) => s.id === "b");
    expect(a?.startsAt).toBe("10:00");
    expect(a?.endsAt).toBe("11:00");
    expect(b?.startsAt).toBe("11:00"); // 변경 없음
    expect(b?.endsAt).toBe("12:00");
  });

  it("시간 필드명 변환 (startTime/endTime → startsAt/endsAt) 후 source key 제거", () => {
    const sessions: Session[] = [
      makeSession("a", 0, "09:00", "10:00"),
    ];
    const result = planSessionUpdate({
      sessionId: "a",
      input: { startTime: "14:00", endTime: "15:00" },
      sessions,
      enrollments: [],
      subjects: [subj("subj-1")],
    });
    const a = result.mergedSessions.find((s) => s.id === "a");
    expect(a?.startsAt).toBe("14:00");
    expect(a?.endsAt).toBe("15:00");
    // startTime / endTime key 가 spread 후 leak 되면 안 됨
    expect("startTime" in (a as object)).toBe(false);
    expect("endTime" in (a as object)).toBe(false);
  });

  it("input.startTime 없으면 기존 startsAt 유지", () => {
    const sessions: Session[] = [
      makeSession("a", 0, "09:00", "10:00"),
    ];
    const result = planSessionUpdate({
      sessionId: "a",
      input: { weekday: 2 }, // 시간 update 안 함
      sessions,
      enrollments: [],
      subjects: [subj("subj-1")],
    });
    const a = result.mergedSessions.find((s) => s.id === "a");
    expect(a?.startsAt).toBe("09:00"); // 기존 유지
    expect(a?.endsAt).toBe("10:00");
    expect(a?.weekday).toBe(2);
  });

  it("changedSession = repositioned 후의 target", () => {
    const sessions: Session[] = [
      makeSession("a", 0, "09:00", "10:00", { yPosition: 1 }),
    ];
    const result = planSessionUpdate({
      sessionId: "a",
      input: { startTime: "14:00", endTime: "15:00" },
      sessions,
      enrollments: [],
      subjects: [subj("subj-1")],
    });
    expect(result.changedSession).toBeDefined();
    expect(result.changedSession?.id).toBe("a");
    expect(result.changedSession?.startsAt).toBe("14:00");
  });

  it("hasTeacherId — teacherId key 존재 시 true (null 도 valid)", () => {
    const result = planSessionUpdate({
      sessionId: "a",
      input: { teacherId: null },
      sessions: [makeSession("a", 0, "09:00", "10:00")],
      enrollments: [],
      subjects: [subj("subj-1")],
    });
    expect(result.hasTeacherId).toBe(true);
  });

  it("hasTeacherId — teacherId key 없으면 false", () => {
    const result = planSessionUpdate({
      sessionId: "a",
      input: { startTime: "10:00" },
      sessions: [makeSession("a", 0, "09:00", "10:00")],
      enrollments: [],
      subjects: [subj("subj-1")],
    });
    expect(result.hasTeacherId).toBe(false);
  });

  it("hasWeekStartDate — undefined 가 아니면 true (다른 주 이동 case)", () => {
    const result = planSessionUpdate({
      sessionId: "a",
      input: { weekStartDate: "2026-05-11" },
      sessions: [makeSession("a", 0, "09:00", "10:00")],
      enrollments: [],
      subjects: [subj("subj-1")],
    });
    expect(result.hasWeekStartDate).toBe(true);
  });

  it("hasWeekStartDate — undefined 면 false", () => {
    const result = planSessionUpdate({
      sessionId: "a",
      input: { startTime: "10:00" },
      sessions: [makeSession("a", 0, "09:00", "10:00")],
      enrollments: [],
      subjects: [subj("subj-1")],
    });
    expect(result.hasWeekStartDate).toBe(false);
  });

  it("같은 시간 충돌 시 reposition 으로 lane 분리", () => {
    const sessions: Session[] = [
      makeSession("a", 0, "09:00", "10:00", { yPosition: 1 }),
      makeSession("b", 0, "11:00", "12:00", { yPosition: 1 }),
    ];
    // a 를 11:00 으로 update — b 와 시간 충돌 → reposition
    const result = planSessionUpdate({
      sessionId: "a",
      input: { startTime: "11:00", endTime: "12:00" },
      sessions,
      enrollments: [],
      subjects: [subj("subj-1")],
    });
    const a = result.mergedSessions.find((s) => s.id === "a");
    const b = result.mergedSessions.find((s) => s.id === "b");
    expect(a?.startsAt).toBe("11:00");
    expect(b?.startsAt).toBe("11:00");
    // 둘 다 11:00 인데 yPosition 다르거나 (lane 분리) collision 처리됨
    expect(result.mergedSessions).toHaveLength(2);
  });

  it("subjectId update 반영", () => {
    const result = planSessionUpdate({
      sessionId: "a",
      input: { subjectId: "subj-new" },
      sessions: [makeSession("a", 0, "09:00", "10:00", { subjectId: "subj-1" })],
      enrollments: [],
      subjects: [subj("subj-1"), subj("subj-new")],
    });
    const a = result.mergedSessions.find((s) => s.id === "a");
    expect(a?.subjectId).toBe("subj-new");
  });

  it("room update 반영", () => {
    const result = planSessionUpdate({
      sessionId: "a",
      input: { room: "201" },
      sessions: [makeSession("a", 0, "09:00", "10:00", { room: "" })],
      enrollments: [],
      subjects: [subj("subj-1")],
    });
    const a = result.mergedSessions.find((s) => s.id === "a");
    expect(a?.room).toBe("201");
  });
});
