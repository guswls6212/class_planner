/**
 * useGlobalDataInitialization.helpers.test: ADR-002 Cohesion Sweep #6 helper unit test.
 *
 * findMostRecentEntity 의 pure logic 검증 — debug 로그용 max(updatedAt) entity 요약.
 */
import { describe, expect, it } from "vitest";

import { findMostRecentEntity } from "../useGlobalDataInitialization";

describe("findMostRecentEntity", () => {
  it("returns null fields for empty array", () => {
    expect(findMostRecentEntity([], "students")).toEqual({
      label: "students",
      count: 0,
      mostRecentId: null,
      mostRecentName: null,
      mostRecentUpdatedAt: null,
    });
  });

  it("returns the entity with max updatedAt", () => {
    const arr = [
      { id: "a", name: "Alpha", updatedAt: "2026-05-01T10:00:00Z" },
      { id: "b", name: "Beta", updatedAt: "2026-05-15T10:00:00Z" },
      { id: "c", name: "Gamma", updatedAt: "2026-05-10T10:00:00Z" },
    ];
    expect(findMostRecentEntity(arr, "subjects")).toEqual({
      label: "subjects",
      count: 3,
      mostRecentId: "b",
      mostRecentName: "Beta",
      mostRecentUpdatedAt: "2026-05-15T10:00:00Z",
    });
  });

  it("skips entities without updatedAt (treats as ts=0)", () => {
    const arr = [
      { id: "a", name: "no-time" }, // no updatedAt
      { id: "b", name: "with-time", updatedAt: "2026-05-15T10:00:00Z" },
    ];
    const result = findMostRecentEntity(arr, "teachers");
    expect(result.mostRecentId).toBe("b");
    expect(result.mostRecentName).toBe("with-time");
  });

  it("returns null name when entity lacks name field", () => {
    const arr = [
      { id: "enr-1", updatedAt: "2026-05-01T10:00:00Z" }, // no name (e.g., Enrollment)
    ];
    expect(findMostRecentEntity(arr, "enrollments")).toEqual({
      label: "enrollments",
      count: 1,
      mostRecentId: "enr-1",
      mostRecentName: null,
      mostRecentUpdatedAt: "2026-05-01T10:00:00Z",
    });
  });

  it("returns null id when entity lacks id field", () => {
    const arr = [
      { name: "Alpha", updatedAt: "2026-05-01T10:00:00Z" },
    ];
    const result = findMostRecentEntity(arr, "students");
    expect(result.mostRecentId).toBe(null);
    expect(result.mostRecentName).toBe("Alpha");
  });

  it("preserves count even when no entity has updatedAt — first entity wins (ts=0 > -Infinity)", () => {
    const arr = [
      { id: "a", name: "Alpha" },
      { id: "b", name: "Beta" },
    ];
    const result = findMostRecentEntity(arr, "sessions");
    expect(result.count).toBe(2);
    // First entity wins on initial -Infinity comparison; later ts=0 don't beat (strict >).
    expect(result.mostRecentId).toBe("a");
    expect(result.mostRecentName).toBe("Alpha");
    // No updatedAt on winning entity → null.
    expect(result.mostRecentUpdatedAt).toBe(null);
  });

  it("handles null updatedAt", () => {
    const arr = [
      { id: "a", name: "Alpha", updatedAt: null },
      { id: "b", name: "Beta", updatedAt: "2026-05-15T10:00:00Z" },
    ];
    expect(findMostRecentEntity(arr, "students")).toEqual({
      label: "students",
      count: 2,
      mostRecentId: "b",
      mostRecentName: "Beta",
      mostRecentUpdatedAt: "2026-05-15T10:00:00Z",
    });
  });

  it("forwards label as-is", () => {
    const result = findMostRecentEntity([], "custom-label");
    expect(result.label).toBe("custom-label");
  });

  it("uses lexicographic ordering via Date.getTime() — ISO timestamps compare correctly", () => {
    const arr = [
      { id: "early", name: "E", updatedAt: "2025-12-31T23:59:59Z" },
      { id: "late", name: "L", updatedAt: "2026-01-01T00:00:00Z" },
    ];
    expect(findMostRecentEntity(arr, "x").mostRecentId).toBe("late");
  });
});
