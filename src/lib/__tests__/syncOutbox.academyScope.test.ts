/**
 * Regression guard — outbox academy-scope (race-gap, UAT audit 2026-05-30, §12).
 *
 * Bug: outbox 키가 academyId 무관(`class_planner_<userId>_sync_outbox`)이라
 *   academy A 에서 오프라인 적재 → B 전환 → flush 시 A 의 entry 가 B 컨텍스트로
 *   읽혀 서버 resolveAcademyId(active=B) 로 잘못 기록 (cross-academy leak).
 *
 * Fix: storageKey 가 active academyId 를 포함 → academy 별 outbox 격리. 각 entry 는
 *   적재 academy 가 active 일 때만 flush → 서버 active=그 academy 로 항상 정확.
 *   pre-fix legacy 키 entries 는 현재 active 키로 1회 마이그레이션(데이터 보존).
 *
 * 결정적: in-memory localStorage. active academy 는 `active_academy:<userId>` 키로 제어
 * (getActiveAcademyId 가 이 키를 읽음). fetch 는 항상 200.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  enqueueOutbox,
  flushOutbox,
  getOutboxEntries,
  getOutboxSize,
} from "../syncOutbox";

vi.mock("../logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() },
}));

const USER_ID = "user-academy-scope";
const ACADEMY_A = "academy-aaaa";
const ACADEMY_B = "academy-bbbb";
const lsStore = new Map<string, string>();

function setActiveAcademy(id: string | null): void {
  if (id === null) lsStore.delete(`active_academy:${USER_ID}`);
  else lsStore.set(`active_academy:${USER_ID}`, id);
}

function scopedKey(academyId: string): string {
  return `class_planner_${USER_ID}_${academyId}_sync_outbox`;
}
const LEGACY_KEY = `class_planner_${USER_ID}_sync_outbox`;

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
  global.fetch = vi.fn(() =>
    Promise.resolve({ ok: true, status: 200 }),
  ) as unknown as typeof fetch;
});

afterEach(() => {
  lsStore.clear();
  vi.restoreAllMocks();
});

function enqueue(id: string): void {
  enqueueOutbox(USER_ID, {
    id,
    context: "session:create",
    method: "POST",
    url: `/api/sessions?userId=${USER_ID}`,
    body: { id },
  });
}

describe("syncOutbox — academy scope 격리 (race-gap: outbox-academy-scope)", () => {
  it("entry 는 적재 시점 active academy 의 scoped 키에 저장된다", () => {
    setActiveAcademy(ACADEMY_A);
    enqueue("a1");

    expect(lsStore.has(scopedKey(ACADEMY_A))).toBe(true);
    expect(lsStore.has(LEGACY_KEY)).toBe(false);
    expect(getOutboxSize(USER_ID)).toBe(1);
  });

  it("academy B 전환 시 A 의 entry 는 B 컨텍스트에서 안 보이고 flush 도 안 건드린다", async () => {
    setActiveAcademy(ACADEMY_A);
    enqueue("a1");

    setActiveAcademy(ACADEMY_B);
    expect(getOutboxSize(USER_ID)).toBe(0); // B active — A 의 entry 격리됨
    enqueue("b1");
    expect(getOutboxSize(USER_ID)).toBe(1);

    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    await flushOutbox(USER_ID); // B 에서 flush — b1 만
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // A 의 a1 은 A 키에 그대로 보존 (cross-academy 미반영)
    setActiveAcademy(ACADEMY_A);
    expect(getOutboxEntries(USER_ID).map((e) => e.id)).toEqual(["a1"]);
  });

  it("legacy 키 entries 는 현재 active academy 키로 1회 마이그레이션된다", () => {
    lsStore.set(
      LEGACY_KEY,
      JSON.stringify([
        {
          id: "old1",
          context: "session:create",
          method: "POST",
          url: `/api/sessions?userId=${USER_ID}`,
          queuedAt: new Date().toISOString(),
        },
      ]),
    );
    setActiveAcademy(ACADEMY_A);

    const entries = getOutboxEntries(USER_ID); // read 시 마이그
    expect(entries.map((e) => e.id)).toEqual(["old1"]);
    expect(lsStore.has(LEGACY_KEY)).toBe(false); // legacy 제거
    expect(lsStore.has(scopedKey(ACADEMY_A))).toBe(true); // active 키로 이동
  });
});
