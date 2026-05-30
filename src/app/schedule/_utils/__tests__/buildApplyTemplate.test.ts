import { describe, it, expect } from "vitest";
import { buildApplyTemplatePayload } from "../buildApplyTemplate";
import type {
  Subject,
  Student,
  Teacher,
  Enrollment,
} from "@/lib/planner";
import type { ScheduleTemplate } from "@/shared/types/templateTypes";

// ─── Fixtures ────────────────────────────────────────────

const subject = (id: string, name: string, color = "#FFF"): Subject => ({
  id,
  name,
  color,
});

const student = (id: string, name: string): Student => ({
  id,
  name,
});

const teacher = (id: string, name: string): Teacher => ({
  id,
  name,
  color: "#000",
  userId: null,
});

const enrollment = (
  id: string,
  studentId: string,
  subjectId: string,
): Enrollment => ({
  id,
  studentId,
  subjectId,
});

const template = (
  sessions: ScheduleTemplate["templateData"]["sessions"],
): ScheduleTemplate => ({
  id: "tpl-1",
  name: "기본템플릿",
  description: null,
  templateData: { version: "1.0", sessions },
  slotIndex: 0,
  createdBy: "user-1",
  createdAt: "2026-05-04T00:00:00Z",
  updatedAt: "2026-05-04T00:00:00Z",
});

// 결정적 id 생성기 (g-0, g-1, ...)
const makeIdGen = () => {
  let n = 0;
  return () => `g-${n++}`;
};

const baseCtx = (overrides: Partial<Parameters<typeof buildApplyTemplatePayload>[1]> = {}) => ({
  subjects: [subject("sub-math", "수학"), subject("sub-eng", "영어")],
  students: [student("st-1", "홍길동"), student("st-2", "김철수")],
  teachers: [teacher("tc-1", "김선생")],
  enrollments: [],
  weekStartDate: "2026-05-11",
  generateId: makeIdGen(),
  ...overrides,
});

// ─── Tests ───────────────────────────────────────────────

describe("buildApplyTemplatePayload", () => {
  it("매칭 성공 시 newSessions 가 templateData.sessions 길이만큼 생성된다", () => {
    const tpl = template([
      {
        weekday: 0,
        startsAt: "09:00",
        endsAt: "10:00",
        subjectId: "sub-math",
        subjectName: "수학",
        subjectColor: "#F00",
        studentIds: ["st-1"],
        studentNames: ["홍길동"],
      },
      {
        weekday: 1,
        startsAt: "10:00",
        endsAt: "11:00",
        subjectId: "sub-eng",
        subjectName: "영어",
        subjectColor: "#0F0",
        studentIds: ["st-2"],
        studentNames: ["김철수"],
      },
    ]);

    const result = buildApplyTemplatePayload(tpl, baseCtx());

    expect(result.newSessions).toHaveLength(2);
    expect(result.missingEntities).toHaveLength(0);
  });

  it("9개 sessions 모두 같은 (weekday, time) 이어도 모두 build 된다 (yPosition collision 무시)", () => {
    // R3 회귀 가드 — collision 처리는 호출 측 (repositionSessionsUtil) 책임.
    // helper 는 9개를 그대로 만들어야 한다.
    const sessions = Array.from({ length: 9 }, () => ({
      weekday: 2,
      startsAt: "11:30",
      endsAt: "16:30",
      subjectId: "sub-math",
      subjectName: "수학",
      subjectColor: "#F00",
      studentIds: ["st-1"],
      studentNames: ["홍길동"],
      yPosition: 1,
    }));
    const tpl = template(sessions);

    const result = buildApplyTemplatePayload(tpl, baseCtx());

    expect(result.newSessions).toHaveLength(9);
    // 모든 session 이 yPosition=1 그대로 (helper 는 reposition 안 함)
    expect(result.newSessions.every((s) => s.yPosition === 1)).toBe(true);
  });

  it("subject 매칭 실패 시 session 건너뛰고 missingEntities 추가", () => {
    const tpl = template([
      {
        weekday: 0,
        startsAt: "09:00",
        endsAt: "10:00",
        subjectId: "sub-missing",
        subjectName: "사라진과목",
        subjectColor: "#000",
        studentIds: ["st-1"],
        studentNames: ["홍길동"],
      },
    ]);

    const result = buildApplyTemplatePayload(tpl, baseCtx());

    expect(result.newSessions).toHaveLength(0);
    expect(result.missingEntities).toContain('과목 "사라진과목"');
  });

  it("매칭된 학생이 0명이면 session 자체를 건너뛴다", () => {
    const tpl = template([
      {
        weekday: 0,
        startsAt: "09:00",
        endsAt: "10:00",
        subjectId: "sub-math",
        subjectName: "수학",
        subjectColor: "#F00",
        studentIds: ["st-removed"],
        studentNames: ["사라진학생"],
      },
    ]);

    const result = buildApplyTemplatePayload(tpl, baseCtx());

    expect(result.newSessions).toHaveLength(0);
    expect(result.missingEntities).toContain('학생 "사라진학생"');
  });

  it("teacher 매칭 실패 시 session 은 진행하지만 teacherId 미포함", () => {
    const tpl = template([
      {
        weekday: 0,
        startsAt: "09:00",
        endsAt: "10:00",
        subjectId: "sub-math",
        subjectName: "수학",
        subjectColor: "#F00",
        studentIds: ["st-1"],
        studentNames: ["홍길동"],
        teacherId: "tc-missing",
        teacherName: "사라진강사",
      },
    ]);

    const result = buildApplyTemplatePayload(tpl, baseCtx());

    expect(result.newSessions).toHaveLength(1);
    expect(result.newSessions[0]).not.toHaveProperty("teacherId");
    expect(result.missingEntities).toContain('강사 "사라진강사"');
  });

  it("기존 enrollment 가 있으면 재사용, 없으면 새로 생성", () => {
    const ctx = baseCtx({
      enrollments: [enrollment("enr-existing", "st-1", "sub-math")],
    });
    const tpl = template([
      {
        weekday: 0,
        startsAt: "09:00",
        endsAt: "10:00",
        subjectId: "sub-math",
        subjectName: "수학",
        subjectColor: "#F00",
        studentIds: ["st-1", "st-2"],
        studentNames: ["홍길동", "김철수"],
      },
    ]);

    const result = buildApplyTemplatePayload(tpl, ctx);

    expect(result.newSessions).toHaveLength(1);
    // st-1 → 기존 enrollment 재사용, st-2 → 신규
    expect(result.newEnrollments).toHaveLength(1);
    expect(result.newEnrollments[0].studentId).toBe("st-2");
    expect(result.newEnrollments[0].subjectId).toBe("sub-math");
    // session.enrollmentIds 에 둘 다 포함
    expect(result.newSessions[0].enrollmentIds).toContain("enr-existing");
  });

  it("모든 session 의 weekStartDate 가 ctx.weekStartDate 로 통일된다", () => {
    const tpl = template([
      {
        weekday: 0,
        startsAt: "09:00",
        endsAt: "10:00",
        subjectId: "sub-math",
        subjectName: "수학",
        subjectColor: "#F00",
        studentIds: ["st-1"],
        studentNames: ["홍길동"],
      },
      {
        weekday: 3,
        startsAt: "14:00",
        endsAt: "15:00",
        subjectId: "sub-eng",
        subjectName: "영어",
        subjectColor: "#0F0",
        studentIds: ["st-2"],
        studentNames: ["김철수"],
      },
    ]);

    const result = buildApplyTemplatePayload(
      tpl,
      baseCtx({ weekStartDate: "2026-05-11" }),
    );

    expect(result.newSessions.every((s) => s.weekStartDate === "2026-05-11")).toBe(
      true,
    );
  });

  it("yPosition 미지정 시 기본 1", () => {
    const tpl = template([
      {
        weekday: 0,
        startsAt: "09:00",
        endsAt: "10:00",
        subjectId: "sub-math",
        subjectName: "수학",
        subjectColor: "#F00",
        studentIds: ["st-1"],
        studentNames: ["홍길동"],
        // yPosition 없음
      },
    ]);

    const result = buildApplyTemplatePayload(tpl, baseCtx());

    expect(result.newSessions[0].yPosition).toBe(1);
  });

  it("부분 매칭 — 일부 session 만 성공 + missingEntities 누적", () => {
    const tpl = template([
      {
        weekday: 0,
        startsAt: "09:00",
        endsAt: "10:00",
        subjectId: "sub-math", // ✓ 매칭
        subjectName: "수학",
        subjectColor: "#F00",
        studentIds: ["st-1"],
        studentNames: ["홍길동"],
      },
      {
        weekday: 1,
        startsAt: "10:00",
        endsAt: "11:00",
        subjectId: "sub-gone", // ✗ 과목 없음
        subjectName: "사라진과목",
        subjectColor: "#000",
        studentIds: ["st-1"],
        studentNames: ["홍길동"],
      },
      {
        weekday: 2,
        startsAt: "11:00",
        endsAt: "12:00",
        subjectId: "sub-eng", // ✓ 과목 매칭
        subjectName: "영어",
        subjectColor: "#0F0",
        studentIds: ["st-removed"], // ✗ 학생 없음 → session skip
        studentNames: ["사라진학생"],
      },
    ]);

    const result = buildApplyTemplatePayload(tpl, baseCtx());

    expect(result.newSessions).toHaveLength(1);
    expect(result.missingEntities).toEqual(
      expect.arrayContaining(['과목 "사라진과목"', '학생 "사라진학생"']),
    );
  });
});
