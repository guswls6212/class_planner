import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

// ---------------------------------------------------------------------------
// Supabase query builder mock
// ---------------------------------------------------------------------------

// We capture the calls on a single chainable object so we can assert on them.
const mockSelect = vi.fn();
const mockOrder = vi.fn();
const mockRange = vi.fn();
const mockIn = vi.fn();
const mockIlike = vi.fn();
const mockEq = vi.fn();

// Each query-builder method returns `self` so chaining works; the terminal
// call returns a promise-like that resolves with the fixture below.
let queryResult: { data: unknown; error: unknown; count: number | null } = {
  data: [],
  error: null,
  count: 0,
};

function makeBuilder() {
  const builder: Record<string, unknown> = {};

  const self = new Proxy(builder, {
    get(_, prop) {
      if (prop === "then") {
        // Make the builder itself thenable (for `await builder`)
        return (resolve: (v: unknown) => void) => resolve(queryResult);
      }
      // Record the call and return self for chaining
      return (...args: unknown[]) => {
        if (prop === "select") mockSelect(...args);
        if (prop === "order") mockOrder(...args);
        if (prop === "range") mockRange(...args);
        if (prop === "in") mockIn(...args);
        if (prop === "ilike") mockIlike(...args);
        if (prop === "eq") mockEq(...args);
        return self;
      };
    },
  });

  return self;
}

const mockFrom = vi.fn(() => makeBuilder());

vi.mock("@/lib/supabaseServiceRole", () => ({
  getServiceRoleClient: () => ({ from: mockFrom }),
}));

// ---------------------------------------------------------------------------
// adminGuard mock
// ---------------------------------------------------------------------------

const mockRequireDeveloper = vi.fn();

vi.mock("@/lib/adminGuard", () => ({
  requireDeveloper: (...args: unknown[]) => mockRequireDeveloper(...args),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(params: Record<string, string> = {}, headers: Record<string, string> = {}) {
  const url = new URL("http://localhost:3000/api/admin/logs");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url.toString(), { headers });
}

async function callGET(params: Record<string, string> = {}, headers: Record<string, string> = {}) {
  const { GET } = await import("../route");
  return GET(makeRequest(params, headers));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GET /api/admin/logs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();

    // Default: guard passes
    mockRequireDeveloper.mockResolvedValue({ ok: true, email: "dev@example.com" });

    // Default DB result
    queryResult = {
      data: [{ id: "1", ts: "2026-01-01T00:00:00Z", level: "error", message: "boom" }],
      error: null,
      count: 1,
    };
  });

  // -------------------------------------------------------------------------
  // 1. Guard failures
  // -------------------------------------------------------------------------

  describe("가드 실패 → 403", () => {
    it("Authorization 헤더 없음 → 403 응답", async () => {
      const { NextResponse } = await import("next/server");
      mockRequireDeveloper.mockResolvedValue({
        ok: false,
        response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      });

      const res = await callGET();
      expect(res.status).toBe(403);
    });

    it("비화이트리스트 이메일 → 403 응답", async () => {
      const { NextResponse } = await import("next/server");
      mockRequireDeveloper.mockResolvedValue({
        ok: false,
        response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      });

      const res = await callGET({}, { Authorization: "Bearer some-jwt" });
      expect(res.status).toBe(403);
    });
  });

  // -------------------------------------------------------------------------
  // 2. 정상 조회
  // -------------------------------------------------------------------------

  describe("정상 조회", () => {
    it("기본 파라미터 → items, total, limit, offset 포함 응답", async () => {
      const res = await callGET();
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toHaveProperty("items");
      expect(body).toHaveProperty("total");
      expect(body).toHaveProperty("limit");
      expect(body).toHaveProperty("offset");
      expect(body.limit).toBe(50);
      expect(body.offset).toBe(0);
      expect(body.total).toBe(1);
    });

    it("기본 level 필터 → .in('level', ['error','warn']) 호출", async () => {
      await callGET();
      expect(mockIn).toHaveBeenCalledWith("level", ["error", "warn"]);
    });

    it("level=info,debug 파라미터 → .in('level', ['info','debug']) 호출", async () => {
      await callGET({ level: "info,debug" });
      expect(mockIn).toHaveBeenCalledWith("level", ["info", "debug"]);
    });

    it("source=server 파라미터 → .in('source', ['server']) 호출", async () => {
      await callGET({ source: "server" });
      expect(mockIn).toHaveBeenCalledWith("source", ["server"]);
    });

    it("source 파라미터 없으면 .in('source', ...) 호출하지 않음", async () => {
      await callGET();
      const sourceInCalls = mockIn.mock.calls.filter((c) => c[0] === "source");
      expect(sourceInCalls).toHaveLength(0);
    });

    it("code 파라미터 → .ilike('code', '%AUTH%') 호출", async () => {
      await callGET({ code: "AUTH" });
      expect(mockIlike).toHaveBeenCalledWith("code", "%AUTH%");
    });

    it("code 파라미터 없으면 .ilike('code', ...) 호출하지 않음", async () => {
      await callGET();
      const codeCalls = mockIlike.mock.calls.filter((c) => c[0] === "code");
      expect(codeCalls).toHaveLength(0);
    });

    it("q 파라미터 → .ilike('message', '%failed%') 호출", async () => {
      await callGET({ q: "failed" });
      expect(mockIlike).toHaveBeenCalledWith("message", "%failed%");
    });

    it("q 파라미터 없으면 .ilike('message', ...) 호출하지 않음", async () => {
      await callGET();
      const qCalls = mockIlike.mock.calls.filter((c) => c[0] === "message");
      expect(qCalls).toHaveLength(0);
    });

    it("academyId 파라미터 → .eq('academy_id', uuid) 호출", async () => {
      const uuid = "550e8400-e29b-41d4-a716-446655440000";
      await callGET({ academyId: uuid });
      expect(mockEq).toHaveBeenCalledWith("academy_id", uuid);
    });

    it("academyId 파라미터 없으면 .eq('academy_id', ...) 호출하지 않음", async () => {
      await callGET();
      expect(mockEq).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // 3. limit 클램핑
  // -------------------------------------------------------------------------

  describe("limit 클램핑", () => {
    it("limit=500 → 200으로 클램핑됨", async () => {
      const res = await callGET({ limit: "500" });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.limit).toBe(200);
      // range도 200 기준으로 호출됐는지 확인
      expect(mockRange).toHaveBeenCalledWith(0, 199);
    });

    it("limit=0 → 기본값 50 반환 (0은 falsy이므로 || 50 적용)", async () => {
      // spec: Number(limitParam) || 50 → 0 || 50 = 50
      const res = await callGET({ limit: "0" });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.limit).toBe(50);
    });

    it("offset=10 → range(10, 10+limit-1) 호출", async () => {
      await callGET({ offset: "10", limit: "20" });
      expect(mockRange).toHaveBeenCalledWith(10, 29);
    });
  });

  // -------------------------------------------------------------------------
  // 4. Supabase 에러 → 500
  // -------------------------------------------------------------------------

  describe("Supabase 에러 → 500", () => {
    it("DB 쿼리 실패 시 500 응답", async () => {
      queryResult = { data: null, error: { message: "DB connection failed" }, count: null };

      const res = await callGET();
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body).toHaveProperty("error");
    });
  });
});
