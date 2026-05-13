import { describe, expect, it } from "vitest";
import { sanitizeTempEnrollments } from "../sanitizeTempEnrollments";

describe("sanitizeTempEnrollments", () => {
  it("removes temp enrollment whose studentId is no longer in students (omni-radar 2026-05-13 follow-up)", () => {
    const temps = [
      { id: "te-stale", studentId: "stale-1", subjectId: "subj-1" },
      { id: "te-keep", studentId: "real-1", subjectId: "subj-1" },
    ];
    const students = [{ id: "real-1" }];
    const { kept, removedIds } = sanitizeTempEnrollments(temps, students);
    expect(kept).toEqual([{ id: "te-keep", studentId: "real-1", subjectId: "subj-1" }]);
    expect([...removedIds]).toEqual(["te-stale"]);
  });

  it("returns same reference when all studentIds are still valid (idempotent)", () => {
    const temps = [
      { id: "a", studentId: "s1", subjectId: "subj" },
      { id: "b", studentId: "s2", subjectId: "subj" },
    ];
    const students = [{ id: "s1" }, { id: "s2" }];
    const result = sanitizeTempEnrollments(temps, students);
    expect(result.kept).toBe(temps);
    expect(result.removedIds.size).toBe(0);
  });

  it("returns empty kept array when every studentId is stale", () => {
    const temps = [
      { id: "a", studentId: "x", subjectId: "subj" },
      { id: "b", studentId: "y", subjectId: "subj" },
    ];
    const { kept, removedIds } = sanitizeTempEnrollments(temps, [{ id: "z" }]);
    expect(kept).toEqual([]);
    expect([...removedIds].sort()).toEqual(["a", "b"]);
  });

  it("handles empty inputs", () => {
    expect(sanitizeTempEnrollments([], []).kept).toEqual([]);
    expect(sanitizeTempEnrollments([], [{ id: "a" }]).kept).toEqual([]);

    const lone = [{ id: "te", studentId: "stale", subjectId: "subj" }];
    const out = sanitizeTempEnrollments(lone, []);
    expect(out.kept).toEqual([]);
    expect([...out.removedIds]).toEqual(["te"]);
  });

  it("preserves order of remaining temp enrollments", () => {
    const temps = [
      { id: "a", studentId: "s1", subjectId: "subj" },
      { id: "stale", studentId: "x", subjectId: "subj" },
      { id: "b", studentId: "s2", subjectId: "subj" },
      { id: "c", studentId: "s3", subjectId: "subj" },
    ];
    const students = [{ id: "s1" }, { id: "s2" }, { id: "s3" }];
    const { kept } = sanitizeTempEnrollments(temps, students);
    expect(kept.map((t) => t.id)).toEqual(["a", "b", "c"]);
  });
});
