import { describe, expect, it } from "vitest";
import type { Session } from "../planner";
import { insertSessionAtLane } from "../laneInsert";

const session = (
  id: string,
  weekday: number,
  yPosition: number,
  startsAt: string,
  endsAt: string,
): Session => ({
  id,
  weekday,
  startsAt,
  endsAt,
  yPosition,
  enrollmentIds: [],
  room: "",
  weekStartDate: "",
});

describe("insertSessionAtLane — Variant E (Edge Hover Slot)", () => {
  it("5번 학생 시나리오: lane 1 (12:00) → lane 2 사이 (10:00), 같은 시간 lane 깨끗 shift", () => {
    const base: Session[] = [
      session("s1", 1, 1, "10:00", "11:00"), // 1번 lane 1
      session("s2", 1, 2, "10:00", "11:00"), // 2번 lane 2
      session("s3", 1, 3, "10:00", "11:00"), // 3번 lane 3
      session("s4", 1, 4, "10:00", "11:00"), // 4번 lane 4
      session("s5", 1, 1, "12:00", "13:00"), // 5번 lane 1 (다른 시간)
    ];

    const result = insertSessionAtLane(base, 1, "10:00", "11:00", 2, "s5");

    // 10:00-11:00 lane 별로 정렬
    const at10 = result
      .filter((s) => s.weekday === 1 && s.startsAt === "10:00")
      .sort((a, b) => (a.yPosition ?? 0) - (b.yPosition ?? 0));
    expect(at10.map((s) => `${s.id}@${s.yPosition}`)).toEqual([
      "s1@1",
      "s5@2", // 5번이 깨끗하게 lane 2 차지
      "s2@3",
      "s3@4",
      "s4@5",
    ]);

    // 같은 yPosition stack 없음
    const yPositions = at10.map((s) => s.yPosition);
    expect(new Set(yPositions).size).toBe(yPositions.length);
  });

  it("같은 요일 같은 시간 lane > insertBeforeYPos 세션만 shift, < 인 세션은 그대로", () => {
    const base: Session[] = [
      session("a", 1, 1, "10:00", "11:00"),
      session("b", 1, 2, "10:00", "11:00"),
      session("c", 1, 3, "10:00", "11:00"),
      session("mover", 0, 1, "10:00", "11:00"), // 다른 요일
    ];
    const result = insertSessionAtLane(base, 1, "10:00", "11:00", 2, "mover");
    const ids = result
      .filter((s) => s.weekday === 1)
      .sort((a, b) => (a.yPosition ?? 0) - (b.yPosition ?? 0))
      .map((s) => `${s.id}@${s.yPosition}`);
    expect(ids).toEqual(["a@1", "mover@2", "b@3", "c@4"]);
  });

  it("시간 겹침 없는 같은 요일 세션은 shift 영향 받지 않음", () => {
    const base: Session[] = [
      session("morning1", 1, 1, "10:00", "11:00"),
      session("morning2", 1, 2, "10:00", "11:00"),
      session("evening1", 1, 1, "18:00", "19:00"), // 다른 시간 lane 1
      session("evening2", 1, 2, "18:00", "19:00"), // 다른 시간 lane 2
      session("mover", 0, 1, "10:00", "11:00"),
    ];
    const result = insertSessionAtLane(base, 1, "10:00", "11:00", 2, "mover");

    const evening1 = result.find((s) => s.id === "evening1");
    const evening2 = result.find((s) => s.id === "evening2");
    expect(evening1?.yPosition).toBe(1); // 변화 없음
    expect(evening2?.yPosition).toBe(2); // 변화 없음
  });

  it("cross-weekday 이동 시 source 요일 yPosition 압축", () => {
    const base: Session[] = [
      session("mover", 0, 2, "10:00", "11:00"), // 월요일 lane 2
      session("mon-other", 0, 4, "14:00", "15:00"), // 월요일 lane 4 (mover 가 비운 자리 위)
      session("tue-1", 1, 1, "10:00", "11:00"),
      session("tue-2", 1, 2, "10:00", "11:00"),
    ];
    const result = insertSessionAtLane(base, 1, "10:00", "11:00", 2, "mover");

    // source (월요일) 압축: mover 제거 후 mon-other 가 lane 1 로 (유일한 source 세션이므로)
    const monOther = result.find((s) => s.id === "mon-other");
    expect(monOther?.yPosition).toBe(1);

    // target (화요일) shift
    const tue = result
      .filter((s) => s.weekday === 1)
      .sort((a, b) => (a.yPosition ?? 0) - (b.yPosition ?? 0));
    expect(tue.map((s) => `${s.id}@${s.yPosition}`)).toEqual([
      "tue-1@1",
      "mover@2",
      "tue-2@3",
    ]);
  });

  it("insertBeforeYPos = 1 (가장 앞에 끼우기) — 모든 같은 시간 lane +1 shift", () => {
    const base: Session[] = [
      session("a", 1, 1, "10:00", "11:00"),
      session("b", 1, 2, "10:00", "11:00"),
      session("mover", 0, 1, "10:00", "11:00"),
    ];
    const result = insertSessionAtLane(base, 1, "10:00", "11:00", 1, "mover");
    const ids = result
      .filter((s) => s.weekday === 1)
      .sort((a, b) => (a.yPosition ?? 0) - (b.yPosition ?? 0))
      .map((s) => `${s.id}@${s.yPosition}`);
    expect(ids).toEqual(["mover@1", "a@2", "b@3"]);
  });

  it("insertBeforeYPos = lane 끝+1 (가장 뒤에 끼우기) — shift 없음, mover 만 마지막 lane", () => {
    const base: Session[] = [
      session("a", 1, 1, "10:00", "11:00"),
      session("b", 1, 2, "10:00", "11:00"),
      session("mover", 0, 1, "10:00", "11:00"),
    ];
    const result = insertSessionAtLane(base, 1, "10:00", "11:00", 3, "mover");
    const ids = result
      .filter((s) => s.weekday === 1)
      .sort((a, b) => (a.yPosition ?? 0) - (b.yPosition ?? 0))
      .map((s) => `${s.id}@${s.yPosition}`);
    expect(ids).toEqual(["a@1", "b@2", "mover@3"]);
  });

  it("movingSessionId 가 sessions 에 없으면 변경 없이 그대로 반환", () => {
    const base: Session[] = [session("a", 1, 1, "10:00", "11:00")];
    const result = insertSessionAtLane(base, 1, "10:00", "11:00", 1, "nope");
    expect(result).toBe(base);
  });

  it("같은 요일에서 lane 3 → lane 6 (rightmost 뒤) 이동 시 source 빈 lane 압축 (omni-radar 2026-05-14)", () => {
    // 사용자 보고: 5번이 lane 3 인 상태 (1, 2, 5, 3, 4) 에서 5번을 4번 (lane 5) 뒤로
    // 이동. insertBeforeYPos = 6. 단순 shift 만으론 lane 3 빈 자리 + 5번 yPos 6 (
    // effectiveLanes=5 밖) 으로 hidden. compaction 적용 시 5번 lane 5 로 압축.
    const base: Session[] = [
      session("s1", 1, 1, "10:00", "11:00"), // 1번
      session("s2", 1, 2, "10:00", "11:00"), // 2번
      session("s5", 1, 3, "10:00", "11:00"), // 5번 (이동 대상)
      session("s3", 1, 4, "10:00", "11:00"), // 3번
      session("s4", 1, 5, "10:00", "11:00"), // 4번
    ];
    const result = insertSessionAtLane(base, 1, "10:00", "11:00", 6, "s5");

    const byLane = result
      .filter((s) => s.weekday === 1)
      .sort((a, b) => (a.yPosition ?? 0) - (b.yPosition ?? 0))
      .map((s) => `${s.id}@${s.yPosition}`);
    // 5번이 마지막 lane 으로, 빈 자리 압축 — 사용자 expected: 1, 2, 3, 4, 5번 순.
    expect(byLane).toEqual(["s1@1", "s2@2", "s3@3", "s4@4", "s5@5"]);
  });

  it("같은 요일에서 lane 1 → lane 5 (rightmost 끝) 이동 — 모두 compaction", () => {
    const base: Session[] = [
      session("a", 1, 1, "10:00", "11:00"),
      session("b", 1, 2, "10:00", "11:00"),
      session("c", 1, 3, "10:00", "11:00"),
      session("d", 1, 4, "10:00", "11:00"),
    ];
    const result = insertSessionAtLane(base, 1, "10:00", "11:00", 5, "a");
    const byLane = result
      .filter((s) => s.weekday === 1)
      .sort((a, b) => (a.yPosition ?? 0) - (b.yPosition ?? 0))
      .map((s) => `${s.id}@${s.yPosition}`);
    expect(byLane).toEqual(["b@1", "c@2", "d@3", "a@4"]);
  });
});
