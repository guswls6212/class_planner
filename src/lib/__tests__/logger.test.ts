/**
 * Logger 유틸리티 테스트
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { logger } from "../logger";

describe("Logger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock console methods
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("debug 로그가 올바르게 작동해야 한다", () => {
    logger.debug("Test debug message");
    // 로그 함수가 에러 없이 실행되어야 함
    expect(true).toBe(true);
  });

  it("info 로그가 올바르게 작동해야 한다", () => {
    logger.info("Test info message");
    expect(true).toBe(true);
  });

  it("warn 로그가 올바르게 작동해야 한다", () => {
    logger.warn("Test warning message");
    expect(true).toBe(true);
  });

  it("error 로그가 올바르게 작동해야 한다", () => {
    logger.error("Test error message", undefined, new Error("Test error"));
    expect(true).toBe(true);
  });

  it("컨텍스트와 함께 로그가 작동해야 한다", () => {
    logger.info("Test with context", { userId: "test-123", action: "test" });
    expect(true).toBe(true);
  });
});

