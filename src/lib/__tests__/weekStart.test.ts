import { describe, it, expect } from "vitest";
import { getWeekStartDate, parseDateToWeekStart } from "../weekStart";

describe("getWeekStartDate", () => {
  it("월요일을 입력하면 그대로 반환", () => {
    expect(getWeekStartDate(new Date("2026-04-27T12:00:00+09:00"))).toBe("2026-04-27");
  });

  it("일요일을 입력하면 같은 주 월요일 반환", () => {
    expect(getWeekStartDate(new Date("2026-05-03T12:00:00+09:00"))).toBe("2026-04-27");
  });

  it("Asia/Seoul timezone 기준으로 계산 (UTC 자정 경계 케이스)", () => {
    // UTC 2026-04-27T15:00:00 = KST 2026-04-28T00:00 (화) → 그 주 월 = "2026-04-27"
    expect(getWeekStartDate(new Date("2026-04-27T15:00:00Z"))).toBe("2026-04-27");
  });

  it("연말 경계 (다음 해로 넘어가는 주)", () => {
    // 2026-12-31 (목) → 그 주 월 = "2026-12-28"
    expect(getWeekStartDate(new Date("2026-12-31T12:00:00+09:00"))).toBe("2026-12-28");
  });
});

describe("parseDateToWeekStart", () => {
  it("ISO date 문자열 입력", () => {
    expect(parseDateToWeekStart("2026-05-03")).toBe("2026-04-27");
  });
});
