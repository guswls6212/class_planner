import { describe, it, expect } from "vitest";
import { buildTemplateDataPure } from "../buildTemplateData";
import type {
  Session,
  Teacher,
  Subject,
  Enrollment,
  Student,
} from "@/lib/planner";

const teacher = (id: string, name: string): Teacher => ({
  id,
  name,
  color: "#000",
  userId: null,
});

const subject = (id: string, name: string, color = "#FFF"): Subject => ({
  id,
  name,
  color,
});

const enrollment = (
  id: string,
  studentId: string,
  subjectId: string
): Enrollment => ({
  id,
  studentId,
  subjectId,
});

const student = (id: string, name: string): Student => ({
  id,
  name,
});

const baseSession = (overrides: Partial<Session> = {}): Session => ({
  id: "sess-1",
  subjectId: "sub-1",
  enrollmentIds: ["enr-1"],
  weekday: 0,
  startsAt: "09:00",
  endsAt: "10:00",
  weekStartDate: "2026-04-27",
  ...overrides,
});

describe("buildTemplateDataPure", () => {
  it("Session에 teacherId가 있으면 결과에 teacherId/teacherName이 포함된다", () => {
    const result = buildTemplateDataPure({
      sessions: [baseSession({ teacherId: "tc-1" })],
      teachers: [teacher("tc-1", "김선생")],
      subjects: [subject("sub-1", "수학", "#F00")],
      enrollments: [enrollment("enr-1", "st-1", "sub-1")],
      students: [student("st-1", "홍길동")],
    });

    expect(result.sessions[0].teacherId).toBe("tc-1");
    expect(result.sessions[0].teacherName).toBe("김선생");
  });

  it("Session.teacherId가 null이면 결과에 teacher 필드가 없다", () => {
    const result = buildTemplateDataPure({
      sessions: [baseSession({ teacherId: null })],
      teachers: [teacher("tc-1", "김선생")],
      subjects: [subject("sub-1", "수학")],
      enrollments: [enrollment("enr-1", "st-1", "sub-1")],
      students: [student("st-1", "홍길동")],
    });

    expect(result.sessions[0]).not.toHaveProperty("teacherId");
    expect(result.sessions[0]).not.toHaveProperty("teacherName");
  });

  it("teacherId가 있지만 teachers에서 매칭 실패 시 teacher 필드는 미포함 (defensive)", () => {
    const result = buildTemplateDataPure({
      sessions: [baseSession({ teacherId: "missing-tc" })],
      teachers: [teacher("tc-2", "다른선생")],
      subjects: [subject("sub-1", "수학")],
      enrollments: [enrollment("enr-1", "st-1", "sub-1")],
      students: [student("st-1", "홍길동")],
    });

    expect(result.sessions[0]).not.toHaveProperty("teacherId");
    expect(result.sessions[0]).not.toHaveProperty("teacherName");
  });

  it("room/yPosition은 그대로 보존된다 (round-trip 보장)", () => {
    const result = buildTemplateDataPure({
      sessions: [baseSession({ room: "A101", yPosition: 3 })],
      teachers: [],
      subjects: [subject("sub-1", "수학")],
      enrollments: [enrollment("enr-1", "st-1", "sub-1")],
      students: [student("st-1", "홍길동")],
    });

    expect(result.sessions[0].room).toBe("A101");
    expect(result.sessions[0].yPosition).toBe(3);
  });

  it("room/yPosition이 없으면 결과에도 미포함", () => {
    const result = buildTemplateDataPure({
      sessions: [baseSession({})],
      teachers: [],
      subjects: [subject("sub-1", "수학")],
      enrollments: [enrollment("enr-1", "st-1", "sub-1")],
      students: [student("st-1", "홍길동")],
    });

    expect(result.sessions[0]).not.toHaveProperty("room");
    expect(result.sessions[0]).not.toHaveProperty("yPosition");
  });

  it("studentIds/studentNames는 enrollmentIds 순서대로 매핑된다", () => {
    const result = buildTemplateDataPure({
      sessions: [baseSession({ enrollmentIds: ["enr-1", "enr-2"] })],
      teachers: [],
      subjects: [subject("sub-1", "수학")],
      enrollments: [
        enrollment("enr-1", "st-1", "sub-1"),
        enrollment("enr-2", "st-2", "sub-1"),
      ],
      students: [student("st-1", "홍길동"), student("st-2", "김영수")],
    });

    expect(result.sessions[0].studentIds).toEqual(["st-1", "st-2"]);
    expect(result.sessions[0].studentNames).toEqual(["홍길동", "김영수"]);
  });

  it("subject 미발견이면 미지정 + 빈 id + 기본 색상으로 fallback", () => {
    const result = buildTemplateDataPure({
      sessions: [baseSession({})],
      teachers: [],
      subjects: [],
      enrollments: [enrollment("enr-1", "st-1", "sub-1")],
      students: [student("st-1", "홍길동")],
    });

    expect(result.sessions[0].subjectId).toBe("");
    expect(result.sessions[0].subjectName).toBe("미지정");
    expect(result.sessions[0].subjectColor).toBe("#6366f1");
  });

  it("enrollment 매칭 실패한 학생은 결과에서 제외된다", () => {
    const result = buildTemplateDataPure({
      sessions: [baseSession({ enrollmentIds: ["enr-1", "missing-enr"] })],
      teachers: [],
      subjects: [subject("sub-1", "수학")],
      enrollments: [enrollment("enr-1", "st-1", "sub-1")],
      students: [student("st-1", "홍길동")],
    });

    expect(result.sessions[0].studentIds).toEqual(["st-1"]);
    expect(result.sessions[0].studentNames).toEqual(["홍길동"]);
  });

  it("여러 세션을 모두 직렬화한다", () => {
    const result = buildTemplateDataPure({
      sessions: [
        baseSession({ id: "s1", teacherId: "tc-1" }),
        baseSession({ id: "s2", weekday: 2, teacherId: null }),
      ],
      teachers: [teacher("tc-1", "김선생")],
      subjects: [subject("sub-1", "수학")],
      enrollments: [enrollment("enr-1", "st-1", "sub-1")],
      students: [student("st-1", "홍길동")],
    });

    expect(result.sessions).toHaveLength(2);
    expect(result.sessions[0].teacherId).toBe("tc-1");
    expect(result.sessions[1]).not.toHaveProperty("teacherId");
    expect(result.sessions[1].weekday).toBe(2);
  });

  it("version은 항상 1.0", () => {
    const result = buildTemplateDataPure({
      sessions: [],
      teachers: [],
      subjects: [],
      enrollments: [],
      students: [],
    });
    expect(result.version).toBe("1.0");
    expect(result.sessions).toEqual([]);
  });
});
