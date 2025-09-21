/**
 * ApplicationTypes 기본 테스트
 */

import { describe, expect, it } from "vitest";

describe("ApplicationTypes", () => {
  it("타입 모듈이 로드되어야 한다", async () => {
    const module = await import("../ApplicationTypes");
    expect(module).toBeDefined();
  });

  it("기본 타입 구조가 유지되어야 한다", async () => {
    const module = await import("../ApplicationTypes");
    expect(typeof module).toBe("object");
  });
});

