import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
process.env.VITEST = "true"; // CORS 우회

const mockInsert = vi.fn();

vi.mock("@/lib/supabaseServiceRole", () => ({
  getServiceRoleClient: () => ({
    from: () => ({
      insert: mockInsert,
    }),
  }),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn() },
  maskPII: (v: unknown) => v, // 마스킹 로직은 logger 단위 테스트에서 검증
}));

// rateLimit는 기본적으로 허용 상태로 mock
vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: vi.fn().mockReturnValue({ allowed: true, resetAt: 0 }),
}));

describe("POST /api/logs/client", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockInsert.mockResolvedValue({ error: null });
  });

  async function postLog(body: object, headers: Record<string, string> = {}) {
    const { POST } = await import("../route");
    return POST(
      new NextRequest("http://localhost:3000/api/logs/client", {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json", ...headers },
      })
    );
  }

  it("유효한 error 로그를 수신하면 200과 success:true를 반환한다", async () => {
    const res = await postLog({
      level: "error",
      message: "테스트 에러",
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockInsert).toHaveBeenCalledOnce();
  });

  it("유효한 warn 로그도 정상 처리된다", async () => {
    const res = await postLog({ level: "warn", message: "경고 메시지" });
    expect(res.status).toBe(200);
    const insertArg = mockInsert.mock.calls[0][0];
    expect(insertArg.level).toBe("warn");
    expect(insertArg.source).toBe("client");
  });

  it("허용되지 않은 level이면 400을 반환한다", async () => {
    const res = await postLog({ level: "info", message: "정보" });
    expect(res.status).toBe(400);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("message가 없으면 400을 반환한다", async () => {
    const res = await postLog({ level: "error" });
    expect(res.status).toBe(400);
  });

  it("message가 2000자를 초과하면 400을 반환한다", async () => {
    const res = await postLog({ level: "error", message: "x".repeat(2001) });
    expect(res.status).toBe(400);
  });

  it("유효하지 않은 UUID userId는 user_id: null로 insert된다", async () => {
    await postLog({ level: "error", message: "에러", userId: "not-a-uuid" });
    const insertArg = mockInsert.mock.calls[0][0];
    expect(insertArg.user_id).toBeNull();
  });

  it("유효한 UUID userId는 user_id에 반영된다", async () => {
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    await postLog({ level: "error", message: "에러", userId: uuid });
    const insertArg = mockInsert.mock.calls[0][0];
    expect(insertArg.user_id).toBe(uuid);
  });

  it("source는 항상 'client'로 강제된다", async () => {
    await postLog({ level: "error", message: "에러", source: "server" });
    const insertArg = mockInsert.mock.calls[0][0];
    expect(insertArg.source).toBe("client");
  });

  it("rate limit 초과 시 429를 반환한다", async () => {
    const { checkRateLimit } = await import("@/lib/rateLimit");
    vi.mocked(checkRateLimit).mockReturnValueOnce({
      allowed: false,
      resetAt: Date.now() + 30_000,
    });

    const res = await postLog({ level: "error", message: "에러" });
    expect(res.status).toBe(429);
    expect(mockInsert).not.toHaveBeenCalled();
  });
});
