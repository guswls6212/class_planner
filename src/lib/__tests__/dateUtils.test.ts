import { describe, expect, it } from "vitest";
import {
  addWeeks,
  eachWeekStart,
  formatLocalISO,
  formatWeekRangeLabel,
  getMonthWeekRange,
  getWeekStart,
} from "../dateUtils";

// 모든 날짜 비교는 로컬 시간 기준 YYYY-MM-DD 문자열로 수행 (UTC offset 무관)

describe("getWeekStart (월요일 기준)", () => {
  it("수요일은 그 주 월요일로", () => {
    expect(formatLocalISO(getWeekStart(new Date("2026-04-15")))).toBe("2026-04-13");
  });
  it("일요일은 전 주 월요일로", () => {
    expect(formatLocalISO(getWeekStart(new Date("2026-04-19")))).toBe("2026-04-13");
  });
  it("월요일은 그대로", () => {
    expect(formatLocalISO(getWeekStart(new Date("2026-04-13")))).toBe("2026-04-13");
  });
  it("토요일은 그 주 월요일로", () => {
    expect(formatLocalISO(getWeekStart(new Date("2026-04-18")))).toBe("2026-04-13");
  });
});

describe("addWeeks", () => {
  it("주 N개 더하기", () => {
    expect(formatLocalISO(addWeeks(new Date("2026-04-13"), 2))).toBe("2026-04-27");
  });
  it("음수도 동작", () => {
    expect(formatLocalISO(addWeeks(new Date("2026-04-13"), -1))).toBe("2026-04-06");
  });
  it("0은 원본 날짜 반환", () => {
    expect(formatLocalISO(addWeeks(new Date("2026-04-13"), 0))).toBe("2026-04-13");
  });
});

describe("eachWeekStart", () => {
  it("시작·끝 포함 주 월요일 배열 반환", () => {
    const mondays = eachWeekStart(new Date("2026-04-13"), new Date("2026-05-03"));
    expect(mondays.map(formatLocalISO)).toEqual([
      "2026-04-13",
      "2026-04-20",
      "2026-04-27",
    ]);
  });
  it("같은 주 시작·끝이면 1개 반환", () => {
    const mondays = eachWeekStart(new Date("2026-04-15"), new Date("2026-04-17"));
    expect(mondays).toHaveLength(1);
  });
  it("시작이 월요일 아닌 날이어도 해당 주 월요일부터", () => {
    const mondays = eachWeekStart(new Date("2026-04-15"), new Date("2026-04-20"));
    expect(mondays.map(formatLocalISO)).toEqual(["2026-04-13", "2026-04-20"]);
  });
});

describe("formatWeekRangeLabel", () => {
  it("M/D – M/D 포맷 (월요일 기준)", () => {
    expect(formatWeekRangeLabel(new Date("2026-04-13"))).toBe("4/13 – 4/19");
  });
  it("월말 경계 (4/27 주 → 5/3)", () => {
    expect(formatWeekRangeLabel(new Date("2026-04-27"))).toBe("4/27 – 5/3");
  });
});

describe("formatLocalISO", () => {
  it("로컬 시간 기준 YYYY-MM-DD 반환", () => {
    const d = new Date(2026, 3, 13); // 4월 13일 (로컬)
    expect(formatLocalISO(d)).toBe("2026-04-13");
  });
});

describe("getMonthWeekRange", () => {
  it("해당 월의 첫·마지막 날을 포함하는 주 범위 반환 (4월)", () => {
    // 2026-04-01은 수요일 → 해당 주 월요일 = 2026-03-30
    // 2026-04-30은 목요일 → endDate = 2026-04-30
    const { start, end } = getMonthWeekRange(2026, 4);
    expect(formatLocalISO(start)).toBe("2026-03-30");
    expect(formatLocalISO(end)).toBe("2026-04-30");
  });
  it("1월 1일이 월요일이면 start = 1월 1일", () => {
    // 2024-01-01은 월요일
    const { start } = getMonthWeekRange(2024, 1);
    expect(formatLocalISO(start)).toBe("2024-01-01");
  });
});
