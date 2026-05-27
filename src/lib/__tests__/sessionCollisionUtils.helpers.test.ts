/**
 * sessionCollisionUtils.helpers.test: ADR-002 Cohesion Sweep #3 helpers unit test.
 *
 * buildDaySessionsMap + compactYPositions 의 회귀 가드 — repositionSessions
 * 의 inline pattern 을 helper 로 추출하면서 동작 1:1 보존 검증.
 */
import { describe, expect, it } from "vitest";

import type { Session } from "../planner";
import {
  buildDaySessionsMap,
  compactYPositions,
  type SessionWithPriority,
} from "../sessionCollisionUtils";

function makeSession(
  props: Partial<Session> & { id: string; weekday: number },
): Session {
  return {
    startsAt: "09:00",
    endsAt: "10:00",
    enrollmentIds: [],
    ...props,
  } as Session;
}

describe("buildDaySessionsMap", () => {
  it("returns empty Map for empty input", () => {
    expect(buildDaySessionsMap([], 1).size).toBe(0);
  });

  it("filters by weekday — only matching weekday entries included", () => {
    const sessions = [
      makeSession({ id: "a", weekday: 1, yPosition: 1 }),
      makeSession({ id: "b", weekday: 2, yPosition: 1 }),
      makeSession({ id: "c", weekday: 1, yPosition: 2 }),
    ];
    const result = buildDaySessionsMap(sessions, 1);
    expect(result.get(1)?.map((s) => s.id)).toEqual(["a"]);
    expect(result.get(2)?.map((s) => s.id)).toEqual(["c"]);
    expect(result.has(3)).toBe(false);
  });

  it("excludes session matching excludeId", () => {
    const sessions = [
      makeSession({ id: "moving", weekday: 1, yPosition: 1 }),
      makeSession({ id: "other", weekday: 1, yPosition: 1 }),
    ];
    const result = buildDaySessionsMap(sessions, 1, "moving");
    expect(result.get(1)?.map((s) => s.id)).toEqual(["other"]);
  });

  it("normalizes yPosition: undefined → 1", () => {
    const sessions = [makeSession({ id: "a", weekday: 1 })];
    const result = buildDaySessionsMap(sessions, 1);
    expect(result.get(1)?.[0]?.id).toBe("a");
  });

  it("normalizes yPosition: 0 → 1 (preserves legacy `|| 1` behavior)", () => {
    const sessions = [makeSession({ id: "a", weekday: 1, yPosition: 0 })];
    const result = buildDaySessionsMap(sessions, 1);
    expect(result.get(1)?.[0]?.id).toBe("a");
    expect(result.has(0)).toBe(false);
  });

  it("groups multiple sessions at same yPosition in input order", () => {
    const sessions = [
      makeSession({ id: "a", weekday: 1, yPosition: 2 }),
      makeSession({ id: "b", weekday: 1, yPosition: 2 }),
      makeSession({ id: "c", weekday: 1, yPosition: 1 }),
    ];
    const result = buildDaySessionsMap(sessions, 1);
    expect(result.get(2)?.map((s) => s.id)).toEqual(["a", "b"]);
    expect(result.get(1)?.map((s) => s.id)).toEqual(["c"]);
  });

  it("attaches priorityLevel: 0 to every entry", () => {
    const sessions = [
      makeSession({ id: "a", weekday: 1, yPosition: 1 }),
      makeSession({ id: "b", weekday: 1, yPosition: 2 }),
    ];
    const result = buildDaySessionsMap(sessions, 1);
    expect(result.get(1)?.[0]?.priorityLevel).toBe(0);
    expect(result.get(2)?.[0]?.priorityLevel).toBe(0);
  });

  it("undefined excludeId behaves same as no excludeId", () => {
    const sessions = [
      makeSession({ id: "a", weekday: 1, yPosition: 1 }),
      makeSession({ id: "b", weekday: 1, yPosition: 1 }),
    ];
    const withUndef = buildDaySessionsMap(sessions, 1, undefined);
    const without = buildDaySessionsMap(sessions, 1);
    expect(withUndef.get(1)?.map((s) => s.id)).toEqual(
      without.get(1)?.map((s) => s.id),
    );
  });
});

describe("compactYPositions", () => {
  function entry(
    id: string,
    yPosition: number,
    priorityLevel = 0,
  ): SessionWithPriority {
    return {
      ...makeSession({ id, weekday: 1, yPosition }),
      priorityLevel,
    };
  }

  it("returns empty array for empty Map", () => {
    expect(compactYPositions(new Map())).toEqual([]);
  });

  it("compacts non-contiguous yPositions to 1-indexed contiguous", () => {
    const map = new Map<number, SessionWithPriority[]>();
    map.set(1, [entry("a", 1)]);
    map.set(5, [entry("b", 5)]);
    map.set(10, [entry("c", 10)]);

    const result = compactYPositions(map);
    expect(result.map((s) => ({ id: s.id, yPosition: s.yPosition }))).toEqual([
      { id: "a", yPosition: 1 },
      { id: "b", yPosition: 2 },
      { id: "c", yPosition: 3 },
    ]);
  });

  it("skips empty lists when compacting indices", () => {
    const map = new Map<number, SessionWithPriority[]>();
    map.set(1, [entry("a", 1)]);
    map.set(2, []); // empty — skipped, doesn't bump compactIdx
    map.set(3, [entry("b", 3)]);

    const result = compactYPositions(map);
    expect(result.map((s) => s.id)).toEqual(["a", "b"]);
    expect(result.map((s) => s.yPosition)).toEqual([1, 2]);
  });

  it("removes priorityLevel from output", () => {
    const map = new Map<number, SessionWithPriority[]>();
    map.set(1, [entry("a", 1, 5)]);

    const result = compactYPositions(map);
    expect("priorityLevel" in result[0]).toBe(false);
  });

  it("preserves all other Session properties", () => {
    const session = makeSession({
      id: "a",
      weekday: 3,
      yPosition: 5,
      startsAt: "13:00",
      endsAt: "14:30",
      enrollmentIds: ["e1", "e2"],
    });
    const map = new Map<number, SessionWithPriority[]>();
    map.set(5, [{ ...session, priorityLevel: 2 }]);

    const result = compactYPositions(map);
    expect(result[0]).toEqual({
      id: "a",
      weekday: 3,
      yPosition: 1, // compacted from 5
      startsAt: "13:00",
      endsAt: "14:30",
      enrollmentIds: ["e1", "e2"],
    });
  });

  it("keeps multiple sessions at same yPos with same compactIdx in original order", () => {
    const map = new Map<number, SessionWithPriority[]>();
    map.set(1, [entry("a", 1), entry("b", 1)]);

    const result = compactYPositions(map);
    expect(result.map((s) => s.id)).toEqual(["a", "b"]);
    expect(result.every((s) => s.yPosition === 1)).toBe(true);
  });

  it("processes keys in ascending order regardless of insertion order", () => {
    const map = new Map<number, SessionWithPriority[]>();
    map.set(10, [entry("late", 10)]);
    map.set(1, [entry("early", 1)]);
    map.set(5, [entry("mid", 5)]);

    const result = compactYPositions(map);
    expect(result.map((s) => s.id)).toEqual(["early", "mid", "late"]);
    expect(result.map((s) => s.yPosition)).toEqual([1, 2, 3]);
  });
});
