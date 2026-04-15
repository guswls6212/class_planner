import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// vi.hoisted()로 선언해야 vi.mock factory 안에서 안전하게 참조할 수 있다.
// (vi.mock은 파일 최상단으로 hoisted되므로 일반 const보다 먼저 실행됨)
const { mockGetUser } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
}));

// @supabase/supabase-js를 모듈 레벨에서 mock.
// createClient는 hoisted되어 모듈 싱글턴 초기화 전에 적용됨.
// 반환 객체에 mockGetUser를 고정하여 테스트마다 mockGetUser 구현만 교체.
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
}));

// next/server mock — NextRequest / NextResponse
vi.mock("next/server", () => {
  const NextResponse = {
    json: vi.fn((body: unknown, init?: ResponseInit) => ({
      _body: body,
      status: init?.status ?? 200,
      _isNextResponse: true,
    })),
  };

  class MockNextRequest {
    private _headers: Map<string, string>;

    constructor(
      _url: string,
      opts?: { headers?: Record<string, string> }
    ) {
      this._headers = new Map(Object.entries(opts?.headers ?? {}));
    }

    get headers() {
      return {
        get: (key: string) => this._headers.get(key.toLowerCase()) ?? null,
      };
    }
  }

  return { NextRequest: MockNextRequest, NextResponse };
});

import { NextRequest } from "next/server";
import {
  getAuthenticatedEmail,
  isDeveloperEmail,
  requireDeveloper,
} from "../adminGuard";

// ──────────────────────────────────────────────
// isDeveloperEmail
// ──────────────────────────────────────────────
describe("isDeveloperEmail", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("env 누락 시 false를 반환한다", () => {
    vi.stubEnv("ADMIN_EMAILS", "");
    expect(isDeveloperEmail("dev@example.com")).toBe(false);
  });

  it("email이 화이트리스트에 있으면 true를 반환한다", () => {
    vi.stubEnv("ADMIN_EMAILS", "dev@example.com,admin@example.com");
    expect(isDeveloperEmail("dev@example.com")).toBe(true);
  });

  it("대소문자가 달라도 일치하면 true를 반환한다 (case-insensitive)", () => {
    vi.stubEnv("ADMIN_EMAILS", "Dev@Example.COM");
    expect(isDeveloperEmail("dev@example.com")).toBe(true);
  });

  it("화이트리스트에 없는 email은 false를 반환한다", () => {
    vi.stubEnv("ADMIN_EMAILS", "admin@example.com");
    expect(isDeveloperEmail("other@example.com")).toBe(false);
  });

  it("email이 null이면 false를 반환한다 (fail-closed)", () => {
    vi.stubEnv("ADMIN_EMAILS", "dev@example.com");
    expect(isDeveloperEmail(null)).toBe(false);
  });

  it("여러 이메일 목록 중 일치하는 항목이 있으면 true를 반환한다", () => {
    vi.stubEnv("ADMIN_EMAILS", "a@x.com, b@x.com , c@x.com");
    expect(isDeveloperEmail("b@x.com")).toBe(true);
  });
});

// ──────────────────────────────────────────────
// getAuthenticatedEmail
// ──────────────────────────────────────────────
describe("getAuthenticatedEmail", () => {
  const makeRequest = (authHeader?: string) =>
    new NextRequest("https://example.com/api/admin/logs", {
      headers: authHeader ? { authorization: authHeader } : {},
    });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("Authorization 헤더가 없으면 null을 반환한다", async () => {
    const req = makeRequest();
    const result = await getAuthenticatedEmail(req);
    expect(result).toBeNull();
  });

  it("Supabase getUser 성공 시 email을 반환한다", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { email: "dev@example.com" } },
      error: null,
    });

    const req = makeRequest("Bearer valid-jwt-token");
    const result = await getAuthenticatedEmail(req);

    expect(mockGetUser).toHaveBeenCalledWith("valid-jwt-token");
    expect(result).toBe("dev@example.com");
  });

  it("Supabase getUser 실패 시 null을 반환한다", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "invalid jwt" },
    });

    const req = makeRequest("Bearer bad-jwt-token");
    const result = await getAuthenticatedEmail(req);

    expect(result).toBeNull();
  });
});

// ──────────────────────────────────────────────
// requireDeveloper
// ──────────────────────────────────────────────
describe("requireDeveloper", () => {
  const makeRequest = (authHeader?: string) =>
    new NextRequest("https://example.com/api/admin/logs", {
      headers: authHeader ? { authorization: authHeader } : {},
    });

  beforeEach(() => {
    vi.stubEnv("ADMIN_EMAILS", "dev@example.com");
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("이메일 인증 실패(Authorization 헤더 없음) → { ok: false, response: 403 }", async () => {
    const req = makeRequest(); // Authorization 헤더 없음
    const result = await requireDeveloper(req);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
    }
  });

  it("이메일 인증 성공, 비화이트리스트 → { ok: false, response: 403 }", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { email: "notallowed@example.com" } },
      error: null,
    });

    const req = makeRequest("Bearer valid-jwt");
    const result = await requireDeveloper(req);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
    }
  });

  it("이메일 인증 성공, 화이트리스트 → { ok: true, email }", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { email: "dev@example.com" } },
      error: null,
    });

    const req = makeRequest("Bearer valid-jwt");
    const result = await requireDeveloper(req);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.email).toBe("dev@example.com");
    }
  });
});
