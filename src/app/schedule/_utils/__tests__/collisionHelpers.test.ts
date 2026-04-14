import { describe, expect, it } from "vitest";
import { isTimeOverlapping } from "../collisionHelpers";

describe("isTimeOverlapping", () => {
  it("겹치는 시간 구간을 감지한다", () => {
    expect(isTimeOverlapping("09:00", "10:00", "09:30", "10:30")).toBe(true);
  });

  it("겹치지 않는 시간 구간은 false를 반환한다", () => {
    expect(isTimeOverlapping("09:00", "10:00", "10:00", "11:00")).toBe(false);
  });

  it("완전히 포함되는 구간을 감지한다", () => {
    expect(isTimeOverlapping("09:00", "12:00", "10:00", "11:00")).toBe(true);
  });

  it("동일한 시간 구간은 겹침이다", () => {
    expect(isTimeOverlapping("09:00", "10:00", "09:00", "10:00")).toBe(true);
  });

  it("인접한 구간 (끝=시작)은 겹치지 않는다", () => {
    expect(isTimeOverlapping("09:00", "10:00", "10:00", "11:00")).toBe(false);
    expect(isTimeOverlapping("10:00", "11:00", "09:00", "10:00")).toBe(false);
  });

  it("앞뒤 역순도 동일하게 동작한다", () => {
    expect(isTimeOverlapping("10:00", "11:00", "09:30", "10:30")).toBe(true);
  });
});
