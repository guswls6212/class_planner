import { describe, it, expect } from "vitest";
import {
  nextAttendanceCycleStatus,
  normalizeForCycle,
} from "../EditSessionModal.attendanceCycle";

describe("nextAttendanceCycleStatus", () => {
  it("none → present (default 다음 단계 = 가장 흔한 case)", () => {
    expect(nextAttendanceCycleStatus("none")).toBe("present");
    expect(nextAttendanceCycleStatus(undefined)).toBe("present");
  });
  it("present → absent", () => {
    expect(nextAttendanceCycleStatus("present")).toBe("absent");
  });
  it("absent → late", () => {
    expect(nextAttendanceCycleStatus("absent")).toBe("late");
  });
  it("late → none (cycle 회귀)", () => {
    expect(nextAttendanceCycleStatus("late")).toBe("none");
  });
  it("외부 status (excused 등) → present (cycle 시작)", () => {
    expect(nextAttendanceCycleStatus("excused")).toBe("present");
    expect(nextAttendanceCycleStatus("unknown")).toBe("present");
  });
});

describe("normalizeForCycle", () => {
  it("undefined / '' / 'none' → 'none'", () => {
    expect(normalizeForCycle(undefined)).toBe("none");
    expect(normalizeForCycle("")).toBe("none");
    expect(normalizeForCycle("none")).toBe("none");
  });
  it("cycle 멤버 그대로 통과", () => {
    expect(normalizeForCycle("present")).toBe("present");
    expect(normalizeForCycle("absent")).toBe("absent");
    expect(normalizeForCycle("late")).toBe("late");
  });
  it("외부 status → none (cycle 외 — pill 미체크 표시)", () => {
    expect(normalizeForCycle("excused")).toBe("none");
    expect(normalizeForCycle("unknown")).toBe("none");
  });
});
