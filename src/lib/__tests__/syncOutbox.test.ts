import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  enqueueOutbox,
  flushOutbox,
  flushOutboxEntry,
  getOutboxEntries,
  getOutboxSize,
  removeOutboxEntry,
  clearOutbox,
} from "../syncOutbox";

vi.mock("../logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() },
}));

const USER_ID = "user-1";

// setupTests.ts가 localStorage를 vi.fn() 더미로 모킹하므로 인메모리 store로 재정의
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
});

describe("syncOutbox", () => {
  describe("enqueue / size / clear", () => {
    it("enqueue 후 size가 1", () => {
      enqueueOutbox(USER_ID, {
        id: "session:create:abc",
        context: "session:create",
        method: "POST",
        url: "/api/sessions?userId=user-1",
        body: { foo: "bar" },
      });
      expect(getOutboxSize(USER_ID)).toBe(1);
    });

    it("같은 id는 update (dedup)", () => {
      enqueueOutbox(USER_ID, {
        id: "session:update:s1",
        context: "session:update",
        method: "PUT",
        url: "/url1",
        body: { v: 1 },
      });
      enqueueOutbox(USER_ID, {
        id: "session:update:s1",
        context: "session:update",
        method: "PUT",
        url: "/url1",
        body: { v: 2 },
      });
      expect(getOutboxSize(USER_ID)).toBe(1);
    });

    it("100개 초과 시 가장 오래된 것 drop (FIFO)", () => {
      for (let i = 0; i < 105; i++) {
        enqueueOutbox(USER_ID, {
          id: `e-${i}`,
          context: "test",
          method: "POST",
          url: "/x",
        });
      }
      expect(getOutboxSize(USER_ID)).toBe(100);
    });

    it("clearOutbox로 전체 삭제", () => {
      enqueueOutbox(USER_ID, {
        id: "x",
        context: "t",
        method: "POST",
        url: "/x",
      });
      clearOutbox(USER_ID);
      expect(getOutboxSize(USER_ID)).toBe(0);
    });

    it("userId가 빈 문자열이면 enqueue 안 함", () => {
      enqueueOutbox("", {
        id: "x",
        context: "t",
        method: "POST",
        url: "/x",
      });
      expect(getOutboxSize(USER_ID)).toBe(0);
    });
  });

  describe("flush", () => {
    let mockFetch: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockFetch = vi.fn();
      global.fetch = mockFetch;
    });

    it("빈 outbox는 fetch 미호출 + 0 반환", async () => {
      const res = await flushOutbox(USER_ID);
      expect(res).toEqual({ sent: 0, failed: 0, expired: 0 });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("성공 항목은 sent + outbox에서 제거", async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 200 });
      enqueueOutbox(USER_ID, {
        id: "a",
        context: "session:create",
        method: "POST",
        url: "/api/sessions?userId=user-1",
        body: { foo: "bar" },
      });
      const res = await flushOutbox(USER_ID);
      expect(res.sent).toBe(1);
      expect(getOutboxSize(USER_ID)).toBe(0);
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/sessions?userId=user-1",
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("4xx 응답은 failed로 분류 + outbox에서 제거 (retry 무의미)", async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 400 });
      enqueueOutbox(USER_ID, {
        id: "a",
        context: "session:create",
        method: "POST",
        url: "/x",
      });
      const res = await flushOutbox(USER_ID);
      expect(res.failed).toBe(1);
      expect(getOutboxSize(USER_ID)).toBe(0);
    });

    it("5xx 응답은 outbox에 보관 (다음 flush까지)", async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 503 });
      enqueueOutbox(USER_ID, {
        id: "a",
        context: "session:create",
        method: "POST",
        url: "/x",
      });
      const res = await flushOutbox(USER_ID);
      expect(res.sent).toBe(0);
      expect(res.failed).toBe(0);
      expect(getOutboxSize(USER_ID)).toBe(1);
    });

    it("네트워크 오류는 outbox에 보관", async () => {
      mockFetch.mockRejectedValue(new Error("Network down"));
      enqueueOutbox(USER_ID, {
        id: "a",
        context: "session:create",
        method: "POST",
        url: "/x",
      });
      const res = await flushOutbox(USER_ID);
      expect(res.sent).toBe(0);
      expect(getOutboxSize(USER_ID)).toBe(1);
    });

    it("24시간 초과 항목은 expired + 제거", async () => {
      const oldTime = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
      enqueueOutbox(USER_ID, {
        id: "a",
        context: "session:create",
        method: "POST",
        url: "/x",
        queuedAt: oldTime,
      });
      const res = await flushOutbox(USER_ID);
      expect(res.expired).toBe(1);
      expect(getOutboxSize(USER_ID)).toBe(0);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("getOutboxEntries — read-only access (UI 표시용)", () => {
    it("빈 큐 → 빈 배열", () => {
      expect(getOutboxEntries(USER_ID)).toEqual([]);
    });

    it("queuedAt + lastError 포함한 OutboxEntry 사본 반환", () => {
      enqueueOutbox(USER_ID, {
        id: "x",
        context: "session:update",
        method: "PUT",
        url: "/api/sessions/x?userId=user-1",
        body: { weekday: 2 },
      });
      const entries = getOutboxEntries(USER_ID);
      expect(entries).toHaveLength(1);
      expect(entries[0]).toMatchObject({
        id: "x",
        context: "session:update",
        method: "PUT",
      });
      expect(entries[0].queuedAt).toBeDefined();
    });

    it("userId null → 빈 배열", () => {
      expect(getOutboxEntries(null)).toEqual([]);
    });
  });

  describe("removeOutboxEntry — 단일 항목 제거", () => {
    it("id 매칭 항목만 제거", () => {
      enqueueOutbox(USER_ID, {
        id: "a",
        context: "session:update",
        method: "PUT",
        url: "/x",
      });
      enqueueOutbox(USER_ID, {
        id: "b",
        context: "session:update",
        method: "PUT",
        url: "/x",
      });
      removeOutboxEntry(USER_ID, "a");
      const remaining = getOutboxEntries(USER_ID);
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe("b");
    });

    it("매칭 없으면 변화 없음", () => {
      enqueueOutbox(USER_ID, {
        id: "a",
        context: "session:update",
        method: "PUT",
        url: "/x",
      });
      removeOutboxEntry(USER_ID, "nonexistent");
      expect(getOutboxSize(USER_ID)).toBe(1);
    });
  });

  describe("flushOutboxEntry — 단일 항목 즉시 재시도", () => {
    let mockFetch: ReturnType<typeof vi.fn>;
    beforeEach(() => {
      mockFetch = vi.fn();
      global.fetch = mockFetch;
    });

    it("성공 시 outbox에서 제거 + true 반환", async () => {
      enqueueOutbox(USER_ID, {
        id: "x",
        context: "session:update",
        method: "PUT",
        url: "/api/sessions/x?userId=user-1",
        body: { weekday: 2 },
      });
      mockFetch.mockResolvedValue({ ok: true, status: 200 });
      const ok = await flushOutboxEntry(USER_ID, "x");
      expect(ok).toBe(true);
      expect(getOutboxSize(USER_ID)).toBe(0);
    });

    it("4xx 실패 → drop + false (재시도 무의미)", async () => {
      enqueueOutbox(USER_ID, {
        id: "x",
        context: "session:update",
        method: "PUT",
        url: "/x",
      });
      mockFetch.mockResolvedValue({ ok: false, status: 400 });
      const ok = await flushOutboxEntry(USER_ID, "x");
      expect(ok).toBe(false);
      expect(getOutboxSize(USER_ID)).toBe(0); // dropped
    });

    it("5xx 실패 → 보관 + lastError 갱신", async () => {
      enqueueOutbox(USER_ID, {
        id: "x",
        context: "session:update",
        method: "PUT",
        url: "/x",
      });
      mockFetch.mockResolvedValue({ ok: false, status: 503 });
      const ok = await flushOutboxEntry(USER_ID, "x");
      expect(ok).toBe(false);
      const entries = getOutboxEntries(USER_ID);
      expect(entries).toHaveLength(1);
      expect(entries[0].lastError).toBe("HTTP 503");
    });

    it("network 오류 → 보관 + lastError에 메시지", async () => {
      enqueueOutbox(USER_ID, {
        id: "x",
        context: "session:update",
        method: "PUT",
        url: "/x",
      });
      mockFetch.mockRejectedValue(new Error("offline"));
      const ok = await flushOutboxEntry(USER_ID, "x");
      expect(ok).toBe(false);
      expect(getOutboxEntries(USER_ID)[0].lastError).toBe("offline");
    });

    it("존재하지 않는 id → false", async () => {
      const ok = await flushOutboxEntry(USER_ID, "nope");
      expect(ok).toBe(false);
    });
  });
});
