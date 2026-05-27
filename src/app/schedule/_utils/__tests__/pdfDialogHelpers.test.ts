import { describe, it, expect } from "vitest";
import {
  computeFilteredAndAllSessions,
  computeFilterChipLabel,
} from "../pdfDialogHelpers";
import type {
  Session,
  Enrollment,
  Student,
  Teacher,
  Subject,
} from "@/lib/planner";

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

const makeStudent = (id: string, name: string): Student =>
  ({ id, name }) as Student;
const makeTeacher = (id: string, name: string): Teacher =>
  ({ id, name }) as Teacher;
const makeSubject = (id: string, name: string): Subject =>
  ({ id, name, color: "#FF0000" }) as Subject;

describe("computeFilteredAndAllSessions", () => {
  const sessions = [
    makeSession("a", 0, "09:00", "10:00", {
      enrollmentIds: ["e1"],
      subjectId: "subj-1",
    }),
    makeSession("b", 1, "11:00", "12:00", {
      enrollmentIds: ["e2"],
      subjectId: "subj-2",
    }),
  ];
  const enrollments: Enrollment[] = [
    { id: "e1", studentId: "stu-1", subjectId: "subj-1" },
    { id: "e2", studentId: "stu-2", subjectId: "subj-2" },
  ];
  const displaySessions = new Map<number, Session[]>([
    [0, [sessions[0]]],
    [1, [sessions[1]]],
  ]);

  it("필터 없으면 filteredSessions = allSessionsRaw same ref", () => {
    const result = computeFilteredAndAllSessions({
      displaySessions,
      enrollments,
      selectedStudentIds: [],
      selectedSubjectIds: [],
      selectedTeacherIds: [],
    });
    expect(result.hasAnyFilter).toBe(false);
    expect(result.filteredSessions).toBe(result.allSessionsRaw);
    expect(result.allSessionsRaw).toHaveLength(2);
  });

  it("학생 필터 → 매칭 sessions 만", () => {
    const result = computeFilteredAndAllSessions({
      displaySessions,
      enrollments,
      selectedStudentIds: ["stu-1"],
      selectedSubjectIds: [],
      selectedTeacherIds: [],
    });
    expect(result.hasAnyFilter).toBe(true);
    expect(result.filteredSessions).toHaveLength(1);
    expect(result.filteredSessions[0].id).toBe("a");
    expect(result.allSessionsRaw).toHaveLength(2); // 원본은 그대로
  });

  it("displaySessions Map flat 처리", () => {
    const result = computeFilteredAndAllSessions({
      displaySessions,
      enrollments,
      selectedStudentIds: [],
      selectedSubjectIds: [],
      selectedTeacherIds: [],
    });
    expect(result.allSessionsRaw).toHaveLength(2);
  });
});

describe("computeFilterChipLabel", () => {
  const students = [
    makeStudent("stu-1", "학생1"),
    makeStudent("stu-2", "학생2"),
  ];
  const subjects = [makeSubject("subj-1", "과목1")];
  const teachers = [makeTeacher("tea-1", "강사1")];

  it("아무 필터 없으면 undefined", () => {
    const result = computeFilterChipLabel({
      selectedStudentIds: [],
      selectedSubjectIds: [],
      selectedTeacherIds: [],
      students,
      subjects,
      teachers,
    });
    expect(result).toBeUndefined();
  });

  it("학생 필터 1명 → 학생 name", () => {
    const result = computeFilterChipLabel({
      selectedStudentIds: ["stu-1"],
      selectedSubjectIds: [],
      selectedTeacherIds: [],
      students,
      subjects,
      teachers,
    });
    expect(result).toBe("학생1");
  });

  it("학생 2 명 → 'name 외 1'", () => {
    const result = computeFilterChipLabel({
      selectedStudentIds: ["stu-1", "stu-2"],
      selectedSubjectIds: [],
      selectedTeacherIds: [],
      students,
      subjects,
      teachers,
    });
    expect(result).toBe("학생1 외 1");
  });

  it("학생 priority — 학생 + 강사 동시 선택 시 학생 label", () => {
    const result = computeFilterChipLabel({
      selectedStudentIds: ["stu-1"],
      selectedSubjectIds: [],
      selectedTeacherIds: ["tea-1"],
      students,
      subjects,
      teachers,
    });
    expect(result).toBe("학생1");
  });

  it("과목 priority — 학생 없을 때 과목", () => {
    const result = computeFilterChipLabel({
      selectedStudentIds: [],
      selectedSubjectIds: ["subj-1"],
      selectedTeacherIds: ["tea-1"],
      students,
      subjects,
      teachers,
    });
    expect(result).toBe("과목1");
  });

  it("강사 priority — 학생/과목 없을 때 강사", () => {
    const result = computeFilterChipLabel({
      selectedStudentIds: [],
      selectedSubjectIds: [],
      selectedTeacherIds: ["tea-1"],
      students,
      subjects,
      teachers,
    });
    expect(result).toBe("강사1");
  });

  it("매칭 entity 못 찾으면 default ('학생')", () => {
    const result = computeFilterChipLabel({
      selectedStudentIds: ["stu-missing"],
      selectedSubjectIds: [],
      selectedTeacherIds: [],
      students,
      subjects,
      teachers,
    });
    expect(result).toBe("학생");
  });

  it("강사 매칭 못 찾으면 default ('강사')", () => {
    const result = computeFilterChipLabel({
      selectedStudentIds: [],
      selectedSubjectIds: [],
      selectedTeacherIds: ["tea-missing"],
      students,
      subjects,
      teachers,
    });
    expect(result).toBe("강사");
  });
});
