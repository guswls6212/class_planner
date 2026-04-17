/**
 * logger.ts — 브라우저 환경 persistFromBrowser 테스트
 *
 * logger 모듈은 Node.js 환경에서 import되므로
 * global.window를 주입해 브라우저 환경을 시뮬레이션한다.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("logger in browser environment", () => {
  const fetchSpy = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));

  beforeEach(() => {
    vi.resetModules();
    // 브라우저 환경 시뮬레이션
    (global as Record<string, unknown>).window = {};
    (global as Record<string, unknown>).navigator = { userAgent: "TestBrowser/1.0" };
    global.fetch = fetchSpy;
  });

  afterEach(() => {
    delete (global as Record<string, unknown>).window;
    delete (global as Record<string, unknown>).navigator;
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("브라우저에서 logger.error 호출 시 /api/logs/client로 POST한다", async () => {
    const { logger } = await import("../logger");
    logger.error("브라우저 에러 테스트", { userId: "user-1" }, new Error("test"));

    // fire-and-forget이므로 마이크로태스크 대기
    await new Promise((r) => setTimeout(r, 10));

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("/api/logs/client");
    expect((init as RequestInit).method).toBe("POST");

    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.level).toBe("error");
    expect(body.message).toBe("브라우저 에러 테스트");
  });

  it("fetch 실패 시 조용히 무시하고 logger.error를 재호출하지 않는다", async () => {
    fetchSpy.mockRejectedValueOnce(new Error("network error"));

    const { logger } = await import("../logger");

    // fetch가 reject돼도 예외가 밖으로 나오면 안 됨
    expect(() => {
      logger.error("에러", {}, new Error("test"));
    }).not.toThrow();

    await new Promise((r) => setTimeout(r, 10));

    // fetch는 1번만 호출됨 (재시도 없음)
    expect(fetchSpy).toHaveBeenCalledOnce();
  });
});
