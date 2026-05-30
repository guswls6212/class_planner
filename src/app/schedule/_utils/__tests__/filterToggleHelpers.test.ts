import { describe, it, expect } from "vitest";
import { planFilterToggleAttempt } from "../filterToggleHelpers";
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

describe("planFilterToggleAttempt — student kind", () => {
  it("이미 선택된 id → deselect (거부 없음)", () => {
    const outcome = planFilterToggleAttempt({
      id: "stu-1",
      kind: "student",
      sessions: [],
      enrollments: [],
      selectedStudentIds: ["stu-1", "stu-2"],
      selectedSubjectIds: [],
      selectedTeacherIds: [],
      entityName: "학생1",
    });
    expect(outcome).toEqual({ action: "deselect" });
  });

  it("새 id 추가 시 wouldMatch ≥ 1 → select", () => {
    const sessions: Session[] = [
      makeSession("a", 0, "09:00", "10:00", { enrollmentIds: ["e1"] }),
    ];
    const enrollments: Enrollment[] = [
      { id: "e1", studentId: "stu-1", subjectId: "subj-1" },
    ];
    const outcome = planFilterToggleAttempt({
      id: "stu-1",
      kind: "student",
      sessions,
      enrollments,
      selectedStudentIds: [],
      selectedSubjectIds: [],
      selectedTeacherIds: [],
      entityName: "학생1",
    });
    expect(outcome).toEqual({ action: "select" });
  });

  it("새 id 추가 시 wouldMatch=0 → rejected", () => {
    const sessions: Session[] = [
      makeSession("a", 0, "09:00", "10:00", { enrollmentIds: ["e1"] }),
    ];
    const enrollments: Enrollment[] = [
      { id: "e1", studentId: "stu-other", subjectId: "subj-1" }, // stu-1 매칭 없음
    ];
    const outcome = planFilterToggleAttempt({
      id: "stu-1",
      kind: "student",
      sessions,
      enrollments,
      selectedStudentIds: [],
      selectedSubjectIds: [],
      selectedTeacherIds: [],
      entityName: "학생1",
    });
    expect(outcome).toEqual({ action: "rejected", entityName: "학생1" });
  });

  it("rejected 시 entityName 전달 (toast 사용)", () => {
    const outcome = planFilterToggleAttempt({
      id: "stu-x",
      kind: "student",
      sessions: [],
      enrollments: [],
      selectedStudentIds: [],
      selectedSubjectIds: [],
      selectedTeacherIds: [],
      entityName: "특이학생",
    });
    expect(outcome.action).toBe("rejected");
    if (outcome.action === "rejected") {
      expect(outcome.entityName).toBe("특이학생");
    }
  });

  it("기존 필터 + 새 id 조합으로 wouldMatch 확인", () => {
    // selectedSubject=subj-1 이미 활성. 추가 학생 stu-1 — subj-1 의 매칭 sessions 가 있는지.
    const sessions: Session[] = [
      makeSession("a", 0, "09:00", "10:00", {
        enrollmentIds: ["e1"],
        subjectId: "subj-1",
      }),
    ];
    const enrollments: Enrollment[] = [
      { id: "e1", studentId: "stu-1", subjectId: "subj-1" },
    ];
    const outcome = planFilterToggleAttempt({
      id: "stu-1",
      kind: "student",
      sessions,
      enrollments,
      selectedStudentIds: [],
      selectedSubjectIds: ["subj-1"], // 기존 필터
      selectedTeacherIds: [],
      entityName: "학생1",
    });
    expect(outcome.action).toBe("select");
  });
});

describe("planFilterToggleAttempt — subject kind", () => {
  it("이미 선택된 subject → deselect", () => {
    const outcome = planFilterToggleAttempt({
      id: "subj-1",
      kind: "subject",
      sessions: [],
      enrollments: [],
      selectedStudentIds: [],
      selectedSubjectIds: ["subj-1"],
      selectedTeacherIds: [],
      entityName: "과목1",
    });
    expect(outcome.action).toBe("deselect");
  });

  it("subject 추가 → wouldMatch 확인 (subject id 기반)", () => {
    const sessions: Session[] = [
      makeSession("a", 0, "09:00", "10:00", {
        enrollmentIds: ["e1"],
        subjectId: "subj-1",
      }),
    ];
    const enrollments: Enrollment[] = [
      { id: "e1", studentId: "stu-1", subjectId: "subj-1" },
    ];
    const outcome = planFilterToggleAttempt({
      id: "subj-1",
      kind: "subject",
      sessions,
      enrollments,
      selectedStudentIds: [],
      selectedSubjectIds: [],
      selectedTeacherIds: [],
      entityName: "과목1",
    });
    expect(outcome.action).toBe("select");
  });

  it("subject id 미매칭 → rejected", () => {
    const sessions: Session[] = [
      makeSession("a", 0, "09:00", "10:00", {
        enrollmentIds: ["e1"],
        subjectId: "subj-other",
      }),
    ];
    const enrollments: Enrollment[] = [
      { id: "e1", studentId: "stu-1", subjectId: "subj-other" },
    ];
    const outcome = planFilterToggleAttempt({
      id: "subj-nomatch",
      kind: "subject",
      sessions,
      enrollments,
      selectedStudentIds: [],
      selectedSubjectIds: [],
      selectedTeacherIds: [],
      entityName: "과목X",
    });
    expect(outcome.action).toBe("rejected");
  });
});

describe("planFilterToggleAttempt — teacher kind", () => {
  it("이미 선택된 teacher → deselect", () => {
    const outcome = planFilterToggleAttempt({
      id: "tea-1",
      kind: "teacher",
      sessions: [],
      enrollments: [],
      selectedStudentIds: [],
      selectedSubjectIds: [],
      selectedTeacherIds: ["tea-1"],
      entityName: "강사1",
    });
    expect(outcome.action).toBe("deselect");
  });

  it("teacher 추가 → session.teacherId 매칭 시 select", () => {
    const sessions: Session[] = [
      makeSession("a", 0, "09:00", "10:00", { teacherId: "tea-1" }),
    ];
    const outcome = planFilterToggleAttempt({
      id: "tea-1",
      kind: "teacher",
      sessions,
      enrollments: [],
      selectedStudentIds: [],
      selectedSubjectIds: [],
      selectedTeacherIds: [],
      entityName: "강사1",
    });
    expect(outcome.action).toBe("select");
  });

  it("teacher 미매칭 → rejected", () => {
    const sessions: Session[] = [
      makeSession("a", 0, "09:00", "10:00", { teacherId: "tea-other" }),
    ];
    const outcome = planFilterToggleAttempt({
      id: "tea-nomatch",
      kind: "teacher",
      sessions,
      enrollments: [],
      selectedStudentIds: [],
      selectedSubjectIds: [],
      selectedTeacherIds: [],
      entityName: "강사X",
    });
    expect(outcome.action).toBe("rejected");
  });
});

describe("planFilterToggleAttempt — cross-kind interaction", () => {
  it("student 추가 시 기존 teacher 필터와 AND 매칭 (둘 다 매칭 되는 session 없으면 rejected)", () => {
    // session 에 stu-1 + tea-A 가 있는데, 사용자가 teacher=tea-B 선택중. stu-1 추가 시 매칭 0.
    const sessions: Session[] = [
      makeSession("a", 0, "09:00", "10:00", {
        enrollmentIds: ["e1"],
        teacherId: "tea-A",
      }),
    ];
    const enrollments: Enrollment[] = [
      { id: "e1", studentId: "stu-1", subjectId: "subj-1" },
    ];
    const outcome = planFilterToggleAttempt({
      id: "stu-1",
      kind: "student",
      sessions,
      enrollments,
      selectedStudentIds: [],
      selectedSubjectIds: [],
      selectedTeacherIds: ["tea-B"], // 기존 teacher 필터 — session.teacherId 와 매칭 0
      entityName: "학생1",
    });
    expect(outcome.action).toBe("rejected");
  });
});
