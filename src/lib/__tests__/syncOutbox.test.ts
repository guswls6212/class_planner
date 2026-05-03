import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  enqueueOutbox,
  flushOutbox,
  getOutboxSize,
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
});
