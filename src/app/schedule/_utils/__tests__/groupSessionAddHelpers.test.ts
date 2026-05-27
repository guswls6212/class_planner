import { describe, it, expect } from "vitest";
import { planGroupSessionAdd } from "../groupSessionAddHelpers";
import type { GroupSessionData } from "@/types/scheduleTypes";

const validData: GroupSessionData = {
  studentIds: ["stu-1"],
  subjectId: "subj-1",
  weekday: 0,
  startTime: "09:00",
  endTime: "10:00",
};

describe("planGroupSessionAdd", () => {
  it("timeValid=false → failure (time-invalid)", () => {
    const result = planGroupSessionAdd({
      data: validData,
      currentWeekStart: "2026-05-04",
      timeValid: false,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("time-invalid");
  });

  it("subjectId 없으면 failure (no-subject)", () => {
    const result = planGroupSessionAdd({
      data: { ...validData, subjectId: "" },
      currentWeekStart: "2026-05-04",
      timeValid: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("no-subject");
  });

  it("studentIds 빈 배열 → failure (no-students)", () => {
    const result = planGroupSessionAdd({
      data: { ...validData, studentIds: [] },
      currentWeekStart: "2026-05-04",
      timeValid: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("no-students");
  });

  it("happy path — addSessionInput 빌드", () => {
    const result = planGroupSessionAdd({
      data: {
        ...validData,
        teacherId: "tea-1",
        room: "201",
        yPosition: 3,
      },
      currentWeekStart: "2026-05-04",
      timeValid: true,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.addSessionInput).toEqual({
      studentIds: ["stu-1"],
      subjectId: "subj-1",
      teacherId: "tea-1",
      weekday: 0,
      startTime: "09:00",
      endTime: "10:00",
      room: "201",
      yPosition: 3,
      weekStartDate: undefined,
    });
  });

  it("yPosition 미지정 시 default 1", () => {
    const result = planGroupSessionAdd({
      data: validData,
      currentWeekStart: "2026-05-04",
      timeValid: true,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.addSessionInput.yPosition).toBe(1);
  });

  it("weekStartDate currentWeekStart 와 다르면 movedToOtherWeek=true", () => {
    const result = planGroupSessionAdd({
      data: { ...validData, weekStartDate: "2026-05-11" },
      currentWeekStart: "2026-05-04",
      timeValid: true,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.movedToOtherWeek).toBe(true);
  });

  it("weekStartDate 동일 시 movedToOtherWeek=false", () => {
    const result = planGroupSessionAdd({
      data: { ...validData, weekStartDate: "2026-05-04" },
      currentWeekStart: "2026-05-04",
      timeValid: true,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.movedToOtherWeek).toBe(false);
  });

  it("weekStartDate undefined → movedToOtherWeek=false", () => {
    const result = planGroupSessionAdd({
      data: validData,
      currentWeekStart: "2026-05-04",
      timeValid: true,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.movedToOtherWeek).toBe(false);
  });
});
