import { describe, it, expect } from "vitest";
import { computeLossDiff } from "../computeLossDiff";
import type { ClassPlannerData } from "../../localStorageCrud";
import type { Session } from "../../planner";

const empty: ClassPlannerData = {
  students: [],
  subjects: [],
  sessions: [],
  enrollments: [],
  teachers: [],
  version: "1.0",
  lastModified: new Date().toISOString(),
};

const makeSession = (id: string, weekday = 1): Session =>
  ({
    id,
    weekday,
    startsAt: "10:00",
    endsAt: "11:00",
    yPosition: 1,
    enrollmentIds: [],
    weekStartDate: "",
  }) as unknown as Session;

describe("computeLossDiff", () => {
  it("returns zeros when both sides empty", () => {
    const diff = computeLossDiff(empty, empty);
    expect(diff).toEqual({
      students: 0,
      subjects: 0,
      sessions: 0,
      isLargeLoss: false,
    });
  });

  it("returns zeros when same id sets on both sides (no loss)", () => {
    const data: ClassPlannerData = {
      ...empty,
      students: [{ id: "s1", name: "철수" }],
      subjects: [{ id: "u1", name: "국어", color: "#fff" }],
      sessions: [makeSession("ses1")],
    };
    const diff = computeLossDiff(data, data);
    expect(diff.students).toBe(0);
    expect(diff.subjects).toBe(0);
    expect(diff.sessions).toBe(0);
    expect(diff.isLargeLoss).toBe(false);
  });

  it("counts entities in rejected absent from selected (small loss)", () => {
    const selected: ClassPlannerData = {
      ...empty,
      students: [{ id: "s1", name: "철수" }],
    };
    const rejected: ClassPlannerData = {
      ...empty,
      students: [
        { id: "s1", name: "철수" },
        { id: "s2", name: "영희" },
      ],
      subjects: [{ id: "u1", name: "국어", color: "#fff" }],
      sessions: [makeSession("ses1")],
    };
    const diff = computeLossDiff(selected, rejected);
    expect(diff.students).toBe(1);
    expect(diff.subjects).toBe(1);
    expect(diff.sessions).toBe(1);
    expect(diff.isLargeLoss).toBe(false);
  });

  it("flags isLargeLoss when sessions >= 5 OR students/subjects >= 3", () => {
    const sessions = Array.from({ length: 5 }, (_, i) =>
      makeSession(`ses${i}`, i),
    );
    const diffSessions = computeLossDiff(empty, { ...empty, sessions });
    expect(diffSessions.sessions).toBe(5);
    expect(diffSessions.isLargeLoss).toBe(true);

    const students = Array.from({ length: 3 }, (_, i) => ({
      id: `s${i}`,
      name: `학생${i}`,
    }));
    const diffStudents = computeLossDiff(empty, { ...empty, students });
    expect(diffStudents.isLargeLoss).toBe(true);

    const diffJustBelow = computeLossDiff(empty, {
      ...empty,
      sessions: sessions.slice(0, 4),
      students: students.slice(0, 2),
    });
    expect(diffJustBelow.isLargeLoss).toBe(false);
  });

  it("excludes default subjects from loss count", () => {
    const rejected: ClassPlannerData = {
      ...empty,
      subjects: [
        { id: "d1", name: "초등수학", color: "#fff" },
        { id: "d2", name: "중등수학", color: "#fff" },
        { id: "u1", name: "사용자정의과목", color: "#fff" },
      ],
    };
    const diff = computeLossDiff(empty, rejected);
    expect(diff.subjects).toBe(1);
  });
});
