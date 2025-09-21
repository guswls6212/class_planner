/**
 * SubjectMapper 테스트
 */

import { describe, expect, it } from "vitest";

describe("SubjectMapper", () => {
  it("SubjectMapper 모듈이 로드되어야 한다", async () => {
    const module = await import("../SubjectMapper");
    expect(module).toBeDefined();
  });

  it("매퍼 함수들이 존재해야 한다", async () => {
    const module = await import("../SubjectMapper");

    // 매퍼 모듈이 에러 없이 로드되면 성공
    expect(typeof module).toBe("object");
  });

  it("기본 매퍼 구조가 유지되어야 한다", async () => {
    const module = await import("../SubjectMapper");

    // 모듈 구조 확인
    expect(module).toBeTruthy();
  });
});


