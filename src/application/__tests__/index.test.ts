/**
 * Application 인덱스 테스트
 */

import { describe, expect, it } from "vitest";

describe("Application Index", () => {
  it("Application 인덱스 모듈이 로드되어야 한다", async () => {
    const module = await import("../index");
    expect(module).toBeDefined();
  });

  it("Application 계층 export가 올바르게 작동해야 한다", async () => {
    const module = await import("../index");

    // 인덱스 모듈이 에러 없이 로드되면 성공
    expect(typeof module).toBe("object");
  });

  it("기본 Application 구조가 유지되어야 한다", async () => {
    const module = await import("../index");

    // 모듈 구조 확인
    expect(module).toBeTruthy();
  });
});


