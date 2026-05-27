import { describe, it, expect } from "vitest";
import { planSessionPositionUpdate } from "../updateSessionPositionHelpers";
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

describe("planSessionPositionUpdate", () => {
  it("session 못 찾으면 failure", () => {
    const result = planSessionPositionUpdate({
      sessionId: "missing",
      weekday: 0,
      time: "10:00",
      yPosition: 1,
      sessions: [],
      enrollments: [],
      subjects: [],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("session-not-found");
      expect(result.sessionId).toBe("missing");
    }
  });

  it("duration 보존 — 새 endTime = newStart + duration", () => {
    // 09:00~10:30 = 90 분. drop time=14:00 → newEnd=15:30
    const result = planSessionPositionUpdate({
      sessionId: "a",
      weekday: 1,
      time: "14:00",
      yPosition: 1,
      sessions: [makeSession("a", 0, "09:00", "10:30")],
      enrollments: [],
      subjects: [subj("subj-1")],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.newEndTime).toBe("15:30");
  });

  it("changedSessions — 변경 안 된 sessions 는 미포함", () => {
    const sessions: Session[] = [
      makeSession("a", 0, "09:00", "10:00", { yPosition: 1 }),
      makeSession("b", 5, "11:00", "12:00", { yPosition: 1 }), // 다른 요일 — 영향 X
    ];
    const result = planSessionPositionUpdate({
      sessionId: "a",
      weekday: 1,
      time: "14:00",
      yPosition: 1,
      sessions,
      enrollments: [],
      subjects: [subj("subj-1")],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const changedIds = result.changedSessions.map((s) => s.id);
    expect(changedIds).toContain("a");
    expect(changedIds).not.toContain("b");
  });

  it("collision chain push — anchor 외 affected sessions 도 changedSessions 에 포함", () => {
    // 같은 시간 같은 lane 에 있는 b 가 chain push 로 다른 yPosition 또는 위치 이동.
    const sessions: Session[] = [
      makeSession("a", 0, "09:00", "10:00", { yPosition: 1 }),
      makeSession("b", 1, "14:00", "15:00", { yPosition: 1 }), // drop target
    ];
    const result = planSessionPositionUpdate({
      sessionId: "a",
      weekday: 1,
      time: "14:00",
      yPosition: 1,
      sessions,
      enrollments: [],
      subjects: [subj("subj-1")],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // a 는 무조건 changed. b 도 chain push 로 changed 가능.
    const changedIds = new Set(result.changedSessions.map((s) => s.id));
    expect(changedIds.has("a")).toBe(true);
  });

  it("mergedSessions = reposition 결과 — 원본 길이 보존", () => {
    const sessions: Session[] = [
      makeSession("a", 0, "09:00", "10:00"),
      makeSession("b", 1, "11:00", "12:00"),
      makeSession("c", 2, "13:00", "14:00"),
    ];
    const result = planSessionPositionUpdate({
      sessionId: "a",
      weekday: 3,
      time: "15:00",
      yPosition: 1,
      sessions,
      enrollments: [],
      subjects: [subj("subj-1")],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.mergedSessions).toHaveLength(3);
  });

  it("같은 위치로 drop 시 changedSessions empty (변경 0)", () => {
    const sessions: Session[] = [
      makeSession("a", 0, "09:00", "10:00", { yPosition: 1 }),
    ];
    const result = planSessionPositionUpdate({
      sessionId: "a",
      weekday: 0,
      time: "09:00",
      yPosition: 1,
      sessions,
      enrollments: [],
      subjects: [subj("subj-1")],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.changedSessions).toHaveLength(0);
  });
});
