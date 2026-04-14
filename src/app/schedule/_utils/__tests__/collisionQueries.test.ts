import { describe, expect, it } from "vitest";
import { findCollidingSessionsImpl, checkCollisionsAtYPositionImpl } from "../collisionQueries";
import type { Session } from "../../../../lib/planner";

const makeSessions = (): Session[] => [
  { id: "s1", weekday: 1, startsAt: "09:00", endsAt: "10:00", yPosition: 1 },
  { id: "s2", weekday: 1, startsAt: "09:30", endsAt: "10:30", yPosition: 1 },
  { id: "s3", weekday: 1, startsAt: "11:00", endsAt: "12:00", yPosition: 2 },
  { id: "s4", weekday: 2, startsAt: "09:00", endsAt: "10:00", yPosition: 1 },
];

describe("findCollidingSessionsImpl", () => {
  it("같은 요일에서 겹치는 세션을 찾는다", () => {
    const result = findCollidingSessionsImpl(makeSessions(), 1, "09:00", "10:00");
    expect(result.map((s) => s.id)).toContain("s1");
    expect(result.map((s) => s.id)).toContain("s2");
  });

  it("다른 요일의 세션은 제외한다", () => {
    const result = findCollidingSessionsImpl(makeSessions(), 1, "09:00", "10:00");
    expect(result.map((s) => s.id)).not.toContain("s4");
  });

  it("excludeSessionId로 특정 세션을 제외한다", () => {
    const result = findCollidingSessionsImpl(makeSessions(), 1, "09:00", "10:00", "s1");
    expect(result.map((s) => s.id)).not.toContain("s1");
    expect(result.map((s) => s.id)).toContain("s2");
  });

  it("겹치지 않는 시간대는 빈 배열을 반환한다", () => {
    const result = findCollidingSessionsImpl(makeSessions(), 1, "13:00", "14:00");
    expect(result).toHaveLength(0);
  });
});

describe("checkCollisionsAtYPositionImpl", () => {
  it("같은 yPosition에서 겹치는 세션이 있으면 true를 반환한다", () => {
    const map = new Map<number, Session[]>();
    map.set(1, [
      { id: "s1", weekday: 1, startsAt: "09:00", endsAt: "10:00", yPosition: 1 },
    ]);

    const result = checkCollisionsAtYPositionImpl(map, 1, "09:30", "10:30");
    expect(result).toBe(true);
  });

  it("겹치지 않으면 false를 반환한다", () => {
    const map = new Map<number, Session[]>();
    map.set(1, [
      { id: "s1", weekday: 1, startsAt: "09:00", endsAt: "10:00", yPosition: 1 },
    ]);

    const result = checkCollisionsAtYPositionImpl(map, 1, "10:00", "11:00");
    expect(result).toBe(false);
  });

  it("해당 yPosition에 세션이 없으면 false를 반환한다", () => {
    const map = new Map<number, Session[]>();
    const result = checkCollisionsAtYPositionImpl(map, 5, "09:00", "10:00");
    expect(result).toBe(false);
  });

  it("priorityLevel 필터가 동작한다", () => {
    const map = new Map<number, (Session & { priorityLevel?: number })[]>();
    map.set(1, [
      { id: "s1", weekday: 1, startsAt: "09:00", endsAt: "10:00", yPosition: 1, priorityLevel: 1 },
      { id: "s2", weekday: 1, startsAt: "09:00", endsAt: "10:00", yPosition: 1, priorityLevel: 2 },
    ]);

    const result = checkCollisionsAtYPositionImpl(map, 1, "09:00", "10:00", true);
    expect(result).toBe(true);
  });
});
