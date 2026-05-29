import { describe, expect, it } from "vitest";
import {
  addWeeks,
  eachWeekStart,
  formatLocalISO,
  formatWeekRangeLabel,
  getMonthWeekRange,
  getWeekStart,
  instanceDateFromWeekStart,
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

describe("instanceDateFromWeekStart (출결 date key — teacher-schedule ↔ /attendance 공유)", () => {
  it("월요일(weekday=0)은 weekStart 그대로", () => {
    expect(instanceDateFromWeekStart("2026-05-18", 0)).toBe("2026-05-18");
  });
  it("수요일(weekday=2)은 +2일", () => {
    expect(instanceDateFromWeekStart("2026-05-18", 2)).toBe("2026-05-20");
  });
  it("일요일(weekday=6)은 +6일", () => {
    expect(instanceDateFromWeekStart("2026-05-18", 6)).toBe("2026-05-24");
  });
  it("월말 경계를 넘어간다", () => {
    // 2026-05-29(금) 주 월요일 = 2026-05-25, +6 → 2026-05-31(일)
    expect(instanceDateFromWeekStart("2026-05-25", 6)).toBe("2026-05-31");
    // 2026-06-29(월) 주, weekday=2 → 2026-07-01
    expect(instanceDateFromWeekStart("2026-06-29", 2)).toBe("2026-07-01");
  });
  it("순수 calendar 산술 — 입력 weekStart + weekday 로 결정적 (instant/timezone 비의존)", () => {
    // getWeekStart 와 round-trip 일치: 임의 날짜의 주 월요일 + 그 날 weekday = 원본 날짜
    const d = new Date(2026, 4, 22); // 5월 22일 (금) = weekday 4
    const weekStartISO = formatLocalISO(getWeekStart(d));
    expect(instanceDateFromWeekStart(weekStartISO, 4)).toBe(formatLocalISO(d));
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
