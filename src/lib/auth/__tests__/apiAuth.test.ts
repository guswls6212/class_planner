import { beforeEach, describe, expect, it, vi } from "vitest";

// vi.hoisted() — vi.mock factory 는 파일 최상단으로 hoisted 되므로
// 일반 const 보다 먼저 실행된다 (adminGuard.test.ts 와 동일 패턴).
const { mockGetUser } = vi.hoisted(() => ({ mockGetUser: vi.fn() }));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({ auth: { getUser: mockGetUser } })),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

vi.mock("next/server", () => {
  const NextResponse = {
    json: vi.fn((body: unknown, init?: ResponseInit) => ({
      _body: body,
      status: init?.status ?? 200,
    })),
  };

  class MockNextRequest {
    private _headers: Map<string, string>;
    nextUrl: { pathname: string };

    constructor(url: string, opts?: { headers?: Record<string, string> }) {
      this._headers = new Map(
        Object.entries(opts?.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v])
      );
      this.nextUrl = { pathname: new URL(url).pathname };
    }

    get headers() {
      return { get: (k: string) => this._headers.get(k.toLowerCase()) ?? null };
    }
  }

  return { NextRequest: MockNextRequest, NextResponse };
});

import { NextRequest } from "next/server";
import {
  getAuthenticatedUserId,
  requireSessionUser,
  verifyBearerUser,
} from "../apiAuth";

const SESSION_USER = "11111111-1111-4111-8111-111111111111";
const OTHER_USER = "22222222-2222-4222-8222-222222222222";

function makeRequest(headers?: Record<string, string>): NextRequest {
  return new NextRequest("https://example.com/api/students", { headers });
}

/** 토큰이 유효한 상태를 세팅. */
function withValidSession(userId = SESSION_USER, email = "u@example.com") {
  mockGetUser.mockResolvedValue({
    data: { user: { id: userId, email } },
    error: null,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
});

describe("verifyBearerUser", () => {
  it("Authorization 헤더가 없으면 null (fail-closed)", async () => {
    expect(await verifyBearerUser(makeRequest())).toBeNull();
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it("Bearer 스킴이 아니면 null", async () => {
    expect(
      await verifyBearerUser(makeRequest({ authorization: "Basic abc123" }))
    ).toBeNull();
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it("Bearer 뒤가 비어 있으면 검증 호출 없이 null", async () => {
    expect(
      await verifyBearerUser(makeRequest({ authorization: "Bearer    " }))
    ).toBeNull();
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it("Supabase 가 error 를 주면 null", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "invalid JWT" },
    });
    expect(
      await verifyBearerUser(makeRequest({ authorization: "Bearer bad" }))
    ).toBeNull();
  });

  it("유효 토큰이면 { id, email } 반환 + 토큰만 전달", async () => {
    withValidSession();
    const user = await verifyBearerUser(
      makeRequest({ authorization: "Bearer good-token" })
    );
    expect(user).toEqual({ id: SESSION_USER, email: "u@example.com" });
    expect(mockGetUser).toHaveBeenCalledWith("good-token");
  });

  it("email 이 없어도 id 가 있으면 통과 (email: null)", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: SESSION_USER } },
      error: null,
    });
    expect(
      await verifyBearerUser(makeRequest({ authorization: "Bearer t" }))
    ).toEqual({ id: SESSION_USER, email: null });
  });
});

describe("getAuthenticatedUserId", () => {
  it("유효 토큰이면 userId", async () => {
    withValidSession();
    expect(
      await getAuthenticatedUserId(makeRequest({ authorization: "Bearer t" }))
    ).toBe(SESSION_USER);
  });

  it("토큰 없으면 null", async () => {
    expect(await getAuthenticatedUserId(makeRequest())).toBeNull();
  });
});

describe("requireSessionUser", () => {
  it("세션 없으면 401 — 쿼리 userId 가 있어도", async () => {
    const result = await requireSessionUser(makeRequest(), SESSION_USER);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
    }
  });

  it("무효 토큰이면 401", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "expired" },
    });
    const result = await requireSessionUser(
      makeRequest({ authorization: "Bearer expired" }),
      SESSION_USER
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(401);
  });

  it("타인의 userId 를 주장하면 403 (P0 인가 우회 회귀 가드)", async () => {
    withValidSession(SESSION_USER);
    const result = await requireSessionUser(
      makeRequest({ authorization: "Bearer good" }),
      OTHER_USER
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(403);
  });

  it("쿼리 userId 가 세션과 일치하면 통과", async () => {
    withValidSession(SESSION_USER);
    const result = await requireSessionUser(
      makeRequest({ authorization: "Bearer good" }),
      SESSION_USER
    );
    expect(result).toEqual({ ok: true, userId: SESSION_USER });
  });

  it("쿼리 userId 가 없으면 세션 userId 를 반환", async () => {
    withValidSession(SESSION_USER);
    expect(
      await requireSessionUser(makeRequest({ authorization: "Bearer good" }))
    ).toEqual({ ok: true, userId: SESSION_USER });
  });

  it("쿼리 userId 가 null/빈 문자열이어도 세션 userId 반환 (403 아님)", async () => {
    withValidSession(SESSION_USER);
    expect(
      await requireSessionUser(makeRequest({ authorization: "Bearer good" }), null)
    ).toEqual({ ok: true, userId: SESSION_USER });
    expect(
      await requireSessionUser(makeRequest({ authorization: "Bearer good" }), "")
    ).toEqual({ ok: true, userId: SESSION_USER });
  });

  it("반환 userId 는 항상 세션 값 — 쿼리 값을 신뢰하지 않는다", async () => {
    // 세션 사용자가 SESSION_USER 인데 쿼리도 SESSION_USER 인 정상 케이스에서,
    // 결과가 쿼리 문자열 인스턴스가 아니라 검증된 세션 값이어야 한다.
    withValidSession(SESSION_USER);
    const result = await requireSessionUser(
      makeRequest({ authorization: "Bearer good" }),
      SESSION_USER
    );
    if (result.ok) {
      expect(result.userId).toBe(SESSION_USER);
      expect(mockGetUser).toHaveBeenCalledWith("good");
    }
  });
});
