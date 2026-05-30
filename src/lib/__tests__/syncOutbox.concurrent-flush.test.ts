/**
 * Race-gap regression: outbox-flush-dedup.
 *
 * Finding (uat-audit-findings-2026-05-30.md L318-321):
 *   useOutboxFlush 가 mount 당 1회 자동 flush 를 시작한 직후, 사용자가
 *   SyncQueueModal 의 [모두 재시도] 를 누르면 두 경로(자동 mount flush +
 *   수동 모두 재시도) 가 동시에 flushOutbox(userId) 를 호출한다.
 *   flushOutbox 는 시작 시점에 readOutbox 로 스냅샷을 떠서 entry 들을
 *   순차 fetch 한 뒤, 끝에서 writeOutbox(remaining) 로 outbox 키 전체를
 *   덮어쓴다. in-flight lock / dedup 이 없어서 동시 실행 시 같은 entry 가
 *   양쪽에서 모두 fetch 되어 중복 POST 가 발사될 수 있고, 두 flush 의
 *   writeOutbox 가 서로의 결과를 덮어 entry 부활/유실이 생길 수 있다.
 *
 * 이 spec 은 timing/멀티탭 없이 결정적으로 재현한다:
 *   - localStorage 는 인메모리 Map 으로 모킹 (기존 syncOutbox.test.ts 패턴)
 *   - fetch 는 수동 제어 deferred promise 로 모킹 → 두 flush 가 확정적으로
 *     겹친 상태에서 resolve 순서를 직접 통제 (waitForTimeout 미사용)
 *
 * 결과 판정: 현재 코드엔 in-flight lock 이 없어 'concurrent flush 중복 POST'
 * 케이스가 FAIL 한다 (버그 노출). 'mount 당 1회 가드' 케이스는 PASS 한다.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { enqueueOutbox, flushOutbox, getOutboxSize } from "../syncOutbox";

vi.mock("../logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() },
}));

// useOutboxFlush 가 의존하는 부수효과(토스트)는 격리 — 검증 관심사 아님.
vi.mock("@/lib/toast", () => ({ showToast: vi.fn() }));

const USER_ID = "user-flush-concurrent";

// setupTests.ts 가 localStorage 를 vi.fn() 더미로 모킹하므로 인메모리 store 재정의
const lsStore = new Map<string, string>();
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
});

afterEach(() => {
  lsStore.clear();
  vi.restoreAllMocks();
});

/** 한 url 에 대해 수동으로 resolve 할 수 있는 fetch mock. */
function makeControllableFetch() {
  type Pending = {
    url: string;
    resolve: (res: { ok: boolean; status: number }) => void;
  };
  const pending: Pending[] = [];
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : String(input);
    return new Promise<{ ok: boolean; status: number }>((resolve) => {
      pending.push({ url, resolve });
    });
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  return {
    fetchMock,
    /** 현재까지 발사된 fetch 호출 url 목록 */
    urls: () => fetchMock.mock.calls.map((c) => String(c[0])),
    /** 가장 먼저 대기 중인 fetch 1건을 status 로 resolve 하고 microtask flush */
    async resolveNext(status = 200) {
      const next = pending.shift();
      if (!next) throw new Error("resolve 할 대기 fetch 가 없음");
      next.resolve({ ok: status >= 200 && status < 300, status });
      // microtask 큐 비워서 await 체인 진행
      await Promise.resolve();
      await Promise.resolve();
    },
    /** 남은 모든 대기 fetch 를 status 로 resolve */
    async resolveAll(status = 200) {
      while (pending.length > 0) {
        // eslint-disable-next-line no-await-in-loop
        await this.resolveNext(status);
      }
    },
    pendingCount: () => pending.length,
  };
}

function seedTwoEntries() {
  enqueueOutbox(USER_ID, {
    id: "session:create:A",
    context: "session:create",
    method: "POST",
    url: "/api/sessions?userId=" + USER_ID + "&entry=A",
    body: { entry: "A" },
  });
  enqueueOutbox(USER_ID, {
    id: "session:create:B",
    context: "session:create",
    method: "POST",
    url: "/api/sessions?userId=" + USER_ID + "&entry=B",
    body: { entry: "B" },
  });
}

describe("outbox concurrent flush — dedup / in-flight guard", () => {
  describe("useOutboxFlush mount-당-1회 가드 (정상 동작 lock)", () => {
    it("같은 mount 안에서 hook 이 재렌더돼도 flushOutbox 는 1회만 (flushedRef)", async () => {
      const ctrl = makeControllableFetch();
      seedTwoEntries();

      const { useOutboxFlush } = await import("@/hooks/useOutboxFlush");
      const { rerender } = renderHook(({ uid }) => useOutboxFlush(uid), {
        initialProps: { uid: USER_ID },
      });

      // 첫 effect 가 flush 시작 — 두 entry fetch 발사 (순차이므로 우선 1건)
      await Promise.resolve();
      const firstBatch = ctrl.fetchMock.mock.calls.length;
      expect(firstBatch).toBeGreaterThanOrEqual(1);

      // 같은 mount 에서 재렌더 (userId 동일) → flushedRef 로 재flush 안 함
      rerender({ uid: USER_ID });
      rerender({ uid: USER_ID });
      await Promise.resolve();

      // 재렌더로 새 fetch 가 추가 발사되지 않았어야 한다
      expect(ctrl.fetchMock.mock.calls.length).toBe(firstBatch);

      await ctrl.resolveAll(200);
    });
  });

  describe("동시 flush — in-flight 가드 (중복 POST / writeOutbox clobber 차단)", () => {
    it("두 flush 동시 호출 시 각 entry 1회만 전송 (in-flight dedup)", async () => {
      const ctrl = makeControllableFetch();
      seedTwoEntries();

      // 두 경로가 동시에 flushOutbox(userId) 를 시작 (자동 mount flush + 수동 retry-all).
      // 둘 다 시작 시점에 동일 스냅샷 [A, B] 를 readOutbox 한다.
      const flush1 = flushOutbox(USER_ID); // 자동 (useOutboxFlush 가 호출하는 것과 동일)
      const flush2 = flushOutbox(USER_ID); // 수동 (SyncQueueModal handleRetryAll)

      // 양쪽 flush 가 각자의 첫 entry 에 대해 fetch 를 발사할 때까지 microtask 진행
      await Promise.resolve();
      await Promise.resolve();

      // 모든 in-flight fetch 를 성공으로 resolve → 두 flush 모두 끝까지 진행
      await ctrl.resolveAll(200);
      await Promise.all([flush1, flush2]);

      const urls = ctrl.urls();
      const postsForA = urls.filter((u) => u.includes("entry=A")).length;
      const postsForB = urls.filter((u) => u.includes("entry=B")).length;

      // 올바른 동작: entry A, B 각각 1회만 전송돼야 한다 (dedup / in-flight lock).
      // 현재 코드: lock 이 없어 두 flush 가 같은 스냅샷을 각자 fetch → 2회씩 발사 → FAIL.
      expect(postsForA).toBe(1);
      expect(postsForB).toBe(1);

      // 최종 outbox 는 비어 있어야 한다 (모두 성공)
      expect(getOutboxSize(USER_ID)).toBe(0);
    });

    it("한 flush 의 writeOutbox(remaining) 가 다른 flush 결과를 덮어쓰지 않는다 (entry 부활/유실 없음)", async () => {
      const ctrl = makeControllableFetch();
      seedTwoEntries();

      // flush1: A 는 5xx(보관), B 는 성공으로 만들 예정
      // flush2: 같은 스냅샷으로 동시 진행
      const flush1 = flushOutbox(USER_ID);
      const flush2 = flushOutbox(USER_ID);

      await Promise.resolve();
      await Promise.resolve();

      // 발사된 fetch 들을 순서대로 처리: A→5xx, A→5xx, B→200, B→200 형태로 섞임.
      // 가장 단순/결정적으로: A 관련은 모두 5xx, B 관련은 모두 200.
      // (resolveNext 는 가장 먼저 큐된 fetch 부터 처리)
      // entry 순서는 flushOutbox 내부 fresh 순서 [A, B] 이므로,
      // 두 flush 는 먼저 A 를 await — 큐 앞쪽 2건이 A, 뒤 2건이 B.
      // A 2건 → 5xx, B 2건 → 200
      // in-flight 가드(fix)로 두 flush 는 같은 promise 공유 → 단일 run 만 fetch.
      // 따라서 A, B 각 1건만 발사됨. A → 5xx 보관, B → 200 제거.
      await ctrl.resolveNext(503); // A → 5xx (보관)
      await ctrl.resolveNext(200); // B → 200 (제거)
      await Promise.all([flush1, flush2]);

      // dedup: A+B 각 1회만 fetch (가드 없으면 4건 발사)
      expect(ctrl.urls().length).toBe(2);

      // A 는 5xx 라 보관, B 는 성공이라 제거 → outbox 에 A 1건만.
      // 가드가 없으면 두 flush 의 writeOutbox 가 서로 덮어써 entry 부활/유실 발생.
      const remaining = getOutboxSize(USER_ID);
      expect(remaining).toBe(1);

      const ids = JSON.parse(
        lsStore.get(`class_planner_${USER_ID}_sync_outbox`) ?? "[]",
      ).map((e: { id: string }) => e.id);
      expect(ids).toEqual(["session:create:A"]);
    });
  });
});