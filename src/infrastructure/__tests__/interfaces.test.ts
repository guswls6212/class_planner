/**
 * Infrastructure 인터페이스 기본 테스트
 */

import { describe, expect, it } from "vitest";

describe("Infrastructure 인터페이스", () => {
  it("인터페이스 모듈이 로드되어야 한다", async () => {
    const module = await import("../interfaces");
    expect(module).toBeDefined();
  });

  it("기본 인터페이스 구조가 유지되어야 한다", async () => {
    const module = await import("../interfaces");
    expect(typeof module).toBe("object");
  });
});
