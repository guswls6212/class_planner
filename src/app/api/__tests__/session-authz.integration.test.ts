/**
 * 라우트가 세션 가드를 **실제로** 호출하는지 검증한다.
 *
 * 다른 라우트 테스트들은 `@/lib/auth/apiAuth` 를 스텁하므로, 가드가 라우트에
 * 연결됐는지는 증명하지 못한다 (스텁을 지워도 통과한다). 이 파일은 가드를
 * mock 하지 않고 토큰 검증 계층(`supabase.auth.getUser`)만 제어해서,
 * 배선이 살아 있는지를 라우트별로 확인한다.
 *
 * 2026-07-26 P0 회귀 가드: 비인증 `?userId=<UUID>` 요청이 200 이었다.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

const { mockGetUser } = vi.hoisted(() => ({ mockGetUser: vi.fn() }));

// 토큰 검증만 제어. 가드 자체(requireSessionUser)는 진짜 코드가 돈다.
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({ auth: { getUser: mockGetUser } })),
}));

// 로거가 /api/logs/client 로 fetch 하지 않도록 차단.
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { NextRequest } from "next/server";

const SESSION_USER = "11111111-1111-4111-8111-111111111111";
const VICTIM_USER = "22222222-2222-4222-8222-222222222222";

/** 세션 사용자를 SESSION_USER 로 고정. */
function withValidToken() {
  mockGetUser.mockResolvedValue({
    data: { user: { id: SESSION_USER, email: "u@example.com" } },
    error: null,
  });
}

function req(
  path: string,
  opts: { userId?: string; token?: boolean; method?: string; body?: unknown } = {}
): NextRequest {
  const url = new URL(`http://localhost:3000${path}`);
  if (opts.userId) url.searchParams.set("userId", opts.userId);
  return new NextRequest(url, {
    method: opts.method ?? "GET",
    headers: opts.token ? { Authorization: "Bearer valid-token" } : {},
    ...(opts.body !== undefined
      ? { body: JSON.stringify(opts.body), method: opts.method ?? "POST" }
      : {}),
  });
}

/**
 * 라우트별 케이스. handler 는 지연 import — 각 라우트 모듈이 서로의 mock 에
 * 영향을 주지 않도록 테스트 안에서 불러온다.
 */
const CASES: Array<{
  name: string;
  path: string;
  method?: string;
  body?: unknown;
  load: () => Promise<(r: NextRequest) => Promise<Response>>;
}> = [
  {
    name: "GET /api/audit-log (① 감사 로그)",
    path: "/api/audit-log",
    load: async () => (await import("../audit-log/route")).GET,
  },
  {
    name: "GET /api/students (② 학생 — 미성년 PII)",
    path: "/api/students",
    load: async () => (await import("../students/route")).GET,
  },
  {
    name: "GET /api/teachers (② 강사)",
    path: "/api/teachers",
    load: async () => (await import("../teachers/route")).GET,
  },
  {
    name: "GET /api/sessions (③ 수업)",
    path: "/api/sessions",
    load: async () => (await import("../sessions/route")).GET,
  },
  {
    name: "GET /api/attendance (③ 출결)",
    path: "/api/attendance",
    load: async () => (await import("../attendance/route")).GET,
  },
  {
    name: "GET /api/share-tokens (④ 공유 토큰 관리)",
    path: "/api/share-tokens",
    load: async () => (await import("../share-tokens/route")).GET,
  },
  {
    name: "GET /api/invites (④ 초대 관리)",
    path: "/api/invites",
    load: async () => (await import("../invites/route")).GET,
  },
  {
    name: "GET /api/user-settings (⑤ default-user-id 공유 버킷 제거)",
    path: "/api/user-settings",
    load: async () => (await import("../user-settings/route")).GET,
  },
  {
    name: "GET /api/academies/mine (⑤ 학원 목록)",
    path: "/api/academies/mine",
    load: async () => (await import("../academies/mine/route")).GET,
  },
  {
    name: "GET /api/members (⑤ 멤버 목록)",
    path: "/api/members",
    load: async () => (await import("../members/route")).GET,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("비인증 요청은 401 — 유효한 UUID 를 알아도 통과 못 한다", () => {
  it.each(CASES)("$name", async ({ path, load }) => {
    const handler = await load();
    // 2026-06-25 실증 공격: 토큰 없이 남의 userId 만 붙여 호출.
    const res = await handler(req(path, { userId: VICTIM_USER }));
    expect(res.status).toBe(401);
  });
});

describe("타인의 userId 를 주장하면 403 — 세션과 대조된다", () => {
  it.each(CASES)("$name", async ({ path, load }) => {
    withValidToken();
    const handler = await load();
    const res = await handler(
      req(path, { userId: VICTIM_USER, token: true })
    );
    expect(res.status).toBe(403);
  });
});

describe("경로 파라미터 / body 변형 라우트도 같은 가드를 쓴다", () => {
  it("DELETE /api/members/[userId] — 토큰 없으면 401", async () => {
    const { DELETE } = await import("../members/[userId]/route");
    const res = await DELETE(
      req(`/api/members/${VICTIM_USER}`, {
        userId: VICTIM_USER,
        method: "DELETE",
      }),
      { params: Promise.resolve({ userId: VICTIM_USER }) }
    );
    expect(res.status).toBe(401);
  });

  it("DELETE /api/members/[userId] — 남의 requesterId 주장은 403", async () => {
    withValidToken();
    const { DELETE } = await import("../members/[userId]/route");
    const res = await DELETE(
      req(`/api/members/${VICTIM_USER}`, {
        userId: VICTIM_USER,
        token: true,
        method: "DELETE",
      }),
      { params: Promise.resolve({ userId: VICTIM_USER }) }
    );
    expect(res.status).toBe(403);
  });

  it("POST /api/auth/set-active-academy — body userId 도 세션과 대조된다", async () => {
    withValidToken();
    const { POST } = await import("../auth/set-active-academy/route");
    const res = await POST(
      req("/api/auth/set-active-academy", {
        token: true,
        method: "POST",
        body: { userId: VICTIM_USER, academyId: "acad-1" },
      })
    );
    expect(res.status).toBe(403);
  });

  it("POST /api/auth/set-active-academy — 토큰 없으면 401", async () => {
    const { POST } = await import("../auth/set-active-academy/route");
    const res = await POST(
      req("/api/auth/set-active-academy", {
        method: "POST",
        body: { userId: VICTIM_USER, academyId: "acad-1" },
      })
    );
    expect(res.status).toBe(401);
  });
});

describe("세션 사용자 본인 요청은 가드를 통과한다 (가드가 전부 막지는 않음)", () => {
  it("일치하는 userId 는 401/403 이 아니다", async () => {
    withValidToken();
    const { GET } = await import("../students/route");
    const res = await GET(req("/api/students", { userId: SESSION_USER, token: true }));
    // 이후 DB 계층은 mock 이라 200 이 아닐 수 있다 — 중요한 건 인가 단계를 통과했다는 것.
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  it("userId 파라미터가 없어도 세션 사용자로 진행한다", async () => {
    withValidToken();
    const { GET } = await import("../students/route");
    const res = await GET(req("/api/students", { token: true }));
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});
