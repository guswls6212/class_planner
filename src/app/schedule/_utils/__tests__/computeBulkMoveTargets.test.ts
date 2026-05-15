import { describe, it, expect } from "vitest";
import {
  applyBulkMoves,
  computeBulkMoveTargets,
  type BulkMoveTarget,
} from "../computeBulkMoveTargets";
import type { Session } from "@/lib/planner";

const make = (
  id: string,
  weekday: number,
  startsAt: string,
  endsAt: string,
  yPosition = 1,
): Session =>
  ({
    id,
    weekday,
    startsAt,
    endsAt,
    yPosition,
    enrollmentIds: [],
    weekStartDate: "2026-05-04",
  }) as Session;

describe("computeBulkMoveTargets", () => {
  it("anchor만 선택 — anchor만 새 위치로", () => {
    const sessions = [
      make("a", 0, "09:00", "10:00"),
      make("b", 1, "11:00", "12:00"),
    ];
    const result = computeBulkMoveTargets({
      sessions,
      anchorSessionId: "a",
      newWeekday: 2,
      newTime: "10:00",
      newYPosition: 2,
      selectedIds: ["a"],
    });
    expect(result.outOfRange).toBe(0);
    expect(result.moves).toHaveLength(1);
    expect(result.moves[0]).toMatchObject({
      weekday: 2,
      startsAt: "10:00",
      endsAt: "11:00",
      yPosition: 2,
    });
  });

  it("3개 선택 — 모두 같은 delta 적용", () => {
    const sessions = [
      make("a", 0, "09:00", "10:00"), // anchor (월 09:00)
      make("b", 0, "11:00", "12:00"), // 월 11:00
      make("c", 2, "14:00", "15:00"), // 수 14:00
    ];
    const result = computeBulkMoveTargets({
      sessions,
      anchorSessionId: "a",
      newWeekday: 1, // 화요일 (delta +1)
      newTime: "10:00", // delta +60min
      newYPosition: 1,
      selectedIds: ["a", "b", "c"],
    });
    expect(result.moves).toHaveLength(3);
    expect(result.outOfRange).toBe(0);
    const byId = new Map(result.moves.map((m) => [m.session.id, m]));
    expect(byId.get("a")).toMatchObject({ weekday: 1, startsAt: "10:00", endsAt: "11:00" });
    expect(byId.get("b")).toMatchObject({ weekday: 1, startsAt: "12:00", endsAt: "13:00" });
    expect(byId.get("c")).toMatchObject({ weekday: 3, startsAt: "15:00", endsAt: "16:00" });
  });

  it("같은 시간 다른 lane (이전엔 false positive 충돌) — 이제 정상 이동 (회귀)", () => {
    // Bug fix 회귀: 사용자가 2개 선택 후 빈 슬롯 옆 시간대(다른 lane) drop 시
    // 이전엔 yPosition 무시한 충돌 검사가 둘 다 거부했음. 이제 충돌 검사 제거됐으므로
    // 같은 시간 다른 lane sessions와 충돌해도 정상 이동되어야 함.
    const sessions = [
      make("a", 0, "09:00", "10:00", 1),
      make("b", 0, "11:00", "12:00", 1),
      // 이미 lane 1에 있는 다른 (선택되지 않은) sessions — 새 위치(11:00)에 시간 겹침
      make("other", 0, "11:00", "12:00", 1),
    ];
    const result = computeBulkMoveTargets({
      sessions,
      anchorSessionId: "a",
      newWeekday: 0,
      newTime: "11:00",
      newYPosition: 2, // anchor → lane 2
      selectedIds: ["a", "b"],
    });
    expect(result.outOfRange).toBe(0);
    expect(result.moves).toHaveLength(2); // ❗ 둘 다 적용 — 충돌 false positive 회귀 방지
  });

  it("자정 이전(음수 시간) — outOfRange로 분류, moves 제외", () => {
    const sessions = [make("a", 0, "01:00", "02:00")];
    const result = computeBulkMoveTargets({
      sessions,
      anchorSessionId: "a",
      newWeekday: 0,
      newTime: "00:00", // delta -60min — 음수
      newYPosition: 1,
      selectedIds: ["a"],
    });
    // a → -01:00이 되므로 outOfRange (즉 "00:00" 자체는 OK이지만 anchor가 그 위치이므로 delta=-60, 그 안에서 그대로 적용은 됨)
    // 다시 검증 — anchor newTime=00:00이므로 a의 새 위치 = 00:00 (정상)
    expect(result.outOfRange).toBe(0);
    expect(result.moves).toHaveLength(1);
  });

  it("delta 음수로 a가 자정 이전으로 떨어짐", () => {
    const sessions = [
      make("a", 0, "01:00", "02:00"), // anchor
      make("b", 0, "00:30", "01:30"), // anchor보다 일찍 시작 — delta 적용 시 음수
    ];
    const result = computeBulkMoveTargets({
      sessions,
      anchorSessionId: "a",
      newWeekday: 0,
      newTime: "00:30", // delta -30min
      newYPosition: 1,
      selectedIds: ["a", "b"],
    });
    // a: 01:00 - 30min = 00:30 OK
    // b: 00:30 - 30min = 00:00 OK (정상 — 음수 아님)
    expect(result.moves).toHaveLength(2);
    expect(result.outOfRange).toBe(0);
  });

  it("anchor 자체가 음수 시간으로 → 모두 outOfRange", () => {
    const sessions = [
      make("a", 0, "00:30", "01:00"), // anchor
      make("b", 0, "10:00", "11:00"),
    ];
    const result = computeBulkMoveTargets({
      sessions,
      anchorSessionId: "a",
      newWeekday: 0,
      newTime: "00:00", // delta -30min
      newYPosition: 1,
      selectedIds: ["a", "b"],
    });
    // a: 00:30 - 30 = 00:00 (정상)
    // b: 10:00 - 30 = 09:30 (정상)
    expect(result.moves).toHaveLength(2);
    expect(result.outOfRange).toBe(0);
  });

  it("anchorSessionId가 sessions에 없음 — empty 반환", () => {
    const sessions = [make("a", 0, "09:00", "10:00")];
    const result = computeBulkMoveTargets({
      sessions,
      anchorSessionId: "missing",
      newWeekday: 1,
      newTime: "10:00",
      newYPosition: 1,
      selectedIds: ["a"],
    });
    expect(result.moves).toEqual([]);
    expect(result.outOfRange).toBe(0);
  });

  it("weekday clamp (0~6) — 7+ 또는 음수는 경계로 잡힘", () => {
    const sessions = [
      make("a", 5, "09:00", "10:00"), // 토 anchor
      make("b", 6, "09:00", "10:00"), // 일 — delta +2면 weekday 8 → clamp 6
    ];
    const result = computeBulkMoveTargets({
      sessions,
      anchorSessionId: "a",
      newWeekday: 6, // delta +1 → 일
      newTime: "09:00",
      newYPosition: 1,
      selectedIds: ["a", "b"],
    });
    const byId = new Map(result.moves.map((m) => [m.session.id, m]));
    expect(byId.get("a")?.weekday).toBe(6);
    expect(byId.get("b")?.weekday).toBe(6); // clamp
  });

  // ── contiguous yPos 분배 정책 (2026-05-15 변경, Option D 폐기, adr/014) ──
  // 추종 sessions 을 원래 yPosition asc 로 정렬 후 anchor 의 group 내 상대 위치
  // 기준으로 contiguous yPos. anchor 가 group 어디에 있든 visual lane 순서 보존.

  it("contiguous — anchor 가 그룹 왼쪽 끝 (anchorRelIdx=0)", () => {
    // sortedByYPos = [a(yPos1, anchor), b(yPos3)], anchorRelIdx=0
    // newYPosition=5 → a=5, b=5+(1-0)=6
    const sessions = [
      make("a", 0, "09:00", "10:00", 1),
      make("b", 1, "09:00", "10:00", 3),
    ];
    const result = computeBulkMoveTargets({
      sessions,
      anchorSessionId: "a",
      newWeekday: 0,
      newTime: "10:00",
      newYPosition: 5,
      selectedIds: ["a", "b"],
    });
    const byId = new Map(result.moves.map((m) => [m.session.id, m]));
    expect(byId.get("a")?.yPosition).toBe(5);
    expect(byId.get("b")?.yPosition).toBe(6);
  });

  it("contiguous — anchor 가 그룹 오른쪽 끝 (사용자 보고 Case B 회귀 가드)", () => {
    // 5 sessions lane 1~5. anchor=가장 오른쪽 (lane 5). drop newYPosition=5.
    // sortedByYPos=[a,b,c,d,e], anchorRelIdx=4 (e)
    //   a=5+(0-4)=1, b=5+(1-4)=2, c=5+(2-4)=3, d=5+(3-4)=4, e=5
    // Group visual order (lane 1,2,3,4,5) 보존. PR #390 후 사용자 보고 Image 8/9.
    const sessions = [
      make("a", 0, "09:00", "10:00", 1),
      make("b", 0, "09:00", "10:00", 2),
      make("c", 0, "09:00", "10:00", 3),
      make("d", 0, "09:00", "10:00", 4),
      make("e", 0, "09:00", "10:00", 5),
    ];
    const result = computeBulkMoveTargets({
      sessions,
      anchorSessionId: "e",
      newWeekday: 1,
      newTime: "10:00",
      newYPosition: 5,
      selectedIds: ["a", "b", "c", "d", "e"],
    });
    const byId = new Map(result.moves.map((m) => [m.session.id, m]));
    expect(byId.get("a")?.yPosition).toBe(1);
    expect(byId.get("b")?.yPosition).toBe(2);
    expect(byId.get("c")?.yPosition).toBe(3);
    expect(byId.get("d")?.yPosition).toBe(4);
    expect(byId.get("e")?.yPosition).toBe(5);
  });

  it("contiguous — anchor 가 그룹 가운데 (anchorRelIdx=1)", () => {
    // sortedByYPos=[a(yPos1), b(yPos2, anchor), c(yPos3)], anchorRelIdx=1
    //   a=10+(0-1)=9, b=10 (anchor), c=10+(2-1)=11
    const sessions = [
      make("a", 0, "09:00", "10:00", 1),
      make("b", 0, "09:00", "10:00", 2),
      make("c", 0, "09:00", "10:00", 3),
    ];
    const result = computeBulkMoveTargets({
      sessions,
      anchorSessionId: "b",
      newWeekday: 0,
      newTime: "10:00",
      newYPosition: 10,
      selectedIds: ["a", "b", "c"],
    });
    const byId = new Map(result.moves.map((m) => [m.session.id, m]));
    expect(byId.get("a")?.yPosition).toBe(9);
    expect(byId.get("b")?.yPosition).toBe(10);
    expect(byId.get("c")?.yPosition).toBe(11);
  });

  it("contiguous — clamp >=1 (anchor lane 5, drop lane 1 → followers 음수 → 1 clamp)", () => {
    // 5 sessions, anchor=lane 5, drop newYPosition=1. follower 의 raw yPos:
    //   a=1+(0-4)=-3, b=1+(1-4)=-2, c=1+(2-4)=-1, d=1+(3-4)=0 → 모두 clamp to 1.
    // anchor=1. sequential repositionSessionsUtil 의 priority-based chain push
    // 가 충돌 해소. 위쪽 clamp (e.g. > maxLanes) 는 reposition 책임.
    const sessions = [
      make("a", 0, "09:00", "10:00", 1),
      make("b", 0, "09:00", "10:00", 2),
      make("c", 0, "09:00", "10:00", 3),
      make("d", 0, "09:00", "10:00", 4),
      make("e", 0, "09:00", "10:00", 5),
    ];
    const result = computeBulkMoveTargets({
      sessions,
      anchorSessionId: "e",
      newWeekday: 0,
      newTime: "10:00",
      newYPosition: 1,
      selectedIds: ["a", "b", "c", "d", "e"],
    });
    const byId = new Map(result.moves.map((m) => [m.session.id, m]));
    expect(byId.get("a")?.yPosition).toBe(1);
    expect(byId.get("b")?.yPosition).toBe(1);
    expect(byId.get("c")?.yPosition).toBe(1);
    expect(byId.get("d")?.yPosition).toBe(1);
    expect(byId.get("e")?.yPosition).toBe(1);
  });

  it("빈 selectedIds — empty moves", () => {
    const sessions = [make("a", 0, "09:00", "10:00")];
    const result = computeBulkMoveTargets({
      sessions,
      anchorSessionId: "a",
      newWeekday: 1,
      newTime: "10:00",
      newYPosition: 1,
      selectedIds: [],
    });
    expect(result.moves).toEqual([]);
  });
});

describe("applyBulkMoves — bulk drag race regression", () => {
  it("3개 moves 모두 단일 패스로 적용 (이전엔 closure race로 1개만 반영)", () => {
    const sessions = [
      make("a", 0, "09:00", "10:00"),
      make("b", 1, "11:00", "12:00"),
      make("c", 2, "14:00", "15:00"),
      make("d", 3, "16:00", "17:00"), // 선택 안 됨 — 그대로 유지
    ];
    const moves: BulkMoveTarget[] = [
      {
        session: sessions[0],
        weekday: 1,
        startsAt: "10:00",
        endsAt: "11:00",
        yPosition: 1,
      },
      {
        session: sessions[1],
        weekday: 2,
        startsAt: "12:00",
        endsAt: "13:00",
        yPosition: 1,
      },
      {
        session: sessions[2],
        weekday: 3,
        startsAt: "15:00",
        endsAt: "16:00",
        yPosition: 1,
      },
    ];
    const result = applyBulkMoves(sessions, moves);
    // 3개 sessions 모두 새 위치로 이동
    expect(result.find((s) => s.id === "a")).toMatchObject({
      weekday: 1,
      startsAt: "10:00",
      endsAt: "11:00",
    });
    expect(result.find((s) => s.id === "b")).toMatchObject({
      weekday: 2,
      startsAt: "12:00",
      endsAt: "13:00",
    });
    expect(result.find((s) => s.id === "c")).toMatchObject({
      weekday: 3,
      startsAt: "15:00",
      endsAt: "16:00",
    });
    // 선택되지 않은 d는 그대로
    expect(result.find((s) => s.id === "d")).toMatchObject({
      weekday: 3,
      startsAt: "16:00",
      endsAt: "17:00",
    });
    // 길이는 변하지 않음
    expect(result).toHaveLength(4);
  });

  it("빈 moves — sessions 그대로 반환", () => {
    const sessions = [make("a", 0, "09:00", "10:00")];
    expect(applyBulkMoves(sessions, [])).toBe(sessions);
  });

  it("anchor의 yPosition은 newYPosition, 다른 sessions은 move의 yPosition 유지", () => {
    const sessions = [make("a", 0, "09:00", "10:00", 1)];
    const moves: BulkMoveTarget[] = [
      {
        session: sessions[0],
        weekday: 0,
        startsAt: "10:00",
        endsAt: "11:00",
        yPosition: 5, // anchor의 newYPosition
      },
    ];
    const result = applyBulkMoves(sessions, moves);
    expect(result[0].yPosition).toBe(5);
  });
});
