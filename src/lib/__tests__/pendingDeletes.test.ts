import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  PENDING_DELETE_TTL_MS,
  addPendingDelete,
  getActivePendingDeletes,
  getExpiredPendingDeletes,
  getPendingDeleteIds,
  getPendingDeletes,
  isPendingDelete,
  removePendingDelete,
} from "../pendingDeletes";

// setupTests.ts의 noop localStorage mock을 in-memory store로 덮음
const storage: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => storage[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    storage[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete storage[key];
  }),
  clear: vi.fn(() => {
    for (const key of Object.keys(storage)) delete storage[key];
  }),
};
Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
  writable: true,
});

const STORAGE_KEY = "classPlannerData:anonymous:pendingDeletes";

describe("pendingDeletes", () => {
  beforeEach(() => {
    for (const key of Object.keys(storage)) delete storage[key];
    localStorageMock.getItem.mockImplementation(
      (key: string) => storage[key] ?? null,
    );
    localStorageMock.setItem.mockImplementation(
      (key: string, value: string) => {
        storage[key] = value;
      },
    );
    localStorageMock.removeItem.mockImplementation((key: string) => {
      delete storage[key];
    });
    localStorageMock.clear.mockImplementation(() => {
      for (const key of Object.keys(storage)) delete storage[key];
    });
  });

  it("PENDING_DELETE_TTL_MS는 5초", () => {
    expect(PENDING_DELETE_TTL_MS).toBe(5_000);
  });

  describe("addPendingDelete + getPendingDeletes", () => {
    it("새 entry 저장 + 조회", () => {
      const entry = {
        entityType: "student" as const,
        id: "s1",
        deadline: 100,
      };
      addPendingDelete(entry);
      expect(getPendingDeletes()).toEqual([entry]);
    });

    it("같은 (entityType, id) 중복 추가 시 마지막 deadline으로 dedup", () => {
      addPendingDelete({ entityType: "student", id: "s1", deadline: 100 });
      addPendingDelete({ entityType: "student", id: "s1", deadline: 200 });
      const all = getPendingDeletes();
      expect(all).toHaveLength(1);
      expect(all[0].deadline).toBe(200);
    });

    it("다른 id는 누적", () => {
      addPendingDelete({ entityType: "student", id: "s1", deadline: 100 });
      addPendingDelete({ entityType: "student", id: "s2", deadline: 200 });
      expect(getPendingDeletes()).toHaveLength(2);
    });
  });

  describe("removePendingDelete", () => {
    it("해당 (entityType, id) entry 제거", () => {
      addPendingDelete({ entityType: "student", id: "s1", deadline: 100 });
      addPendingDelete({ entityType: "student", id: "s2", deadline: 200 });
      removePendingDelete("student", "s1");
      const remaining = getPendingDeletes();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe("s2");
    });

    it("없는 entry 제거 시 noop (write 안 함)", () => {
      addPendingDelete({ entityType: "student", id: "s1", deadline: 100 });
      const setCallsBefore = localStorageMock.setItem.mock.calls.length;
      removePendingDelete("student", "s999");
      const setCallsAfter = localStorageMock.setItem.mock.calls.length;
      expect(setCallsAfter).toBe(setCallsBefore);
      expect(getPendingDeletes()).toHaveLength(1);
    });
  });

  describe("isPendingDelete", () => {
    it("매칭 entry true", () => {
      addPendingDelete({ entityType: "student", id: "s1", deadline: 100 });
      expect(isPendingDelete("student", "s1")).toBe(true);
    });

    it("매칭 없으면 false", () => {
      addPendingDelete({ entityType: "student", id: "s1", deadline: 100 });
      expect(isPendingDelete("student", "s2")).toBe(false);
    });
  });

  describe("getActivePendingDeletes / getExpiredPendingDeletes", () => {
    it("now 기준 active(deadline > now) / expired(deadline <= now) 분리", () => {
      const now = 10_000;
      addPendingDelete({
        entityType: "student",
        id: "active",
        deadline: now + 1000,
      });
      addPendingDelete({
        entityType: "student",
        id: "expired",
        deadline: now - 1000,
      });
      addPendingDelete({
        entityType: "student",
        id: "boundary",
        deadline: now,
      });

      const active = getActivePendingDeletes(now);
      const expired = getExpiredPendingDeletes(now);

      expect(active.map((p) => p.id)).toEqual(["active"]);
      expect(expired.map((p) => p.id).sort()).toEqual(["boundary", "expired"]);
    });
  });

  describe("getPendingDeleteIds", () => {
    it("entityType 필터된 Set 반환", () => {
      addPendingDelete({ entityType: "student", id: "s1", deadline: 100 });
      addPendingDelete({ entityType: "student", id: "s2", deadline: 200 });
      const ids = getPendingDeleteIds("student");
      expect(ids.has("s1")).toBe(true);
      expect(ids.has("s2")).toBe(true);
      expect(ids.size).toBe(2);
    });

    it("entry 없으면 빈 Set", () => {
      expect(getPendingDeleteIds("student").size).toBe(0);
    });
  });

  describe("corrupted localStorage", () => {
    it("invalid JSON → empty array fallback", () => {
      storage[STORAGE_KEY] = "{not json";
      expect(getPendingDeletes()).toEqual([]);
    });

    it("배열 아닌 값 → empty array fallback", () => {
      storage[STORAGE_KEY] = JSON.stringify({ id: "s1" });
      expect(getPendingDeletes()).toEqual([]);
    });

    it("일부 entry 깨져 있어도 정상 entry만 반환", () => {
      storage[STORAGE_KEY] = JSON.stringify([
        { entityType: "student", id: "ok", deadline: 100 },
        { entityType: "student", id: 123 },
        null,
        { something: "else" },
      ]);
      const result = getPendingDeletes();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("ok");
    });
  });

  describe("entityType 분리 (student vs subject)", () => {
    it("같은 id라도 entityType이 다르면 별개 entry로 저장", () => {
      addPendingDelete({ entityType: "student", id: "x1", deadline: 100 });
      addPendingDelete({ entityType: "subject", id: "x1", deadline: 200 });
      expect(getPendingDeletes()).toHaveLength(2);
      expect(getPendingDeleteIds("student").has("x1")).toBe(true);
      expect(getPendingDeleteIds("subject").has("x1")).toBe(true);
    });

    it("removePendingDelete는 entityType + id 모두 매칭 시에만 제거", () => {
      addPendingDelete({ entityType: "student", id: "x1", deadline: 100 });
      addPendingDelete({ entityType: "subject", id: "x1", deadline: 200 });
      removePendingDelete("student", "x1");
      expect(getPendingDeleteIds("student").size).toBe(0);
      expect(getPendingDeleteIds("subject").size).toBe(1);
    });

    it("getPendingDeleteIds는 entityType 한정", () => {
      addPendingDelete({ entityType: "student", id: "s1", deadline: 100 });
      addPendingDelete({ entityType: "subject", id: "j1", deadline: 200 });
      expect(getPendingDeleteIds("student")).toEqual(new Set(["s1"]));
      expect(getPendingDeleteIds("subject")).toEqual(new Set(["j1"]));
    });
  });
});
