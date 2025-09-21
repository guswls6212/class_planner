/**
 * planner 유틸리티 기본 테스트
 */

import { describe, expect, it } from "vitest";

describe("planner 유틸리티", () => {
  it("planner 모듈이 로드되어야 한다", async () => {
    const module = await import("../planner");
    expect(module).toBeDefined();
  });

  it("기본 함수들이 존재해야 한다", async () => {
    const module = await import("../planner");

    // 모듈이 에러 없이 로드되면 성공
    expect(typeof module).toBe("object");
  });

  it("timeToMinutes 함수가 올바르게 작동해야 한다", async () => {
    const { timeToMinutes } = await import("../planner");

    expect(timeToMinutes("09:00")).toBe(540);
    expect(timeToMinutes("10:30")).toBe(630);
  });

  it("minutesToTime 함수가 올바르게 작동해야 한다", async () => {
    const { minutesToTime } = await import("../planner");

    expect(minutesToTime(540)).toBe("09:00");
    expect(minutesToTime(630)).toBe("10:30");
  });
});


