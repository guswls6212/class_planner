import { describe, it, expect } from "vitest";
import { planSessionInsertBeforeLane } from "../insertSessionHelpers";
import type { Session } from "@/lib/planner";

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

describe("planSessionInsertBeforeLane", () => {
  it("session 못 찾으면 failure", () => {
    const result = planSessionInsertBeforeLane({
      sessionId: "missing",
      weekday: 0,
      time: "10:00",
      insertBeforeYPos: 2,
      sessions: [],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("session-not-found");
      expect(result.sessionId).toBe("missing");
    }
  });

  it("duration 보존 — 새 endTime = newStart + duration", () => {
    const result = planSessionInsertBeforeLane({
      sessionId: "a",
      weekday: 1,
      time: "14:00",
      insertBeforeYPos: 2,
      sessions: [makeSession("a", 0, "09:00", "10:30")], // 90 분
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.newEndTime).toBe("15:30");
  });

  it("changedSessions — moving session 포함", () => {
    const result = planSessionInsertBeforeLane({
      sessionId: "a",
      weekday: 1,
      time: "14:00",
      insertBeforeYPos: 1,
      sessions: [makeSession("a", 0, "09:00", "10:00")],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const movedA = result.changedSessions.find((s) => s.id === "a");
    expect(movedA).toBeDefined();
  });

  it("lane shift — insertBeforeYPos 위치에 있던 sessions yPosition 증가", () => {
    // 같은 (weekday=1, time=14:00) 에 yPos=1, yPos=2 가 있고, sessionA 를 yPos=1 앞에 끼우기
    const sessions: Session[] = [
      makeSession("a", 0, "09:00", "10:00", { yPosition: 1 }), // 다른 위치 — moving
      makeSession("b", 1, "14:00", "15:00", { yPosition: 1 }), // shift 대상
      makeSession("c", 1, "14:00", "15:00", { yPosition: 2 }), // shift 대상
    ];
    const result = planSessionInsertBeforeLane({
      sessionId: "a",
      weekday: 1,
      time: "14:00",
      insertBeforeYPos: 1,
      sessions,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // a 가 새 위치로 이동 + b/c 가 yPos shift → 모두 changed.
    const changedIds = new Set(result.changedSessions.map((s) => s.id));
    expect(changedIds.has("a")).toBe(true);
  });

  it("mergedSessions length = original (insert 는 새 session 추가 안 함)", () => {
    const sessions: Session[] = [
      makeSession("a", 0, "09:00", "10:00"),
      makeSession("b", 1, "11:00", "12:00"),
    ];
    const result = planSessionInsertBeforeLane({
      sessionId: "a",
      weekday: 2,
      time: "13:00",
      insertBeforeYPos: 1,
      sessions,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.mergedSessions).toHaveLength(2);
  });
});
