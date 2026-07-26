import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetSession } = vi.hoisted(() => ({ mockGetSession: vi.fn() }));

vi.mock("@/utils/supabaseClient", () => ({
  supabase: { auth: { getSession: mockGetSession } },
}));

import {
  installApiAuthInterceptor,
  resetApiAuthInterceptorForTests,
} from "../apiAuthInterceptor";

const TOKEN = "test-access-token";
const ORIGIN = "http://localhost:3000";

let originalFetch: typeof globalThis.fetch;
let calls: Array<{ url: string; headers: Headers }>;

/** 최하위 fetch 를 기록용 stub 으로 교체하고 인터셉터를 새로 설치. */
function setupInterceptor() {
  calls = [];
  originalFetch = globalThis.fetch;
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    const headers =
      input instanceof Request && !init?.headers
        ? new Headers(input.headers)
        : new Headers(init?.headers);
    calls.push({ url, headers });
    return new Response("{}", { status: 200 });
  }) as unknown as typeof globalThis.fetch;

  resetApiAuthInterceptorForTests();
  installApiAuthInterceptor();
}

function withSession(token: string | null) {
  mockGetSession.mockResolvedValue({
    data: { session: token ? { access_token: token } : null },
    error: null,
  });
}

/** 마지막 요청에 붙은 Authorization 헤더. */
function lastAuth(): string | null {
  return calls[calls.length - 1]?.headers.get("authorization") ?? null;
}

beforeEach(() => {
  vi.clearAllMocks();
  // jsdom 기본 origin 을 명시적으로 고정 — same-origin 판정이 여기에 의존한다.
  window.history.replaceState({}, "", "/");
  withSession(TOKEN);
  setupInterceptor();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  resetApiAuthInterceptorForTests();
});

describe("installApiAuthInterceptor — 토큰 부착 대상", () => {
  it("상대경로 /api/* 에 Bearer 를 붙인다", async () => {
    await fetch("/api/students?userId=abc");
    expect(lastAuth()).toBe(`Bearer ${TOKEN}`);
  });

  it("절대경로 same-origin /api/* 에도 붙인다", async () => {
    await fetch(`${ORIGIN}/api/teachers`);
    expect(lastAuth()).toBe(`Bearer ${TOKEN}`);
  });

  it("URL 객체 입력도 처리한다", async () => {
    await fetch(new URL(`${ORIGIN}/api/sessions`));
    expect(lastAuth()).toBe(`Bearer ${TOKEN}`);
  });

  it("Request 객체 입력도 처리한다 (헤더 보존)", async () => {
    const req = new Request(`${ORIGIN}/api/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    await fetch(req);
    expect(lastAuth()).toBe(`Bearer ${TOKEN}`);
    expect(calls[calls.length - 1].headers.get("content-type")).toBe(
      "application/json"
    );
  });

  it("Request + init.headers 조합에서도 토큰이 살아남는다", async () => {
    // fetch(request, init) 는 init.headers 가 있으면 Request 의 헤더를 통째로
    // 대체한다. Request 쪽에만 토큰을 넣으면 이 조합에서 토큰이 사라진다.
    const req = new Request(`${ORIGIN}/api/students`, {
      method: "POST",
      headers: { "X-From-Request": "r1" },
    });
    await fetch(req, { headers: { "X-From-Init": "i1" } });

    const h = calls[calls.length - 1].headers;
    expect(h.get("authorization")).toBe(`Bearer ${TOKEN}`);
    expect(h.get("x-from-request"), "Request 헤더가 유실됐다").toBe("r1");
    expect(h.get("x-from-init"), "init 헤더가 유실됐다").toBe("i1");
  });

  it("기존 init.headers 를 잃지 않는다", async () => {
    await fetch("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Trace": "t1" },
    });
    const h = calls[calls.length - 1].headers;
    expect(h.get("authorization")).toBe(`Bearer ${TOKEN}`);
    expect(h.get("content-type")).toBe("application/json");
    expect(h.get("x-trace")).toBe("t1");
  });
});

describe("installApiAuthInterceptor — 부착 제외 대상", () => {
  it("cross-origin 요청엔 붙이지 않는다 (토큰 유출 방지)", async () => {
    await fetch("https://other.example.com/api/students");
    expect(lastAuth()).toBeNull();
  });

  it("Supabase 등 /api/ 가 아닌 same-origin 경로엔 붙이지 않는다", async () => {
    await fetch("/schedule");
    expect(lastAuth()).toBeNull();
  });

  it("/api/logs/client 은 제외 — logger 재귀 방지", async () => {
    await fetch("/api/logs/client", { method: "POST" });
    expect(lastAuth()).toBeNull();
  });

  it("호출부가 이미 Authorization 을 넣었으면 덮어쓰지 않는다", async () => {
    await fetch("/api/admin/logs", {
      headers: { Authorization: "Bearer explicit-admin-token" },
    });
    expect(lastAuth()).toBe("Bearer explicit-admin-token");
  });

  it("Request 객체에 이미 Authorization 이 있으면 유지한다", async () => {
    const req = new Request(`${ORIGIN}/api/admin/logs`, {
      headers: { Authorization: "Bearer from-request" },
    });
    await fetch(req);
    expect(lastAuth()).toBe("Bearer from-request");
  });
});

describe("installApiAuthInterceptor — 세션 없음 / 실패", () => {
  it("비로그인이면 헤더 없이 통과 (익명 경로가 살아 있어야 함)", async () => {
    withSession(null);
    await fetch("/api/share/some-token");
    expect(lastAuth()).toBeNull();
    expect(calls).toHaveLength(1);
  });

  it("getSession 이 throw 해도 요청은 통과한다", async () => {
    mockGetSession.mockRejectedValue(new Error("storage unavailable"));
    const res = await fetch("/api/students");
    expect(res.status).toBe(200);
    expect(lastAuth()).toBeNull();
  });
});

describe("installApiAuthInterceptor — 설치 멱등성", () => {
  it("두 번 설치해도 fetch 가 이중 래핑되지 않는다", async () => {
    installApiAuthInterceptor();
    installApiAuthInterceptor();
    await fetch("/api/students");
    expect(calls).toHaveLength(1);
    expect(lastAuth()).toBe(`Bearer ${TOKEN}`);
  });
});
