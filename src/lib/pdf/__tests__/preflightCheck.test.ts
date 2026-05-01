import { describe, it, expect } from "vitest";
import { preflightCheck } from "../preflightCheck";
import type { Session } from "@/lib/planner";

const s = (id: string, weekday: number, start: string, end: string, extra?: Partial<Session>): Session => ({
  id, weekday, startsAt: start, endsAt: end, weekStartDate: "2026-04-27", enrollmentIds: [], ...extra,
});

describe("preflightCheck — 시간 범위 밖 경고", () => {
  it("09:00 이전 세션이 있으면 out-of-range 경고를 반환한다", () => {
    const sessions = [s("a", 1, "08:30", "09:30")];
    const result = preflightCheck(sessions, {});
    expect(result.warnings.some((w) => w.type === "out-of-range")).toBe(true);
  });

  it("23:00 이후 세션이 있으면 out-of-range 경고를 반환한다", () => {
    const sessions = [s("a", 1, "23:00", "24:00")];
    const result = preflightCheck(sessions, {});
    expect(result.warnings.some((w) => w.type === "out-of-range")).toBe(true);
  });

  it("정상 시간 세션에서는 out-of-range 경고 없음", () => {
    const sessions = [s("a", 0, "10:00", "11:00")];
    const result = preflightCheck(sessions, {});
    expect(result.warnings.some((w) => w.type === "out-of-range")).toBe(false);
  });

  it("범위 밖 세션 수가 경고 메시지에 포함된다", () => {
    const sessions = [s("a", 1, "08:00", "09:00"), s("b", 2, "08:30", "09:00")];
    const result = preflightCheck(sessions, {});
    const warn = result.warnings.find((w) => w.type === "out-of-range");
    expect(warn?.message).toMatch(/2/);
  });
});

describe("preflightCheck — 겹침(lane) 경고", () => {
  it("같은 요일 동시간 4개 이상 세션이면 overlap 경고", () => {
    const sessions = [
      s("a", 0, "10:00", "12:00", { yPosition: 1 }),
      s("b", 0, "10:00", "12:00", { yPosition: 2 }),
      s("c", 0, "10:00", "12:00", { yPosition: 3 }),
      s("d", 0, "10:00", "12:00", { yPosition: 4 }),
    ];
    const result = preflightCheck(sessions, {});
    expect(result.warnings.some((w) => w.type === "overlap")).toBe(true);
  });

  it("같은 요일 동시간 3개 이하이면 overlap 경고 없음", () => {
    const sessions = [
      s("a", 0, "10:00", "12:00"),
      s("b", 0, "10:00", "12:00"),
      s("c", 0, "10:00", "12:00"),
    ];
    const result = preflightCheck(sessions, {});
    expect(result.warnings.some((w) => w.type === "overlap")).toBe(false);
  });

  it("overlap 경고 시 suggestSplit이 per-teacher가 된다", () => {
    const sessions = [
      s("a", 0, "10:00", "12:00"),
      s("b", 0, "10:00", "12:00"),
      s("c", 0, "10:00", "12:00"),
      s("d", 0, "10:00", "12:00"),
    ];
    const result = preflightCheck(sessions, {});
    expect(result.suggestSplit).toBe("per-teacher");
  });

  it("겹침 없으면 suggestSplit이 null", () => {
    const sessions = [s("a", 0, "10:00", "11:00"), s("b", 0, "11:00", "12:00")];
    const result = preflightCheck(sessions, {});
    expect(result.suggestSplit).toBeNull();
  });
});

describe("preflightCheck — 운영 요일 밖 경고", () => {
  it("operatingDays=[0,1,2,3,4,5] 설정 시 일요일(6) 세션은 out-of-operating-days 경고", () => {
    const sessions = [s("a", 6, "10:00", "11:00")];
    const result = preflightCheck(sessions, { operatingDays: [0, 1, 2, 3, 4, 5] });
    expect(result.warnings.some((w) => w.type === "out-of-operating-days")).toBe(true);
  });

  it("operatingDays 미설정 시 out-of-operating-days 경고 없음", () => {
    const sessions = [s("a", 6, "10:00", "11:00")];
    const result = preflightCheck(sessions, {});
    expect(result.warnings.some((w) => w.type === "out-of-operating-days")).toBe(false);
  });
});

describe("preflightCheck — 경고 없는 경우", () => {
  it("빈 세션 목록은 warnings=[], suggestSplit=null", () => {
    const result = preflightCheck([], {});
    expect(result.warnings).toHaveLength(0);
    expect(result.suggestSplit).toBeNull();
  });
});
