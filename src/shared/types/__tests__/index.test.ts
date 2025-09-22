/**
 * Shared Types Index 기본 테스트
 */

import { describe, expect, it } from "vitest";

describe("Shared Types Index", () => {
  it("인덱스 모듈이 로드되어야 한다", async () => {
    const module = await import("../index");
    expect(module).toBeDefined();
  });

  it("기본 인덱스 구조가 유지되어야 한다", async () => {
    const module = await import("../index");
    expect(typeof module).toBe("object");
  });
});

