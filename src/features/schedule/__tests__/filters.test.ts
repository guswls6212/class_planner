import { describe, expect, it } from "vitest";
import { filterSessionsByStudents } from "../filters";
import type { Session } from "@/lib/planner";

const makeEnrollment = (id: string, studentId: string, subjectId = "s1") => ({
  id,
  studentId,
  subjectId,
});

const makeSession = (id: string, enrollmentIds: string[]): Session =>
  ({
    id,
    weekday: 0,
    startsAt: "09:00",
    endsAt: "10:00",
    enrollmentIds,
    yPosition: 0,
  } as Session);

const enrollments = [
  makeEnrollment("e1", "stu1"),
  makeEnrollment("e2", "stu2"),
  makeEnrollment("e3", "stu3"),
];

const sessions = [
  makeSession("sess1", ["e1"]),
  makeSession("sess2", ["e2"]),
  makeSession("sess3", ["e1", "e2"]),
  makeSession("sess4", ["e3"]),
];

describe("filterSessionsByStudents", () => {
  it("빈 selectedStudentIds면 전체 세션 반환", () => {
    const result = filterSessionsByStudents(sessions, [], enrollments);
    expect(result).toHaveLength(4);
  });

  it("stu1 선택 시 stu1 포함 세션 반환", () => {
    const result = filterSessionsByStudents(sessions, ["stu1"], enrollments);
    expect(result.map((s) => s.id).sort()).toEqual(["sess1", "sess3"]);
  });

  it("stu1+stu2 선택 시 교집합(OR) 세션 반환", () => {
    const result = filterSessionsByStudents(sessions, ["stu1", "stu2"], enrollments);
    expect(result.map((s) => s.id).sort()).toEqual(["sess1", "sess2", "sess3"]);
  });

  it("일치 없는 studentId면 빈 배열 반환", () => {
    const result = filterSessionsByStudents(sessions, ["unknown"], enrollments);
    expect(result).toHaveLength(0);
  });

  it("그룹 세션에서 1명만 선택해도 세션 전체 표시", () => {
    const result = filterSessionsByStudents(sessions, ["stu2"], enrollments);
    const ids = result.map((s) => s.id);
    expect(ids).toContain("sess3");
  });
});
