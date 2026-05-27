import { describe, it, expect } from "vitest";
import { computeFilterCascadeAutoDeselect } from "../filterCascadeAutoDeselect";
import type { Session, Enrollment } from "@/lib/planner";

const makeSession = (
  id: string,
  weekday: number,
  startsAt: string,
  endsAt: string,
  opts: Partial<Session> = {},
): Session =>
  ({
    id,
    weekday,
    startsAt,
    endsAt,
    yPosition: 1,
    enrollmentIds: [],
    weekStartDate: "2026-05-04",
    subjectId: "subj-1",
    ...opts,
  }) as Session;

describe("computeFilterCascadeAutoDeselect", () => {
  it("모두 빈 filter → shouldCleanup=false", () => {
    const result = computeFilterCascadeAutoDeselect({
      sessions: [],
      enrollments: [],
      selectedStudentIds: [],
      selectedSubjectIds: [],
      selectedTeacherIds: [],
    });
    expect(result.shouldCleanup).toBe(false);
  });

  it("corrupted localStorage (non-array) → shouldCleanup=false", () => {
    const result = computeFilterCascadeAutoDeselect({
      sessions: [],
      enrollments: [],
      // @ts-expect-error — corrupted state simulation
      selectedStudentIds: { foo: "bar" },
      selectedSubjectIds: [],
      selectedTeacherIds: [],
    });
    expect(result.shouldCleanup).toBe(false);
  });

  it("모든 selected 가 valid → shouldCleanup=false", () => {
    const enrollments: Enrollment[] = [
      { id: "e1", studentId: "stu-1", subjectId: "subj-1" },
    ];
    const sessions: Session[] = [
      makeSession("a", 0, "09:00", "10:00", {
        enrollmentIds: ["e1"],
        teacherId: "tea-1",
        subjectId: "subj-1",
      }),
    ];
    const result = computeFilterCascadeAutoDeselect({
      sessions,
      enrollments,
      selectedStudentIds: ["stu-1"],
      selectedSubjectIds: ["subj-1"],
      selectedTeacherIds: ["tea-1"],
    });
    expect(result.shouldCleanup).toBe(false);
  });

  it("invalid student → removedStudentIds 에 포함 + shouldCleanup=true", () => {
    const enrollments: Enrollment[] = [
      { id: "e1", studentId: "stu-1", subjectId: "subj-1" },
    ];
    const sessions: Session[] = [
      makeSession("a", 0, "09:00", "10:00", {
        enrollmentIds: ["e1"],
        subjectId: "subj-1",
      }),
    ];
    // selectedStudentIds 에 stu-2 (매칭 sessions 0)
    const result = computeFilterCascadeAutoDeselect({
      sessions,
      enrollments,
      selectedStudentIds: ["stu-1", "stu-2"],
      selectedSubjectIds: [],
      selectedTeacherIds: [],
    });
    // 두 학생 다 선택 → 매칭 sessions 는 stu-1 만 매칭. stu-2 invalid.
    // 하지만 matching 은 selectedStudentIds 모두 OR? AND? — sessionMatchesFilters 의 동작 확인.
    // 실제로 sessionMatchesFilters 는 OR 매칭 (선택된 학생 중 하나라도 매칭).
    // → matching 은 a 만. validStudents = stu-1. stu-2 invalid.
    expect(result.shouldCleanup).toBe(true);
    expect(result.removedStudentIds).toEqual(["stu-2"]);
  });

  it("invalid subject → nextSubjectIds 에서 제외 + subjectsChanged=true", () => {
    const enrollments: Enrollment[] = [
      { id: "e1", studentId: "stu-1", subjectId: "subj-1" },
    ];
    const sessions: Session[] = [
      makeSession("a", 0, "09:00", "10:00", {
        enrollmentIds: ["e1"],
        subjectId: "subj-1",
      }),
    ];
    const result = computeFilterCascadeAutoDeselect({
      sessions,
      enrollments,
      selectedStudentIds: [],
      selectedSubjectIds: ["subj-1", "subj-other"],
      selectedTeacherIds: [],
    });
    expect(result.subjectsChanged).toBe(true);
    expect(result.nextSubjectIds).toEqual(["subj-1"]);
  });

  it("invalid teacher → removedTeacherIds", () => {
    const sessions: Session[] = [
      makeSession("a", 0, "09:00", "10:00", { teacherId: "tea-1" }),
    ];
    const result = computeFilterCascadeAutoDeselect({
      sessions,
      enrollments: [],
      selectedStudentIds: [],
      selectedSubjectIds: [],
      selectedTeacherIds: ["tea-1", "tea-removed"],
    });
    expect(result.shouldCleanup).toBe(true);
    expect(result.removedTeacherIds).toEqual(["tea-removed"]);
  });

  it("3 종류 모두 invalid → 모두 cleanup", () => {
    const sessions: Session[] = [];
    const result = computeFilterCascadeAutoDeselect({
      sessions,
      enrollments: [],
      selectedStudentIds: ["stu-x"],
      selectedSubjectIds: ["subj-x"],
      selectedTeacherIds: ["tea-x"],
    });
    expect(result.shouldCleanup).toBe(true);
    expect(result.removedStudentIds).toEqual(["stu-x"]);
    expect(result.removedTeacherIds).toEqual(["tea-x"]);
    expect(result.nextSubjectIds).toEqual([]);
    expect(result.subjectsChanged).toBe(true);
  });
});
