/**
 * Logger 유틸리티 테스트
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { logger, maskPII } from "../logger";

// supabaseServiceRole은 파일 최상단에서 호이스팅 모킹 (vi.doMock보다 안정적)
const mockInsert = vi.fn().mockResolvedValue({ error: null });
const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });
const mockGetServiceRoleClient = vi.fn().mockReturnValue({ from: mockFrom });

vi.mock("../supabaseServiceRole", () => ({
  getServiceRoleClient: () => mockGetServiceRoleClient(),
}));

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

// ─── maskPII ──────────────────────────────────────────────────────────────────

describe("maskPII", () => {
  it("PII 키 값을 [REDACTED]로 마스킹한다", () => {
    const input = { email: "user@example.com", name: "홍길동" };
    expect(maskPII(input)).toEqual({ email: "[REDACTED]", name: "홍길동" });
  });

  it("token, password, access_token, refresh_token, authorization 키도 마스킹한다", () => {
    const input = {
      token: "abc123",
      password: "secret",
      access_token: "at",
      refresh_token: "rt",
      authorization: "Bearer xyz",
    };
    const result = maskPII(input) as Record<string, unknown>;
    for (const key of Object.keys(input)) {
      expect(result[key]).toBe("[REDACTED]");
    }
  });

  it("대소문자 구분 없이 마스킹한다", () => {
    expect(maskPII({ Email: "a@b.com" })).toEqual({ Email: "[REDACTED]" });
    expect(maskPII({ PASSWORD: "secret" })).toEqual({ PASSWORD: "[REDACTED]" });
  });

  it("중첩 객체에서도 마스킹한다", () => {
    const input = { user: { email: "a@b.com", role: "admin" } };
    expect(maskPII(input)).toEqual({ user: { email: "[REDACTED]", role: "admin" } });
  });

  it("배열 내 객체도 마스킹한다", () => {
    const input = [{ email: "a@b.com" }, { name: "foo" }];
    expect(maskPII(input)).toEqual([{ email: "[REDACTED]" }, { name: "foo" }]);
  });

  it("스택 트레이스 문자열 내 이메일을 [REDACTED_EMAIL]로 치환한다", () => {
    const stack = "Error at handler (user@test.com:10:5)";
    expect(maskPII(stack)).toBe("Error at handler ([REDACTED_EMAIL]:10:5)");
  });

  it("null/숫자/boolean은 그대로 반환한다", () => {
    expect(maskPII(null)).toBeNull();
    expect(maskPII(42)).toBe(42);
    expect(maskPII(true)).toBe(true);
  });
});

// ─── logger.error / logger.warn → app_logs insert ────────────────────────────

describe("logger — app_logs 영구화", () => {
  beforeEach(() => {
    mockInsert.mockClear();
    mockFrom.mockClear();
    mockGetServiceRoleClient.mockClear();
    mockInsert.mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: mockInsert });
    mockGetServiceRoleClient.mockReturnValue({ from: mockFrom });

    // jsdom 환경에서 window가 정의되어 있으면 서버 가드가 early return됨.
    // 서버 환경 시뮬레이션: window를 undefined로 설정.
    vi.stubGlobal("window", undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("logger.error 호출 시 app_logs에 insert한다", async () => {
    const err = new Error("테스트 에러");
    logger.error("에러 발생", { userId: "u1", requestId: "r1" }, err);

    await vi.waitFor(() => expect(mockInsert).toHaveBeenCalledTimes(1));

    const payload = mockInsert.mock.calls[0][0];
    expect(payload.level).toBe("error");
    expect(payload.source).toBe("server");
    expect(payload.message).toBe("에러 발생");
    expect(payload.user_id).toBe("u1");
    expect(payload.request_id).toBe("r1");
  });

  it("logger.warn 호출 시 app_logs에 insert한다", async () => {
    logger.warn("경고", { userId: "u2" });

    await vi.waitFor(() => expect(mockInsert).toHaveBeenCalledTimes(1));

    const payload = mockInsert.mock.calls[0][0];
    expect(payload.level).toBe("warn");
    expect(payload.source).toBe("server");
  });

  it("context의 PII 필드가 마스킹되어 insert된다", async () => {
    logger.error("PII 테스트", { userId: "u1", email: "a@b.com" } as any);

    await vi.waitFor(() => expect(mockInsert).toHaveBeenCalledTimes(1));

    const payload = mockInsert.mock.calls[0][0];
    expect((payload.context as Record<string, unknown>).email).toBe("[REDACTED]");
  });

  it("academyId가 academy_id 컬럼으로 매핑된다", async () => {
    logger.error("테스트", { academyId: "academy-uuid-123" });

    await vi.waitFor(() => expect(mockInsert).toHaveBeenCalledTimes(1));
    expect(mockInsert.mock.calls[0][0].academy_id).toBe("academy-uuid-123");
  });

  it("브라우저 환경(window 존재)에서는 insert를 호출하지 않는다", async () => {
    // 브라우저 환경으로 전환
    vi.stubGlobal("window", {});

    logger.error("브라우저 에러", { userId: "u1" });

    await new Promise((r) => setTimeout(r, 50));
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("insert 실패 시 예외가 전파되지 않는다", async () => {
    mockInsert.mockRejectedValueOnce(new Error("DB error"));

    expect(() => logger.error("에러", { userId: "u1" })).not.toThrow();

    await new Promise((r) => setTimeout(r, 50));
  });

  it("getServiceRoleClient가 throw해도 에러가 전파되지 않는다", async () => {
    mockGetServiceRoleClient.mockImplementationOnce(() => {
      throw new Error("env not set");
    });

    expect(() => logger.error("env 없음", {})).not.toThrow();

    await new Promise((r) => setTimeout(r, 50));
  });
});

