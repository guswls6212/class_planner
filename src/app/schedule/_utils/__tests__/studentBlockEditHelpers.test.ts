import { describe, it, expect } from "vitest";
import {
  planStudentBlockEdit,
  planStudentBlockDelete,
  buildSessionSyncPayload,
} from "../studentBlockEditHelpers";
import type { Session, Enrollment, Subject } from "@/lib/planner";

// 실데이터 형상: 사회 화 14:00–15:00 = 이서준·정수아·최민준(공유 세션), 국어 박지수(1인).
const enrollments: Enrollment[] = [
  { id: "e1", studentId: "stu-seojun", subjectId: "subj-social" },
  { id: "e2", studentId: "stu-suah", subjectId: "subj-social" },
  { id: "e3", studentId: "stu-minjun", subjectId: "subj-social" },
  { id: "e4", studentId: "stu-jisu", subjectId: "subj-korean" },
];
const subjects: Subject[] = [
  { id: "subj-social", name: "사회", color: "#8b5cf6" },
  { id: "subj-korean", name: "국어", color: "#10b981" },
];
function baseSessions(): Session[] {
  return [
    {
      id: "s1",
      subjectId: "subj-social",
      weekday: 1,
      startsAt: "14:00",
      endsAt: "15:00",
      weekStartDate: "2026-06-01",
      room: "",
      enrollmentIds: ["e1", "e2", "e3"],
      yPosition: 1,
    },
    {
      id: "s2",
      subjectId: "subj-korean",
      weekday: 1,
      startsAt: "13:00",
      endsAt: "14:00",
      weekStartDate: "2026-06-01",
      room: "",
      enrollmentIds: ["e4"],
      yPosition: 1,
    },
  ];
}

describe("planStudentBlockEdit", () => {
  it("다인 세션 편집 → 그 학생만 새 1인 세션으로 분리, 나머지는 그대로", () => {
    const plan = planStudentBlockEdit({
      sessionId: "s1",
      enrollmentId: "e1",
      input: { startTime: "13:30", endTime: "14:30", weekday: 1, teacherId: null },
      sessions: baseSessions(),
      enrollments,
      subjects,
      genId: () => "split-1",
    });

    expect(plan.didSplit).toBe(true);
    // 원본: e1 빠지고 e2,e3 만 — 시간 유지
    expect(plan.updatedOriginal?.enrollmentIds).toEqual(["e2", "e3"]);
    expect(plan.updatedOriginal?.startsAt).toBe("14:00");
    expect(plan.updatedOriginal?.endsAt).toBe("15:00");
    // 새 세션: e1 만 + 새 시간 + 메타 승계
    expect(plan.newSession?.id).toBe("split-1");
    expect(plan.newSession?.enrollmentIds).toEqual(["e1"]);
    expect(plan.newSession?.startsAt).toBe("13:30");
    expect(plan.newSession?.endsAt).toBe("14:30");
    expect(plan.newSession?.weekStartDate).toBe("2026-06-01");
    expect(plan.newSession?.subjectId).toBe("subj-social");
    // 세션 행: s1(reduced) + s2 + new = 3
    expect(plan.mergedSessions).toHaveLength(3);
  });

  it("1인 세션 편집 → 제자리 수정(분리 없음, 행 수 동일)", () => {
    const plan = planStudentBlockEdit({
      sessionId: "s2",
      enrollmentId: "e4",
      input: { startTime: "13:30", endTime: "14:30", weekday: 1, teacherId: null },
      sessions: baseSessions(),
      enrollments,
      subjects,
      genId: () => "should-not-be-used",
    });

    expect(plan.didSplit).toBe(false);
    expect(plan.newSession).toBeUndefined();
    expect(plan.inPlaceSession?.id).toBe("s2");
    expect(plan.inPlaceSession?.startsAt).toBe("13:30");
    expect(plan.inPlaceSession?.endsAt).toBe("14:30");
    expect(plan.mergedSessions).toHaveLength(2);
  });

  it("분리 시 강사 변경은 새 세션에만, 원본 강사는 유지", () => {
    const sessions = baseSessions().map((s) =>
      s.id === "s1" ? { ...s, teacherId: "t-old" } : s,
    );
    const plan = planStudentBlockEdit({
      sessionId: "s1",
      enrollmentId: "e1",
      input: { startTime: "14:00", endTime: "15:00", weekday: 1, teacherId: "t-new" },
      sessions,
      enrollments,
      subjects,
      genId: () => "split-2",
    });

    expect(plan.newSession?.teacherId).toBe("t-new");
    expect(plan.updatedOriginal?.teacherId).toBe("t-old");
  });

  it("존재하지 않는 세션 → no-op", () => {
    const plan = planStudentBlockEdit({
      sessionId: "nope",
      enrollmentId: "e1",
      input: { startTime: "13:30", endTime: "14:30" },
      sessions: baseSessions(),
      enrollments,
      subjects,
      genId: () => "x",
    });
    expect(plan.didSplit).toBe(false);
    expect(plan.mergedSessions).toHaveLength(2);
  });
});

describe("planStudentBlockDelete", () => {
  it("다인 세션 삭제 → enrollment 만 제거, 세션 유지(행 수 동일)", () => {
    const plan = planStudentBlockDelete({
      sessionId: "s1",
      enrollmentId: "e1",
      sessions: baseSessions(),
      enrollments,
    });
    expect(plan.shouldDeleteSession).toBe(false);
    expect(plan.updatedOriginal?.enrollmentIds).toEqual(["e2", "e3"]);
    expect(plan.mergedSessions).toHaveLength(2);
  });

  it("1인 세션 삭제 → 세션 통째 삭제 위임(deleteSession)", () => {
    const plan = planStudentBlockDelete({
      sessionId: "s2",
      enrollmentId: "e4",
      sessions: baseSessions(),
      enrollments,
    });
    expect(plan.shouldDeleteSession).toBe(true);
    expect(plan.updatedOriginal).toBeUndefined();
  });
});

describe("buildSessionSyncPayload", () => {
  it("PUT 필수 필드 모두 포함 + subjectId 미설정 시 enrollment 에서 유도", () => {
    // subjectId 없는 세션(서버 로드 시 파생값 비어있는 경우 모사)
    const s: Session = {
      id: "x",
      weekday: 1,
      startsAt: "14:00",
      endsAt: "15:00",
      weekStartDate: "2026-06-01",
      room: "",
      enrollmentIds: ["e2", "e3"],
      yPosition: 1,
    };
    const payload = buildSessionSyncPayload(s, enrollments);
    expect(payload.enrollmentIds).toEqual(["e2", "e3"]);
    expect(payload.subjectId).toBe("subj-social"); // e2 에서 유도
    expect(payload.weekday).toBe(1);
    expect(payload.startsAt).toBe("14:00");
    expect(payload.endsAt).toBe("15:00");
    expect(payload.teacherId).toBeNull();
  });
});
