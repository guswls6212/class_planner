import { describe, it, expect } from "vitest";
import { planAddStudentFromInput } from "../studentInputHelpers";
import type { Student } from "@/lib/planner";

const makeStudent = (id: string, name: string): Student =>
  ({ id, name }) as Student;

describe("planAddStudentFromInput", () => {
  it("empty input → noop", () => {
    const result = planAddStudentFromInput({
      input: "",
      students: [],
      selectedStudentIds: [],
      maxStudents: 14,
    });
    expect(result.action).toBe("noop");
  });

  it("whitespace-only input → noop", () => {
    const result = planAddStudentFromInput({
      input: "   ",
      students: [],
      selectedStudentIds: [],
      maxStudents: 14,
    });
    expect(result.action).toBe("noop");
  });

  it("매칭 없음 → not-found (trimmedInput 포함)", () => {
    const result = planAddStudentFromInput({
      input: "  미존재  ",
      students: [makeStudent("stu-1", "학생1")],
      selectedStudentIds: [],
      maxStudents: 14,
    });
    expect(result.action).toBe("not-found");
    if (result.action === "not-found") {
      expect(result.trimmedInput).toBe("미존재");
    }
  });

  it("매칭 student 미선택 → add", () => {
    const result = planAddStudentFromInput({
      input: "학생1",
      students: [makeStudent("stu-1", "학생1")],
      selectedStudentIds: [],
      maxStudents: 14,
    });
    expect(result.action).toBe("add");
    if (result.action === "add") {
      expect(result.studentId).toBe("stu-1");
    }
  });

  it("매칭 case-insensitive", () => {
    const result = planAddStudentFromInput({
      input: "STUDENT-A",
      students: [makeStudent("stu-1", "Student-A")],
      selectedStudentIds: [],
      maxStudents: 14,
    });
    expect(result.action).toBe("add");
  });

  it("이미 selected → already-added (동명이인 0)", () => {
    const result = planAddStudentFromInput({
      input: "학생1",
      students: [makeStudent("stu-1", "학생1")],
      selectedStudentIds: ["stu-1"],
      maxStudents: 14,
    });
    expect(result.action).toBe("already-added");
    if (result.action === "already-added") {
      expect(result.studentName).toBe("학생1");
      expect(result.otherDuplicatesCount).toBe(0);
    }
  });

  it("이미 selected + 동명이인 2 명 → already-added (count=2)", () => {
    const result = planAddStudentFromInput({
      input: "학생1",
      students: [
        makeStudent("stu-1", "학생1"),
        makeStudent("stu-2", "학생1"), // 동명이인
        makeStudent("stu-3", "학생1"), // 동명이인
      ],
      selectedStudentIds: ["stu-1"],
      maxStudents: 14,
    });
    expect(result.action).toBe("already-added");
    if (result.action === "already-added") {
      expect(result.otherDuplicatesCount).toBe(2);
    }
  });

  it("14 명 max 도달 → max-reached", () => {
    const students = Array.from({ length: 15 }, (_, i) =>
      makeStudent(`stu-${i}`, `학생${i}`),
    );
    const selected = students.slice(0, 14).map((s) => s.id);
    const result = planAddStudentFromInput({
      input: "학생14", // index 14, 아직 미선택
      students,
      selectedStudentIds: selected,
      maxStudents: 14,
    });
    expect(result.action).toBe("max-reached");
  });

  it("동명이인 매칭 시 첫번째 student 의 id 반환 (find 의 자연동작)", () => {
    const result = planAddStudentFromInput({
      input: "학생1",
      students: [
        makeStudent("stu-1", "학생1"),
        makeStudent("stu-2", "학생1"),
      ],
      selectedStudentIds: [],
      maxStudents: 14,
    });
    expect(result.action).toBe("add");
    if (result.action === "add") {
      expect(result.studentId).toBe("stu-1");
    }
  });
});
