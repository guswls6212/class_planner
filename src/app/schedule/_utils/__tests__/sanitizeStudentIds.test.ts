import { describe, expect, it } from "vitest";
import { sanitizeStudentIds } from "../sanitizeStudentIds";

describe("sanitizeStudentIds", () => {
  it("removes stale temp id after server reconcile (omni-radar 2026-05-13)", () => {
    const studentIds = ["temp-1", "real-1"];
    const students = [{ id: "real-1", name: "1번" }];
    expect(sanitizeStudentIds(studentIds, students)).toEqual(["real-1"]);
  });

  it("returns same reference when all ids are still valid (idempotent)", () => {
    const studentIds = ["a", "b"];
    const students = [{ id: "a" }, { id: "b" }, { id: "c" }];
    expect(sanitizeStudentIds(studentIds, students)).toBe(studentIds);
  });

  it("returns empty array when every selected id is stale", () => {
    expect(sanitizeStudentIds(["x", "y"], [{ id: "z" }])).toEqual([]);
  });

  it("preserves order of remaining valid ids", () => {
    const studentIds = ["a", "stale", "b", "stale2", "c"];
    const students = [{ id: "a" }, { id: "b" }, { id: "c" }];
    expect(sanitizeStudentIds(studentIds, students)).toEqual(["a", "b", "c"]);
  });

  it("handles empty inputs", () => {
    expect(sanitizeStudentIds([], [])).toEqual([]);
    expect(sanitizeStudentIds(["a"], [])).toEqual([]);
    expect(sanitizeStudentIds([], [{ id: "a" }])).toEqual([]);
  });
});
