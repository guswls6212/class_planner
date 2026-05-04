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

  it("anchor의 yPosition은 newYPosition, 추종 sessions은 yPosition=1 강제 (Option D)", () => {
    // 정책 (2026-05-04 사용자 제안): 추종 sessions은 lane 제일 왼쪽(1)에 배치 →
    // 사용자가 한 눈에 \"같이 따라왔다\"고 인지 가능. 원래 yPosition은 무시.
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
    expect(byId.get("a")?.yPosition).toBe(5); // anchor: 정확한 drop yPosition
    expect(byId.get("b")?.yPosition).toBe(1); // 추종: lane 1 강제 (이전 3 → 1)
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
