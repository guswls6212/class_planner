import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// rateLimit 모듈은 모듈 스코프 Map을 사용하므로
// 테스트 간 격리를 위해 매번 fresh import가 필요함
// vi.resetModules() + dynamic import 패턴 사용

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetModules();
  });

  it("첫 요청은 허용된다", async () => {
    const { checkRateLimit } = await import("../rateLimit");
    const result = checkRateLimit("192.168.1.1", 30, 60_000);
    expect(result.allowed).toBe(true);
  });

  it("한도 내 요청은 모두 허용된다", async () => {
    const { checkRateLimit } = await import("../rateLimit");
    // 30회 모두 허용
    for (let i = 0; i < 30; i++) {
      const result = checkRateLimit("192.168.1.2", 30, 60_000);
      expect(result.allowed).toBe(true);
    }
  });

  it("한도를 초과하면 차단된다", async () => {
    const { checkRateLimit } = await import("../rateLimit");
    // 30회 소진
    for (let i = 0; i < 30; i++) {
      checkRateLimit("192.168.1.3", 30, 60_000);
    }
    // 31번째는 차단
    const result = checkRateLimit("192.168.1.3", 30, 60_000);
    expect(result.allowed).toBe(false);
  });

  it("윈도우가 리셋되면 다시 허용된다", async () => {
    const { checkRateLimit } = await import("../rateLimit");
    // 30회 소진
    for (let i = 0; i < 30; i++) {
      checkRateLimit("192.168.1.4", 30, 60_000);
    }
    // 31번째 차단 확인
    expect(checkRateLimit("192.168.1.4", 30, 60_000).allowed).toBe(false);

    // 60초 경과 후 윈도우 리셋
    vi.advanceTimersByTime(60_001);

    // 다시 허용
    const result = checkRateLimit("192.168.1.4", 30, 60_000);
    expect(result.allowed).toBe(true);
  });

  it("IP별로 독립적으로 카운트된다", async () => {
    const { checkRateLimit } = await import("../rateLimit");
    // IP A 30회 소진
    for (let i = 0; i < 30; i++) {
      checkRateLimit("10.0.0.1", 30, 60_000);
    }
    // IP A는 차단, IP B는 허용
    expect(checkRateLimit("10.0.0.1", 30, 60_000).allowed).toBe(false);
    expect(checkRateLimit("10.0.0.2", 30, 60_000).allowed).toBe(true);
  });
});

describe("lockout (checkLockout / recordFailure / resetFailures)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetModules();
  });

  it("실패 기록 없으면 잠금 없음", async () => {
    const { checkLockout } = await import("../rateLimit");
    expect(checkLockout("academy-A:1.2.3.4")).toBe(false);
  });

  it("maxFailures 미만 실패는 잠금 안 됨", async () => {
    const { checkLockout, recordFailure } = await import("../rateLimit");
    const key = "academy-B:1.2.3.4";
    recordFailure(key, 5, 3_600_000);
    recordFailure(key, 5, 3_600_000);
    recordFailure(key, 5, 3_600_000);
    recordFailure(key, 5, 3_600_000);
    // 4번째까지는 잠금 없음 (5번 초과 필요)
    expect(checkLockout(key)).toBe(false);
  });

  it("maxFailures 초과하면 잠금됨", async () => {
    const { checkLockout, recordFailure } = await import("../rateLimit");
    const key = "academy-C:1.2.3.4";
    for (let i = 0; i < 5; i++) {
      recordFailure(key, 5, 3_600_000);
    }
    expect(checkLockout(key)).toBe(true);
  });

  it("잠금 만료 후 다시 허용됨", async () => {
    const { checkLockout, recordFailure } = await import("../rateLimit");
    const key = "academy-D:1.2.3.4";
    for (let i = 0; i < 5; i++) {
      recordFailure(key, 5, 3_600_000);
    }
    expect(checkLockout(key)).toBe(true);

    // 1시간 경과
    vi.advanceTimersByTime(3_600_001);
    expect(checkLockout(key)).toBe(false);
  });

  it("성공 시 resetFailures로 카운트 초기화됨", async () => {
    const { checkLockout, recordFailure, resetFailures } =
      await import("../rateLimit");
    const key = "academy-E:1.2.3.4";
    recordFailure(key, 5, 3_600_000);
    recordFailure(key, 5, 3_600_000);
    resetFailures(key);
    // 리셋 후 maxFailures 채워도 이전 카운트 없음
    recordFailure(key, 5, 3_600_000);
    recordFailure(key, 5, 3_600_000);
    recordFailure(key, 5, 3_600_000);
    recordFailure(key, 5, 3_600_000);
    expect(checkLockout(key)).toBe(false);
  });

  it("키별로 독립적으로 잠금 관리됨", async () => {
    const { checkLockout, recordFailure } = await import("../rateLimit");
    const keyA = "academy-F:1.2.3.4";
    const keyB = "academy-G:1.2.3.4";
    for (let i = 0; i < 5; i++) {
      recordFailure(keyA, 5, 3_600_000);
    }
    expect(checkLockout(keyA)).toBe(true);
    expect(checkLockout(keyB)).toBe(false);
  });
});
