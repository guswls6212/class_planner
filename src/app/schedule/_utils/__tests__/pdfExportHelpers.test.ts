import { describe, it, expect } from "vitest";
import {
  computePdfAutoRange,
  filterPdfSessions,
  planPdfExport,
} from "../pdfExportHelpers";
import type { Session, Enrollment, Student, Teacher } from "@/lib/planner";

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

describe("computePdfAutoRange", () => {
  it("scoped sessions empty → user fallback (+1h endHour)", () => {
    const result = computePdfAutoRange([], { startHour: 10, endHour: 18 });
    expect(result).toEqual({ startHour: 10, endHour: 19 });
  });

  it("scoped sessions 있으면 data-tight + 1h padding", () => {
    // 10:30~14:30 sessions → padding 1h → 9~15h (실제: floor(10.5)=10, -1=9; ceil(14.5)=15, +1=16)
    const sessions: Session[] = [
      makeSession("a", 0, "10:30", "11:30"),
      makeSession("b", 1, "13:30", "14:30"),
    ];
    const result = computePdfAutoRange(sessions, {
      startHour: 0,
      endHour: 23,
    });
    expect(result.startHour).toBe(9); // floor(10.5)=10, -1=9
    expect(result.endHour).toBe(16); // ceil(14.5)=15, +1=16
  });

  it("startHour clamp >= 0", () => {
    const sessions: Session[] = [
      makeSession("a", 0, "00:30", "01:00"),
    ];
    const result = computePdfAutoRange(sessions, {
      startHour: 0,
      endHour: 23,
    });
    expect(result.startHour).toBe(0); // floor(0.5)=0, -1=-1 → clamp 0
  });

  it("endHour clamp <= 24", () => {
    const sessions: Session[] = [
      makeSession("a", 0, "22:00", "23:30"),
    ];
    const result = computePdfAutoRange(sessions, {
      startHour: 0,
      endHour: 23,
    });
    expect(result.endHour).toBe(24); // ceil(23.5)=24, +1=25 → clamp 24
  });
});

describe("filterPdfSessions", () => {
  const allSessions: Session[] = [
    makeSession("a", 0, "09:00", "10:00", {
      enrollmentIds: ["e1"],
      subjectId: "subj-1",
      teacherId: "tea-1",
    }),
    makeSession("b", 1, "11:00", "12:00", {
      enrollmentIds: ["e2"],
      subjectId: "subj-2",
      teacherId: "tea-2",
    }),
  ];
  const enrollments: Enrollment[] = [
    { id: "e1", studentId: "stu-1", subjectId: "subj-1" },
    { id: "e2", studentId: "stu-2", subjectId: "subj-2" },
  ];

  it("active filter 없으면 전체 반환", () => {
    const result = filterPdfSessions({
      allSessionsRaw: allSessions,
      enrollments,
      selectedStudentIds: [],
      selectedSubjectIds: [],
      selectedTeacherIds: [],
      applyFilter: true,
    });
    expect(result).toBe(allSessions); // same reference
  });

  it("applyFilter=false 면 활성 필터 있어도 전체", () => {
    const result = filterPdfSessions({
      allSessionsRaw: allSessions,
      enrollments,
      selectedStudentIds: ["stu-1"],
      selectedSubjectIds: [],
      selectedTeacherIds: [],
      applyFilter: false,
    });
    expect(result).toBe(allSessions);
  });

  it("학생 필터 — 매칭 sessions 만", () => {
    const result = filterPdfSessions({
      allSessionsRaw: allSessions,
      enrollments,
      selectedStudentIds: ["stu-1"],
      selectedSubjectIds: [],
      selectedTeacherIds: [],
      applyFilter: true,
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("a");
  });

  it("강사 필터 — 매칭 sessions 만", () => {
    const result = filterPdfSessions({
      allSessionsRaw: allSessions,
      enrollments,
      selectedStudentIds: [],
      selectedSubjectIds: [],
      selectedTeacherIds: ["tea-2"],
      applyFilter: true,
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("b");
  });
});

describe("planPdfExport — default branch", () => {
  it("default 1 plan 생성 + filterStudentId 첫번째 student 반영", () => {
    const result = planPdfExport({
      range: { startDate: "2026-05-04", endDate: "2026-05-10" },
      allSessionsRaw: [makeSession("a", 0, "10:00", "11:00")],
      enrollments: [],
      students: [makeStudent("stu-1", "홍길동")],
      teachers: [],
      selectedStudentIds: ["stu-1"],
      selectedSubjectIds: [],
      selectedTeacherIds: [],
      userTimeRange: { startHour: 9, endHour: 18 },
    });
    expect(result).toHaveLength(1);
    expect(result[0].options.title).toBe("홍길동 학생 시간표");
    expect(result[0].options.filterStudentId).toBe("stu-1");
    expect(result[0].options.weekRange).toEqual({
      startDate: "2026-05-04",
      endDate: "2026-05-10",
    });
  });

  it("default — selectedTeacher 첫번째 → title 반영", () => {
    const result = planPdfExport({
      range: { startDate: "2026-05-04", endDate: "2026-05-10" },
      allSessionsRaw: [makeSession("a", 0, "10:00", "11:00")],
      enrollments: [],
      students: [],
      teachers: [makeTeacher("tea-1", "김교사")],
      selectedStudentIds: [],
      selectedSubjectIds: [],
      selectedTeacherIds: ["tea-1"],
      userTimeRange: { startHour: 9, endHour: 18 },
    });
    expect(result[0].options.title).toBe("김교사 선생님 시간표");
  });

  it("default — 활성 필터 없으면 title undefined", () => {
    const result = planPdfExport({
      range: { startDate: "2026-05-04", endDate: "2026-05-10" },
      allSessionsRaw: [makeSession("a", 0, "10:00", "11:00")],
      enrollments: [],
      students: [],
      teachers: [],
      selectedStudentIds: [],
      selectedSubjectIds: [],
      selectedTeacherIds: [],
      userTimeRange: { startHour: 9, endHour: 18 },
    });
    expect(result[0].options.title).toBeUndefined();
  });
});

describe("planPdfExport — perStudent branch", () => {
  const enrollments: Enrollment[] = [
    { id: "e1", studentId: "stu-1", subjectId: "subj-1" },
    { id: "e2", studentId: "stu-2", subjectId: "subj-1" },
  ];
  const sessions: Session[] = [
    makeSession("a", 0, "09:00", "10:00", { enrollmentIds: ["e1"] }),
    makeSession("b", 1, "11:00", "12:00", { enrollmentIds: ["e2"] }),
  ];
  const students = [
    makeStudent("stu-1", "학생1"),
    makeStudent("stu-2", "학생2"),
  ];

  it("학생당 1 plan 생성", () => {
    const result = planPdfExport({
      range: {
        startDate: "2026-05-04",
        endDate: "2026-05-10",
        perStudent: true,
      },
      allSessionsRaw: sessions,
      enrollments,
      students,
      teachers: [],
      selectedStudentIds: [],
      selectedSubjectIds: [],
      selectedTeacherIds: [],
      userTimeRange: { startHour: 9, endHour: 18 },
    });
    expect(result).toHaveLength(2);
    expect(result[0].options.title).toBe("학생1 학생 시간표");
    expect(result[0].sessions).toHaveLength(1);
    expect(result[0].sessions[0].id).toBe("a");
    expect(result[1].options.title).toBe("학생2 학생 시간표");
    expect(result[1].sessions[0].id).toBe("b");
  });

  it("selectedStudentIds 지정 시 그 학생만", () => {
    const result = planPdfExport({
      range: {
        startDate: "2026-05-04",
        endDate: "2026-05-10",
        perStudent: true,
        selectedStudentIds: ["stu-2"],
      },
      allSessionsRaw: sessions,
      enrollments,
      students,
      teachers: [],
      selectedStudentIds: [],
      selectedSubjectIds: [],
      selectedTeacherIds: [],
      userTimeRange: { startHour: 9, endHour: 18 },
    });
    expect(result).toHaveLength(1);
    expect(result[0].options.title).toBe("학생2 학생 시간표");
  });

  it("sessions 없는 학생은 skip", () => {
    const result = planPdfExport({
      range: {
        startDate: "2026-05-04",
        endDate: "2026-05-10",
        perStudent: true,
      },
      allSessionsRaw: [], // 빈 sessions
      enrollments,
      students,
      teachers: [],
      selectedStudentIds: [],
      selectedSubjectIds: [],
      selectedTeacherIds: [],
      userTimeRange: { startHour: 9, endHour: 18 },
    });
    expect(result).toHaveLength(0);
  });

  it("filename 학생 이름 + startDate 조합", () => {
    const result = planPdfExport({
      range: {
        startDate: "2026-05-04",
        endDate: "2026-05-10",
        perStudent: true,
        selectedStudentIds: ["stu-1"],
      },
      allSessionsRaw: sessions,
      enrollments,
      students,
      teachers: [],
      selectedStudentIds: [],
      selectedSubjectIds: [],
      selectedTeacherIds: [],
      userTimeRange: { startHour: 9, endHour: 18 },
    });
    expect(result[0].options.filename).toBe("학생1_시간표_2026-05-04.pdf");
    expect(result[0].options.perStudent).toBe(true);
  });
});

describe("planPdfExport — perTeacher branch", () => {
  const sessions: Session[] = [
    makeSession("a", 0, "09:00", "10:00", { teacherId: "tea-1" }),
    makeSession("b", 1, "11:00", "12:00", { teacherId: "tea-2" }),
  ];
  const teachers = [
    makeTeacher("tea-1", "강사1"),
    makeTeacher("tea-2", "강사2"),
  ];

  it("강사당 1 plan 생성", () => {
    const result = planPdfExport({
      range: {
        startDate: "2026-05-04",
        endDate: "2026-05-10",
        perTeacher: true,
      },
      allSessionsRaw: sessions,
      enrollments: [],
      students: [],
      teachers,
      selectedStudentIds: [],
      selectedSubjectIds: [],
      selectedTeacherIds: [],
      userTimeRange: { startHour: 9, endHour: 18 },
    });
    expect(result).toHaveLength(2);
    expect(result[0].options.title).toBe("강사1 선생님 시간표");
    expect(result[0].sessions[0].id).toBe("a");
    expect(result[0].options.filterTeacherId).toBe("tea-1");
  });

  it("showStudentNames 기본 false", () => {
    const result = planPdfExport({
      range: {
        startDate: "2026-05-04",
        endDate: "2026-05-10",
        perTeacher: true,
      },
      allSessionsRaw: sessions,
      enrollments: [],
      students: [],
      teachers,
      selectedStudentIds: [],
      selectedSubjectIds: [],
      selectedTeacherIds: [],
      userTimeRange: { startHour: 9, endHour: 18 },
    });
    expect(result[0].options.showStudentNames).toBe(false);
  });

  it("range.showStudentNames=true 반영", () => {
    const result = planPdfExport({
      range: {
        startDate: "2026-05-04",
        endDate: "2026-05-10",
        perTeacher: true,
        showStudentNames: true,
      },
      allSessionsRaw: sessions,
      enrollments: [],
      students: [],
      teachers,
      selectedStudentIds: [],
      selectedSubjectIds: [],
      selectedTeacherIds: [],
      userTimeRange: { startHour: 9, endHour: 18 },
    });
    expect(result[0].options.showStudentNames).toBe(true);
  });

  it("teachers without sessions skip", () => {
    const result = planPdfExport({
      range: {
        startDate: "2026-05-04",
        endDate: "2026-05-10",
        perTeacher: true,
      },
      allSessionsRaw: [], // 빈 sessions
      enrollments: [],
      students: [],
      teachers,
      selectedStudentIds: [],
      selectedSubjectIds: [],
      selectedTeacherIds: [],
      userTimeRange: { startHour: 9, endHour: 18 },
    });
    expect(result).toHaveLength(0);
  });
});

describe("planPdfExport — applyFilter interaction", () => {
  it("화면 학생 필터 + applyFilter true → 필터된 sessions 만 plan", () => {
    const sessions: Session[] = [
      makeSession("a", 0, "09:00", "10:00", {
        enrollmentIds: ["e1"],
        subjectId: "subj-1",
      }),
      makeSession("b", 1, "11:00", "12:00", {
        enrollmentIds: ["e2"],
        subjectId: "subj-1",
      }),
    ];
    const enrollments: Enrollment[] = [
      { id: "e1", studentId: "stu-1", subjectId: "subj-1" },
      { id: "e2", studentId: "stu-2", subjectId: "subj-1" },
    ];
    const result = planPdfExport({
      range: { startDate: "2026-05-04", endDate: "2026-05-10" },
      allSessionsRaw: sessions,
      enrollments,
      students: [makeStudent("stu-1", "학생1")],
      teachers: [],
      selectedStudentIds: ["stu-1"], // 화면 필터
      selectedSubjectIds: [],
      selectedTeacherIds: [],
      userTimeRange: { startHour: 9, endHour: 18 },
    });
    expect(result).toHaveLength(1);
    expect(result[0].sessions).toHaveLength(1);
    expect(result[0].sessions[0].id).toBe("a");
  });

  it("화면 필터 + applyFilter false → 전체 sessions", () => {
    const sessions: Session[] = [
      makeSession("a", 0, "09:00", "10:00", {
        enrollmentIds: ["e1"],
        subjectId: "subj-1",
      }),
      makeSession("b", 1, "11:00", "12:00", {
        enrollmentIds: ["e2"],
        subjectId: "subj-1",
      }),
    ];
    const enrollments: Enrollment[] = [
      { id: "e1", studentId: "stu-1", subjectId: "subj-1" },
      { id: "e2", studentId: "stu-2", subjectId: "subj-1" },
    ];
    const result = planPdfExport({
      range: {
        startDate: "2026-05-04",
        endDate: "2026-05-10",
        applyFilter: false,
      },
      allSessionsRaw: sessions,
      enrollments,
      students: [makeStudent("stu-1", "학생1")],
      teachers: [],
      selectedStudentIds: ["stu-1"],
      selectedSubjectIds: [],
      selectedTeacherIds: [],
      userTimeRange: { startHour: 9, endHour: 18 },
    });
    expect(result).toHaveLength(1);
    expect(result[0].sessions).toHaveLength(2);
  });
});
