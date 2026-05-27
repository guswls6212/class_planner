import { describe, it, expect } from "vitest";
import { planBulkSessionDrop } from "../sessionDropHelpers";
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

describe("planBulkSessionDrop", () => {
  it("canManage=false → failure (no-permission)", () => {
    const result = planBulkSessionDrop({
      canManage: false,
      sessions: [],
      enrollments: [],
      subjects: [],
      anchorSessionId: "a",
      newWeekday: 0,
      newTime: "10:00",
      newYPosition: 1,
      selectedSessionIds: ["a"],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("no-permission");
  });

  it("3개 선택 일괄 이동 — 모두 같은 delta 적용", () => {
    const sessions: Session[] = [
      makeSession("a", 0, "09:00", "10:00"), // anchor
      makeSession("b", 0, "11:00", "12:00"),
      makeSession("c", 1, "13:00", "14:00"),
    ];
    const result = planBulkSessionDrop({
      canManage: true,
      sessions,
      enrollments: [],
      subjects: [subj("subj-1")],
      anchorSessionId: "a",
      newWeekday: 2, // delta +2
      newTime: "11:00", // delta +120min
      newYPosition: 1,
      selectedSessionIds: ["a", "b", "c"],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.movedCount).toBe(3);
    expect(result.outOfRange).toBe(0);
    expect(result.moves).toHaveLength(3);

    const byId = new Map(result.moves.map((m) => [m.session.id, m]));
    expect(byId.get("a")).toMatchObject({
      weekday: 2,
      startsAt: "11:00",
      endsAt: "12:00",
    });
    expect(byId.get("b")).toMatchObject({
      weekday: 2,
      startsAt: "13:00",
      endsAt: "14:00",
    });
    expect(byId.get("c")).toMatchObject({
      weekday: 3,
      startsAt: "15:00",
      endsAt: "16:00",
    });
  });

  it("updatedSessions — moves 적용된 sessions 반환", () => {
    const sessions: Session[] = [
      makeSession("a", 0, "09:00", "10:00", { yPosition: 1 }),
      makeSession("b", 0, "11:00", "12:00", { yPosition: 1 }),
    ];
    const result = planBulkSessionDrop({
      canManage: true,
      sessions,
      enrollments: [],
      subjects: [subj("subj-1")],
      anchorSessionId: "a",
      newWeekday: 2,
      newTime: "14:00",
      newYPosition: 1,
      selectedSessionIds: ["a", "b"],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.updatedSessions).toHaveLength(2);
    const sessionA = result.updatedSessions.find((s) => s.id === "a");
    expect(sessionA).toMatchObject({
      weekday: 2,
      startsAt: "14:00",
      endsAt: "15:00",
    });
  });

  it("자정 이전 → outOfRange + moves 에서 제외", () => {
    const sessions: Session[] = [
      makeSession("a", 0, "09:00", "10:00", { yPosition: 2 }),
      makeSession("b", 0, "08:00", "09:00", { yPosition: 1 }),
    ];
    // anchor=a(09:00), newTime=00:30 → delta=-510min
    // a: 09:00 → 00:30 ≥ 0 → OK
    // b: 08:00 → -30min < 0 → outOfRange
    const result = planBulkSessionDrop({
      canManage: true,
      sessions,
      enrollments: [],
      subjects: [subj("subj-1")],
      anchorSessionId: "a",
      newWeekday: 0,
      newTime: "00:30",
      newYPosition: 1,
      selectedSessionIds: ["a", "b"],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.outOfRange).toBe(1);
    expect(result.movedCount).toBe(1);
    expect(result.moves[0].session.id).toBe("a");
  });

  it("anchor not in selectedSessionIds → moves 0 (computeBulkMoveTargets 의 anchor 검증)", () => {
    const sessions: Session[] = [
      makeSession("a", 0, "09:00", "10:00"),
      makeSession("b", 0, "11:00", "12:00"),
    ];
    const result = planBulkSessionDrop({
      canManage: true,
      sessions,
      enrollments: [],
      subjects: [subj("subj-1")],
      anchorSessionId: "a",
      newWeekday: 2,
      newTime: "13:00",
      newYPosition: 1,
      selectedSessionIds: ["b"], // anchor=a 누락
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.movedCount).toBe(0);
  });

  it("sequential reposition — anchor 먼저, follower yPos asc 순서", () => {
    // 같은 (weekday, time) 으로 떨어지는 case — reposition chain 이 lane 분리.
    // anchor=a(yPos=2), b(yPos=1) follower → orderedMoves 는 a 먼저, b 두번째.
    const sessions: Session[] = [
      makeSession("a", 0, "09:00", "10:00", { yPosition: 2 }),
      makeSession("b", 0, "11:00", "12:00", { yPosition: 1 }),
      // 같은 시간 타겟에 이미 있는 session — collision chain push 대상
      makeSession("c", 2, "13:00", "14:00", { yPosition: 1 }),
    ];
    const result = planBulkSessionDrop({
      canManage: true,
      sessions,
      enrollments: [],
      subjects: [subj("subj-1")],
      anchorSessionId: "a",
      newWeekday: 2,
      newTime: "13:00",
      newYPosition: 1,
      selectedSessionIds: ["a", "b"],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.movedCount).toBe(2);
    // updatedSessions 의 a, b 가 reposition 후 lane 분리되어야 함
    const a = result.updatedSessions.find((s) => s.id === "a");
    const b = result.updatedSessions.find((s) => s.id === "b");
    expect(a?.weekday).toBe(2);
    expect(b?.weekday).toBe(2);
  });
});
