import { describe, expect, it } from "vitest";
import { cascadeFilterOptions } from "../cascadeFilterOptions";
import type { Session } from "../../../../lib/planner";

const STUDENTS = [
  { id: "stu-A", name: "A" },
  { id: "stu-B", name: "B" },
  { id: "stu-C", name: "C" },
];
const SUBJECTS = [
  { id: "sub-math", name: "수학" },
  { id: "sub-eng", name: "영어" },
  { id: "sub-art", name: "미술" },
];
const TEACHERS = [
  { id: "tch-1", name: "김선생" },
  { id: "tch-2", name: "이선생" },
];
const ENROLLMENTS = [
  { id: "e-A-math", studentId: "stu-A", subjectId: "sub-math" },
  { id: "e-A-eng", studentId: "stu-A", subjectId: "sub-eng" },
  { id: "e-B-math", studentId: "stu-B", subjectId: "sub-math" },
  { id: "e-C-art", studentId: "stu-C", subjectId: "sub-art" },
];
const SESSIONS: Session[] = [
  {
    id: "s1",
    enrollmentIds: ["e-A-math", "e-B-math"],
    teacherId: "tch-1",
    weekday: 0,
    startsAt: "09:00",
    endsAt: "10:00",
    yPosition: 1,
    weekStartDate: "2026-05-18",
  },
  {
    id: "s2",
    enrollmentIds: ["e-A-eng"],
    teacherId: "tch-2",
    weekday: 1,
    startsAt: "10:00",
    endsAt: "11:00",
    yPosition: 1,
    weekStartDate: "2026-05-18",
  },
  {
    id: "s3",
    enrollmentIds: ["e-C-art"],
    teacherId: null,
    weekday: 2,
    startsAt: "14:00",
    endsAt: "15:00",
    yPosition: 1,
    weekStartDate: "2026-05-18",
  },
];

const baseInput = {
  students: STUDENTS,
  subjects: SUBJECTS,
  teachers: TEACHERS,
  sessions: SESSIONS,
  enrollments: ENROLLMENTS,
  selectedStudentIds: [],
  selectedSubjectIds: [],
  selectedTeacherIds: [],
};

describe("cascadeFilterOptions", () => {
  it("필터 0개 → 전체 list 그대로 반환", () => {
    const out = cascadeFilterOptions(baseInput);
    expect(out.students).toEqual(STUDENTS);
    expect(out.subjects).toEqual(SUBJECTS);
    expect(out.teachers).toEqual(TEACHERS);
  });

  it("학생 A 선택 → 학생 A 가 들어간 session 의 entity 만 visible", () => {
    const out = cascadeFilterOptions({
      ...baseInput,
      selectedStudentIds: ["stu-A"],
    });
    // s1 (A + B + math + tch-1) + s2 (A + eng + tch-2)
    expect(out.students.map((s) => s.id).sort()).toEqual(
      ["stu-A", "stu-B"].sort(),
    );
    expect(out.subjects.map((s) => s.id).sort()).toEqual(
      ["sub-math", "sub-eng"].sort(),
    );
    expect(out.teachers.map((t) => t.id).sort()).toEqual(
      ["tch-1", "tch-2"].sort(),
    );
  });

  it("학생 + 과목 AND — 두 조건 모두 만족하는 session 의 entity 만", () => {
    const out = cascadeFilterOptions({
      ...baseInput,
      selectedStudentIds: ["stu-A"],
      selectedSubjectIds: ["sub-math"],
    });
    // s1 만 매칭 (A + math)
    expect(out.students.map((s) => s.id).sort()).toEqual(
      ["stu-A", "stu-B"].sort(),
    );
    expect(out.subjects.map((s) => s.id).sort()).toEqual(
      ["sub-math"].sort(),
    );
    expect(out.teachers.map((t) => t.id)).toEqual(["tch-1"]);
  });

  it("selected entity 는 cascading 매칭 X 여도 자기 type 에 항상 visible (chip 해제 보장)", () => {
    const out = cascadeFilterOptions({
      ...baseInput,
      // 매칭 0 가 되는 조합 — 학생 A (math/eng) + 과목 art
      selectedStudentIds: ["stu-A"],
      selectedSubjectIds: ["sub-art"],
    });
    // 매칭 sessions 0 — 그러나 selected entity 는 항상 자기 type 에
    expect(out.students.map((s) => s.id)).toContain("stu-A");
    expect(out.subjects.map((s) => s.id)).toContain("sub-art");
  });

  it("강사 단독 활성 → 그 강사 session 의 entity 만", () => {
    const out = cascadeFilterOptions({
      ...baseInput,
      selectedTeacherIds: ["tch-1"],
    });
    // s1 만 (tch-1 → A + B + math)
    expect(out.students.map((s) => s.id).sort()).toEqual(
      ["stu-A", "stu-B"].sort(),
    );
    expect(out.subjects.map((s) => s.id)).toEqual(["sub-math"]);
    expect(out.teachers.map((t) => t.id)).toEqual(["tch-1"]);
  });

  it("teacher_id null session 은 강사 cascading 에 등장 X", () => {
    // s3 (art, teacher null) 만 매칭하는 시나리오
    const out = cascadeFilterOptions({
      ...baseInput,
      selectedSubjectIds: ["sub-art"],
    });
    // teacher list 에 null teacher 안 들어감
    expect(out.teachers).toEqual([]);
    expect(out.students.map((s) => s.id)).toEqual(["stu-C"]);
  });

  it("type 내부는 OR — 학생 다중 selected = 'A 또는 C 들어간 session' 모두 매칭", () => {
    // sessionMatchesFilters 의 학생 type 매칭 = OR (selectedStudentIds 중 하나라도 있으면).
    // 따라서 [A, C] selected → s1 (A 포함), s2 (A 포함), s3 (C 포함) 모두 매칭.
    // 매칭 sessions 의 attendees = {A, B, C} (s1 에 B 도 같이) + subjects/teachers 도 합집합.
    const out = cascadeFilterOptions({
      ...baseInput,
      selectedStudentIds: ["stu-A", "stu-C"],
    });
    expect(out.students.map((s) => s.id).sort()).toEqual(
      ["stu-A", "stu-B", "stu-C"].sort(),
    );
    expect(out.subjects.map((s) => s.id).sort()).toEqual(
      ["sub-math", "sub-eng", "sub-art"].sort(),
    );
    expect(out.teachers.map((t) => t.id).sort()).toEqual(
      ["tch-1", "tch-2"].sort(),
    );
  });

  it("type 간 AND + type 내 OR — 학생 [A,C] AND 강사 [tch-1] = s1 만 매칭", () => {
    const out = cascadeFilterOptions({
      ...baseInput,
      selectedStudentIds: ["stu-A", "stu-C"],
      selectedTeacherIds: ["tch-1"],
    });
    // s1 만 매칭 (A + tch-1). s2 (tch-2) X. s3 (null) X.
    expect(out.students.map((s) => s.id).sort()).toEqual(
      ["stu-A", "stu-B", "stu-C"].sort(),
    );
    // selected 가 자기 type 에 항상 visible — stu-C 도 결과에 포함
    expect(out.subjects.map((s) => s.id)).toEqual(["sub-math"]);
    expect(out.teachers.map((t) => t.id)).toEqual(["tch-1"]);
  });
});
