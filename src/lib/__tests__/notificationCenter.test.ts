import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearAllNotifications,
  dismissNotification,
  getNotifications,
  isTrackable,
  markAllNotificationsRead,
  markNotificationRead,
  pushNotification,
  subscribeNotifications,
} from "../notificationCenter";

const USER_A = "user-a";
const USER_B = "user-b";
const ANON_KEY = "class_planner_anonymous_notification_history";
const KEY_A = `class_planner_${USER_A}_notification_history`;

describe("notificationCenter", () => {
  // setupTests.ts에서 localStorage가 단순 vi.fn() mock이라 실제 read/write
  // 불가능. 매 테스트 fresh in-memory Map으로 spy 재설정.
  let store: Record<string, string>;

  beforeEach(() => {
    store = {};
    vi.spyOn(window.localStorage, "getItem").mockImplementation(
      (k: string) => (k in store ? store[k] : null),
    );
    vi.spyOn(window.localStorage, "setItem").mockImplementation(
      (k: string, v: string) => {
        store[k] = v;
      },
    );
    vi.spyOn(window.localStorage, "removeItem").mockImplementation((k: string) => {
      delete store[k];
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("isTrackable", () => {
    it("error/warning만 true", () => {
      expect(isTrackable("error")).toBe(true);
      expect(isTrackable("warning")).toBe(true);
      expect(isTrackable("success")).toBe(false);
      expect(isTrackable("info")).toBe(false);
    });
  });

  describe("pushNotification", () => {
    it("새 entry는 최신순(첫 번째)으로 보관된다", () => {
      pushNotification(USER_A, "info", "첫 번째");
      pushNotification(USER_A, "error", "두 번째");
      const list = getNotifications(USER_A);
      expect(list).toHaveLength(2);
      expect(list[0].message).toBe("두 번째");
      expect(list[1].message).toBe("첫 번째");
    });

    it("push 시 read=false, createdAt + id 자동 부여", () => {
      const entry = pushNotification(USER_A, "warning", "테스트");
      expect(entry.id).toBeTruthy();
      expect(entry.read).toBe(false);
      expect(entry.createdAt).toBeGreaterThan(0);
      expect(entry.level).toBe("warning");
      expect(entry.message).toBe("테스트");
    });

    it("50개 초과 시 oldest drop (FIFO)", () => {
      for (let i = 0; i < 55; i++) {
        pushNotification(USER_A, "info", `msg-${i}`);
      }
      const list = getNotifications(USER_A);
      expect(list).toHaveLength(50);
      // 최신순이므로 첫 항목이 msg-54 (가장 최근)
      expect(list[0].message).toBe("msg-54");
      // 가장 오래된 5개(0,1,2,3,4)는 drop, 남은 oldest는 msg-5
      expect(list[49].message).toBe("msg-5");
    });

    it("contextUrl 옵션 보존", () => {
      pushNotification(USER_A, "error", "에러 발생", { contextUrl: "/schedule" });
      const list = getNotifications(USER_A);
      expect(list[0].contextUrl).toBe("/schedule");
    });
  });

  describe("TTL prune (24h)", () => {
    it("createdAt이 24h 이전인 entry는 getNotifications에서 자동 제거", () => {
      // 직접 storage 조작 — 25h 이전 entry 1개 + 최근 entry 1개
      const now = Date.now();
      const ttlEntry = {
        id: "old",
        level: "error" as const,
        message: "오래된",
        createdAt: now - 25 * 60 * 60 * 1000,
        read: false,
      };
      const freshEntry = {
        id: "fresh",
        level: "info" as const,
        message: "최근",
        createdAt: now - 1000,
        read: false,
      };
      store[KEY_A] = JSON.stringify([freshEntry, ttlEntry]);

      const list = getNotifications(USER_A);
      expect(list).toHaveLength(1);
      expect(list[0].id).toBe("fresh");
    });

    it("prune 후 writeback (idempotent)", () => {
      const now = Date.now();
      const stale = {
        id: "stale",
        level: "error" as const,
        message: "stale",
        createdAt: now - 25 * 60 * 60 * 1000,
        read: false,
      };
      store[KEY_A] = JSON.stringify([stale]);

      getNotifications(USER_A);
      // writeback 후엔 prune된 결과만 남아있음
      const after = JSON.parse(store[KEY_A]);
      expect(after).toHaveLength(0);
    });
  });

  describe("markNotificationRead", () => {
    it("단일 entry만 read=true", () => {
      const a = pushNotification(USER_A, "error", "a");
      pushNotification(USER_A, "warning", "b");

      markNotificationRead(USER_A, a.id);

      const list = getNotifications(USER_A);
      const aAfter = list.find((e) => e.id === a.id)!;
      const bAfter = list.find((e) => e.message === "b")!;
      expect(aAfter.read).toBe(true);
      expect(bAfter.read).toBe(false);
    });

    it("존재하지 않는 id는 no-op", () => {
      pushNotification(USER_A, "info", "x");
      const before = store[KEY_A];
      markNotificationRead(USER_A, "non-existent");
      expect(store[KEY_A]).toBe(before);
    });

    it("이미 read인 entry는 writeback 안 발생", () => {
      const setItemSpy = vi.spyOn(window.localStorage, "setItem");
      const a = pushNotification(USER_A, "error", "a");
      markNotificationRead(USER_A, a.id);
      setItemSpy.mockClear();
      markNotificationRead(USER_A, a.id); // 이미 read
      expect(setItemSpy).not.toHaveBeenCalled();
    });
  });

  describe("markAllNotificationsRead", () => {
    it("전체 entry read=true", () => {
      pushNotification(USER_A, "error", "a");
      pushNotification(USER_A, "warning", "b");
      pushNotification(USER_A, "info", "c");

      markAllNotificationsRead(USER_A);

      const list = getNotifications(USER_A);
      expect(list.every((e) => e.read)).toBe(true);
    });

    it("이미 모두 read면 writeback 안 발생", () => {
      pushNotification(USER_A, "error", "a");
      markAllNotificationsRead(USER_A);
      const setItemSpy = vi.spyOn(window.localStorage, "setItem");
      markAllNotificationsRead(USER_A);
      expect(setItemSpy).not.toHaveBeenCalled();
    });
  });

  describe("dismissNotification", () => {
    it("단일 entry 제거", () => {
      const a = pushNotification(USER_A, "error", "a");
      pushNotification(USER_A, "warning", "b");

      dismissNotification(USER_A, a.id);

      const list = getNotifications(USER_A);
      expect(list).toHaveLength(1);
      expect(list[0].message).toBe("b");
    });

    it("존재하지 않는 id는 no-op", () => {
      pushNotification(USER_A, "info", "x");
      const before = store[KEY_A];
      dismissNotification(USER_A, "non-existent");
      expect(store[KEY_A]).toBe(before);
    });
  });

  describe("clearAllNotifications", () => {
    it("storage key 자체 제거", () => {
      pushNotification(USER_A, "error", "a");
      clearAllNotifications(USER_A);
      expect(store[KEY_A]).toBeUndefined();
      expect(getNotifications(USER_A)).toHaveLength(0);
    });
  });

  describe("userId scope", () => {
    it("anonymous와 userId는 격리된 storage", () => {
      pushNotification(null, "error", "anon");
      pushNotification(USER_A, "warning", "userA");

      const anonList = getNotifications(null);
      const aList = getNotifications(USER_A);

      expect(anonList).toHaveLength(1);
      expect(anonList[0].message).toBe("anon");
      expect(aList).toHaveLength(1);
      expect(aList[0].message).toBe("userA");
      expect(store[ANON_KEY]).toBeTruthy();
      expect(store[KEY_A]).toBeTruthy();
    });

    it("다른 userId 사이도 격리", () => {
      pushNotification(USER_A, "error", "a");
      pushNotification(USER_B, "warning", "b");

      expect(getNotifications(USER_A)).toHaveLength(1);
      expect(getNotifications(USER_B)).toHaveLength(1);
      expect(getNotifications(USER_A)[0].message).toBe("a");
      expect(getNotifications(USER_B)[0].message).toBe("b");
    });
  });

  describe("subscribeNotifications", () => {
    it("push 시 listener 호출", () => {
      const listener = vi.fn();
      const unsub = subscribeNotifications(listener);
      pushNotification(USER_A, "info", "x");
      expect(listener).toHaveBeenCalledTimes(1);
      unsub();
    });

    it("unsub 후엔 listener 호출 안 됨", () => {
      const listener = vi.fn();
      const unsub = subscribeNotifications(listener);
      unsub();
      pushNotification(USER_A, "info", "x");
      expect(listener).not.toHaveBeenCalled();
    });

    it("markNotificationRead/dismiss도 listener 호출", () => {
      const a = pushNotification(USER_A, "error", "a");
      const listener = vi.fn();
      const unsub = subscribeNotifications(listener);

      markNotificationRead(USER_A, a.id);
      expect(listener).toHaveBeenCalledTimes(1);

      dismissNotification(USER_A, a.id);
      expect(listener).toHaveBeenCalledTimes(2);

      unsub();
    });
  });

  describe("malformed storage 방어", () => {
    it("JSON 파싱 실패 시 빈 배열로 fallback", () => {
      store[KEY_A] = "not-json{";
      expect(getNotifications(USER_A)).toEqual([]);
    });

    it("Array 아닌 JSON은 빈 배열로 fallback", () => {
      store[KEY_A] = JSON.stringify({ foo: "bar" });
      expect(getNotifications(USER_A)).toEqual([]);
    });
  });
});
