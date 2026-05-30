import { describe, it, expect } from "vitest";
import {
  computeScheduleTitle,
  computeScheduleDateLabels,
} from "../scheduleDateLabelHelpers";

describe("computeScheduleTitle", () => {
  it("daily → '일별 시간표'", () => {
    expect(computeScheduleTitle("daily")).toBe("일별 시간표");
  });
  it("weekly → '주간 시간표'", () => {
    expect(computeScheduleTitle("weekly")).toBe("주간 시간표");
  });
  it("monthly → '월별 시간표'", () => {
    expect(computeScheduleTitle("monthly")).toBe("월별 시간표");
  });
});

describe("computeScheduleDateLabels — daily", () => {
  it("daily 2026-05-07 (목) — full + short", () => {
    const date = new Date(2026, 4, 7); // Month is 0-indexed (5월 → 4)
    const result = computeScheduleDateLabels("daily", date);
    expect(result.dateLabel).toBe("2026년 5월 7일 (목)");
    expect(result.dateLabelShort).toBe("26년 5월");
  });

  it("daily 2026-01-01 (목)", () => {
    const date = new Date(2026, 0, 1);
    const result = computeScheduleDateLabels("daily", date);
    expect(result.dateLabel).toContain("2026년 1월 1일");
    expect(result.dateLabelShort).toBe("26년 1월");
  });

  it("daily 요일 인덱스 0=일", () => {
    const date = new Date(2026, 4, 3); // 2026-05-03 일요일
    const result = computeScheduleDateLabels("daily", date);
    expect(result.dateLabel).toContain("(일)");
  });
});

describe("computeScheduleDateLabels — weekly", () => {
  it("같은 달 같은 주 — short = '월'", () => {
    // 2026-05-07 (목) 의 주: 월=2026-05-04, 일=2026-05-10
    const date = new Date(2026, 4, 7);
    const result = computeScheduleDateLabels("weekly", date);
    expect(result.dateLabel).toBe("2026년 5월 4일 — 10일");
    expect(result.dateLabelShort).toBe("26년 5월");
  });

  it("달 걸침 같은 연도 — '월-월' 단축", () => {
    // 2026-04-30 (목) 의 주: 월=2026-04-27, 일=2026-05-03
    const date = new Date(2026, 3, 30);
    const result = computeScheduleDateLabels("weekly", date);
    // monMM=4, sunMM=5 → "26년 4-5월"
    expect(result.dateLabelShort).toBe("26년 4-5월");
    // dateLabel: start "2026년 4월 27일", end "5월 3일"
    expect(result.dateLabel).toContain("2026년 4월 27일");
    expect(result.dateLabel).toContain("5월 3일");
  });

  it("연도 걸침 — '년-년 월-월'", () => {
    // 2025-12-31 (수) 의 주: 월=2025-12-29, 일=2026-01-04
    const date = new Date(2025, 11, 31);
    const result = computeScheduleDateLabels("weekly", date);
    // monYY=25, sunYY=26, monMM=12, sunMM=1
    expect(result.dateLabelShort).toBe("25-26년 12-1월");
    expect(result.dateLabel).toContain("2025년 12월 29일");
    expect(result.dateLabel).toContain("2026년 1월 4일");
  });

  it("월요일을 selectedDate 로 지정", () => {
    // 2026-05-04 (월) 자체가 selectedDate
    const date = new Date(2026, 4, 4);
    const result = computeScheduleDateLabels("weekly", date);
    expect(result.dateLabel).toBe("2026년 5월 4일 — 10일");
  });

  it("일요일을 selectedDate 로 지정", () => {
    // 2026-05-10 (일) → 같은 주 (월=2026-05-04, 일=2026-05-10)
    const date = new Date(2026, 4, 10);
    const result = computeScheduleDateLabels("weekly", date);
    expect(result.dateLabel).toBe("2026년 5월 4일 — 10일");
  });
});

describe("computeScheduleDateLabels — monthly", () => {
  it("monthly 2026-05 → '2026년 5월'", () => {
    const date = new Date(2026, 4, 15);
    const result = computeScheduleDateLabels("monthly", date);
    expect(result.dateLabel).toBe("2026년 5월");
    expect(result.dateLabelShort).toBe("26년 5월");
  });

  it("monthly 2026-01", () => {
    const date = new Date(2026, 0, 1);
    const result = computeScheduleDateLabels("monthly", date);
    expect(result.dateLabel).toBe("2026년 1월");
    expect(result.dateLabelShort).toBe("26년 1월");
  });
});
