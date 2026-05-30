/**
 * Regression guard — outbox flush 의 4xx(영구실패) drop vs 5xx/network(일시실패) retain 분기.
 *
 * race-gap finding: "outbox 4xx silent drop vs 5xx retain"
 * (proposed-tasks/class-planner/uat-audit-findings-2026-05-30.md
 *  §[race-gap] Outbox flush — 4xx drop vs 5xx retain).
 *
 * 기존 syncOutbox.test.ts 는 단일-fate 케이스(4xx 1건 / 5xx 1건 / network 1건)만 잠근다.
 * finding 의 본질은 "한 flush 안에서 어떤 entry 는 drop(4xx) 되고 어떤 entry 는
 * 보관(5xx/network) 되는 선택적 분기" 이므로, 이 spec 은 그 선택성 자체를 회귀로 가둔다:
 *   - 혼합 배치(4xx + 5xx + network + success 동시) 에서 fate 별 분리
 *   - 보관된 entry 의 identity/순서 보존 (4xx 형제만 제거)
 *   - status 경계(4xx 상한 499 = drop, 5xx 하한 500 = retain)
 *   - 보관 entry 가 다음 flush(페이지 재진입 loop)에서 재시도되어 결국 성공
 *
 * 결정적: fetch 를 url 별로 mock 응답 매핑(타이밍 의존 없음). jsdom localStorage 인메모리 재정의.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  enqueueOutbox,
  flushOutbox,
  flushOutboxEntry,
  getOutboxEntries,
  getOutboxSize,
} from "../syncOutbox";

vi.mock("../logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() },
}));

const USER_ID = "user-flush-split";

// setupTests.ts 가 localStorage 를 vi.fn() 더미로 모킹하므로 인메모리 store 로 재정의
const lsStore = new Map<string, string>();

let mockFetch: ReturnType<typeof vi.fn>;

beforeEach(() => {
  lsStore.clear();
  vi.spyOn(window.localStorage, "getItem").mockImplementation(
    (k) => lsStore.get(k) ?? null,
  );
  vi.spyOn(window.localStorage, "setItem").mockImplementation((k, v) => {
    lsStore.set(k, v);
  });
  vi.spyOn(window.localStorage, "removeItem").mockImplementation((k) => {
    lsStore.delete(k);
  });
  mockFetch = vi.fn();
  global.fetch = mockFetch;
});

afterEach(() => {
  lsStore.clear();
});

/**
 * url → 응답(또는 throw) 매핑으로 fetch 를 결정적으로 mock.
 * `{ status }` 면 그 status 의 Response-유사 객체, `"throw"` 면 network 오류.
 */
function routeFetch(
  map: Record<string, { status: number } | "throw">,
): void {
  mockFetch.mockImplementation((url: string) => {
    const rule = map[url];
    if (!rule) throw new Error(`unmapped fetch url: ${url}`);
    if (rule === "throw") return Promise.reject(new Error("network down"));
    return Promise.resolve({ ok: rule.status < 400, status: rule.status });
  });
}

function enqueue(id: string, url: string): void {
  enqueueOutbox(USER_ID, {
    id,
    context: `ctx:${id}`,
    method: "POST",
    url,
    body: { id },
  });
}

describe("syncOutbox flush — 4xx drop vs 5xx/network retain 선택적 분기", () => {
  describe("flushOutbox — 혼합 배치", () => {
    it("한 flush 안에서 success/4xx 는 제거, 5xx/network 는 보관 (선택적 fate)", async () => {
      enqueue("ok", "/api/ok");
      enqueue("bad", "/api/bad"); // 4xx
      enqueue("down", "/api/down"); // 5xx
      enqueue("offline", "/api/offline"); // network throw
      routeFetch({
        "/api/ok": { status: 200 },
        "/api/bad": { status: 400 },
        "/api/down": { status: 503 },
        "/api/offline": "throw",
      });

      const res = await flushOutbox(USER_ID);

      // success 1, 4xx 1 (failed), 5xx + network 는 sent/failed 어디에도 안 잡힘
      expect(res.sent).toBe(1);
      expect(res.failed).toBe(1);
      expect(res.expired).toBe(0);

      // 보관된 건 5xx + network 두 entry 만
      const remaining = getOutboxEntries(USER_ID).map((e) => e.id).sort();
      expect(remaining).toEqual(["down", "offline"]);
    });

    it("4xx 형제만 제거되고 보관된 5xx entry 의 identity/lastError 가 유지됨", async () => {
      enqueue("bad", "/api/bad"); // 4xx → drop
      enqueue("keep", "/api/keep"); // 5xx → retain
      routeFetch({
        "/api/bad": { status: 409 },
        "/api/keep": { status: 500 },
      });

      await flushOutbox(USER_ID);

      const entries = getOutboxEntries(USER_ID);
      expect(entries).toHaveLength(1);
      expect(entries[0]).toMatchObject({
        id: "keep",
        context: "ctx:keep",
        method: "POST",
        url: "/api/keep",
      });
      // 5xx 보관 entry 는 lastError 로 진단 정보 남김
      expect(entries[0].lastError).toBe("HTTP 500");
      // body 보존 — 다음 flush 에 그대로 재전송돼야 함
      expect(entries[0].body).toEqual({ id: "keep" });
    });

    it("4xx 는 sent 에 절대 포함되지 않음 (데이터 손실을 'sent' 로 오집계 X)", async () => {
      enqueue("bad", "/api/bad");
      routeFetch({ "/api/bad": { status: 422 } });

      const res = await flushOutbox(USER_ID);

      expect(res.sent).toBe(0);
      expect(res.failed).toBe(1);
      expect(getOutboxSize(USER_ID)).toBe(0); // drop — 무한 retry 안 함
    });
  });

  describe("flushOutbox — status 경계값", () => {
    it("499 는 여전히 4xx → drop", async () => {
      enqueue("e499", "/api/e499");
      routeFetch({ "/api/e499": { status: 499 } });

      const res = await flushOutbox(USER_ID);

      expect(res.failed).toBe(1);
      expect(getOutboxSize(USER_ID)).toBe(0);
    });

    it("500 은 5xx → retain (경계 한 칸 차이로 fate 가 뒤집힘)", async () => {
      enqueue("e500", "/api/e500");
      routeFetch({ "/api/e500": { status: 500 } });

      const res = await flushOutbox(USER_ID);

      expect(res.failed).toBe(0);
      expect(res.sent).toBe(0);
      expect(getOutboxSize(USER_ID)).toBe(1); // 보관
    });
  });

  describe("flushOutbox — 5xx 보관 entry 의 재시도 loop (페이지 재진입)", () => {
    it("첫 flush 는 5xx 로 보관, 둘째 flush 에서 서버 회복되면 전송 성공 + 제거", async () => {
      enqueue("retryable", "/api/retryable");

      // 1차: 서버 500 → 보관
      routeFetch({ "/api/retryable": { status: 500 } });
      const first = await flushOutbox(USER_ID);
      expect(first.sent).toBe(0);
      expect(getOutboxSize(USER_ID)).toBe(1);

      // 2차(다음 페이지 진입): 서버 회복 200 → 전송 성공 + outbox 비움
      routeFetch({ "/api/retryable": { status: 200 } });
      const second = await flushOutbox(USER_ID);
      expect(second.sent).toBe(1);
      expect(getOutboxSize(USER_ID)).toBe(0);
    });

    it("network 실패 entry 도 다음 flush 까지 보관되고 재시도 가능", async () => {
      enqueue("net", "/api/net");

      routeFetch({ "/api/net": "throw" });
      await flushOutbox(USER_ID);
      const afterFail = getOutboxEntries(USER_ID);
      expect(afterFail).toHaveLength(1);
      expect(afterFail[0].lastError).toBe("network down");

      routeFetch({ "/api/net": { status: 200 } });
      const recovered = await flushOutbox(USER_ID);
      expect(recovered.sent).toBe(1);
      expect(getOutboxSize(USER_ID)).toBe(0);
    });
  });

  describe("flushOutboxEntry — 단일 항목도 동일한 4xx drop / 5xx retain 분기", () => {
    it("혼합 큐에서 4xx entry 1건 재시도 시 그 entry 만 drop, 5xx 형제는 손대지 않음", async () => {
      enqueue("bad", "/api/bad"); // 4xx 대상
      enqueue("sibling", "/api/sibling"); // 건드리지 않을 5xx-대기 entry
      routeFetch({
        "/api/bad": { status: 403 },
        "/api/sibling": { status: 500 },
      });

      const ok = await flushOutboxEntry(USER_ID, "bad");

      expect(ok).toBe(false); // 4xx 는 성공 아님
      const ids = getOutboxEntries(USER_ID).map((e) => e.id);
      expect(ids).toEqual(["sibling"]); // bad 만 drop, sibling 보존
      // sibling 은 fetch 되지 않았어야 함 (단일 entry flush 는 대상만 호출)
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/bad",
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("5xx entry 단일 재시도 시 보관 + lastError, 큐 크기 불변", async () => {
      enqueue("keep", "/api/keep");
      routeFetch({ "/api/keep": { status: 502 } });

      const ok = await flushOutboxEntry(USER_ID, "keep");

      expect(ok).toBe(false);
      const entries = getOutboxEntries(USER_ID);
      expect(entries).toHaveLength(1);
      expect(entries[0].lastError).toBe("HTTP 502");
    });
  });
});