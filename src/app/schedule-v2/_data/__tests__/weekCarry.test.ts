import { describe, it, expect } from "vitest";
import type { Enrollment, Session } from "@/lib/planner";
import {
  carryForwardSessions,
  emptyWeekFlagKey,
  previousWeekWithData,
} from "../weekCarry";

function sess(over: Partial<Session> & { id: string; weekStartDate: string }): Session {
  return {
    subjectId: "subj-1",
    enrollmentIds: ["enr-1"],
    weekday: 0,
    startsAt: "14:00",
    endsAt: "15:00",
    room: "",
    yPosition: 1,
    ...over,
  } as Session;
}

const enr = (id: string): Enrollment => ({ id, studentId: `stu-${id}`, subjectId: "subj-1" });

describe("previousWeekWithData", () => {
  it("현재 주 이전에서 가장 가까운 데이터 주를 고른다", () => {
    const sessions = [
      sess({ id: "a", weekStartDate: "2026-05-18" }),
      sess({ id: "b", weekStartDate: "2026-05-25" }),
    ];
    expect(previousWeekWithData(sessions, "2026-06-01")).toBe("2026-05-25");
  });

  it("현재 주/미래 주는 소스로 쓰지 않는다", () => {
    const sessions = [
      sess({ id: "a", weekStartDate: "2026-06-01" }), // 현재 주
      sess({ id: "b", weekStartDate: "2026-06-08" }), // 미래
    ];
    expect(previousWeekWithData(sessions, "2026-06-01")).toBeNull();
  });

  it("데이터가 없으면 null", () => {
    expect(previousWeekWithData([], "2026-06-01")).toBeNull();
  });
});

describe("carryForwardSessions", () => {
  it("소스 주 세션을 새 id + 대상 주로 clone, enrollmentIds 재사용", () => {
    const sessions = [
      sess({ id: "src-1", weekStartDate: "2026-05-25", enrollmentIds: ["enr-1"], weekday: 0 }),
      sess({ id: "src-2", weekStartDate: "2026-05-25", enrollmentIds: ["enr-2"], weekday: 2 }),
      sess({ id: "other", weekStartDate: "2026-05-18", enrollmentIds: ["enr-1"] }), // 다른 주 — 제외
    ];
    let n = 0;
    const cloned = carryForwardSessions({
      sessions,
      enrollments: [enr("enr-1"), enr("enr-2")],
      sourceMonday: "2026-05-25",
      targetMonday: "2026-06-01",
      genId: () => `new-${++n}`,
    });
    expect(cloned).toHaveLength(2);
    expect(cloned.map((s) => s.id)).toEqual(["new-1", "new-2"]);
    expect(cloned.every((s) => s.weekStartDate === "2026-06-01")).toBe(true);
    expect(cloned[0].enrollmentIds).toEqual(["enr-1"]);
    expect(cloned[0].weekday).toBe(0);
    expect(cloned[1].weekday).toBe(2);
  });

  it("퇴원 학생(없어진 enrollment)은 enrollmentIds에서 제외", () => {
    const sessions = [
      sess({ id: "src", weekStartDate: "2026-05-25", enrollmentIds: ["enr-1", "gone"] }),
    ];
    const cloned = carryForwardSessions({
      sessions,
      enrollments: [enr("enr-1")], // "gone" 없음
      sourceMonday: "2026-05-25",
      targetMonday: "2026-06-01",
      genId: () => "x",
    });
    expect(cloned).toHaveLength(1);
    expect(cloned[0].enrollmentIds).toEqual(["enr-1"]);
  });

  it("유효 enrollment 0이면 그 세션은 통째로 제외(빈 세션 방지)", () => {
    const sessions = [
      sess({ id: "ghost", weekStartDate: "2026-05-25", enrollmentIds: ["gone"] }),
    ];
    const cloned = carryForwardSessions({
      sessions,
      enrollments: [enr("enr-1")],
      sourceMonday: "2026-05-25",
      targetMonday: "2026-06-01",
      genId: () => "x",
    });
    expect(cloned).toHaveLength(0);
  });
});

describe("emptyWeekFlagKey", () => {
  it("uid + monday 로 키 생성, uid 없으면 anonymous", () => {
    expect(emptyWeekFlagKey("u1", "2026-06-01")).toBe("cp:v2-empty-week:u1:2026-06-01");
    expect(emptyWeekFlagKey(null, "2026-06-01")).toBe("cp:v2-empty-week:anonymous:2026-06-01");
  });
});
