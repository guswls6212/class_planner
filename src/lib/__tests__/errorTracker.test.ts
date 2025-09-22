/**
 * ErrorTracker 유틸리티 테스트
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

describe("ErrorTracker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("에러 트래커 모듈이 로드되어야 한다", async () => {
    const module = await import("../errorTracker");
    expect(module).toBeDefined();
  });

  it("trackError 함수가 존재해야 한다", async () => {
    const module = await import("../errorTracker");
    expect(typeof module.trackError).toBe("function");
  });

  it("trackDatabaseError 함수가 존재해야 한다", async () => {
    const module = await import("../errorTracker");
    expect(typeof module.trackDatabaseError).toBe("function");
  });

  it("에러 트래킹이 에러 없이 실행되어야 한다", async () => {
    const { trackError } = await import("../errorTracker");

    expect(() => {
      trackError(new Error("Test error"));
    }).not.toThrow();
  });
});
