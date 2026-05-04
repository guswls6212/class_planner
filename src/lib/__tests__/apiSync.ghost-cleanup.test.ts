import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock("../toast", () => ({
  showToast: vi.fn(),
}));

const deleteSessionFromLocalMock = vi.fn((_id: string) => ({
  success: true,
  data: true,
}));
vi.mock("../localStorageCrud", () => ({
  deleteSessionFromLocal: (id: string) => deleteSessionFromLocalMock(id),
}));

import {
  syncSessionUpdate,
  syncSessionUpdateAsync,
  syncSessionDelete,
  syncSessionCreate,
  __resetSyncStateForTests,
} from "../apiSync";
import { showToast } from "../toast";

describe("apiSync ghost cleanup (PUT/DELETE 404 → localStorage 정리)", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    __resetSyncStateForTests();
    deleteSessionFromLocalMock.mockClear();
    vi.mocked(showToast).mockClear();
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.useRealTimers();
    __resetSyncStateForTests();
  });

  it("syncSessionUpdate가 404 응답 → deleteSessionFromLocal 호출 + 토스트(디바운스 후)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: "not found" }),
    });

    syncSessionUpdate("user-1", "ghost-id", { weekday: 2 });
    // fire-and-forget이라 microtask flush
    await vi.advanceTimersByTimeAsync(0);
    expect(deleteSessionFromLocalMock).toHaveBeenCalledWith("ghost-id");

    // 디바운스 200ms 이후 토스트
    await vi.advanceTimersByTimeAsync(250);
    const toasts = vi.mocked(showToast).mock.calls.filter((c) => c[0] === "info");
    expect(toasts.length).toBe(1);
    expect(toasts[0][1]).toMatch(/서버에 없어 정리/);
  });

  it("syncSessionUpdateAsync가 404 응답 → cleanup + false 반환", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    });
    const ok = await syncSessionUpdateAsync("user-1", "ghost-2", {
      weekday: 1,
      startsAt: "09:00",
      endsAt: "10:00",
    } as any);
    expect(ok).toBe(false);
    expect(deleteSessionFromLocalMock).toHaveBeenCalledWith("ghost-2");
  });

  it("syncSessionDelete가 404 응답 → cleanup 호출 (이미 server에 없는 케이스)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: "not found" }),
    });
    syncSessionDelete("user-1", "already-gone");
    await vi.advanceTimersByTimeAsync(0);
    expect(deleteSessionFromLocalMock).toHaveBeenCalledWith("already-gone");
  });

  it("PUT 200 정상 응답 → cleanup 안 함", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });
    syncSessionUpdate("user-1", "valid-id", { weekday: 2 });
    await vi.advanceTimersByTimeAsync(0);
    expect(deleteSessionFromLocalMock).not.toHaveBeenCalled();
  });

  it("PUT 500 응답 → cleanup 안 함 (5xx는 retry/outbox 정책)", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: "server error" }),
    });
    syncSessionUpdate("user-1", "id-x", { weekday: 2 });
    await vi.advanceTimersByTimeAsync(0);
    expect(deleteSessionFromLocalMock).not.toHaveBeenCalled();
  });

  it("디바운스 — 3개 ghost 빠르게 정리 시 토스트는 1번만 (count=3)", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: "not found" }),
    });
    syncSessionUpdate("user-1", "g1", { weekday: 1 });
    syncSessionUpdate("user-1", "g2", { weekday: 1 });
    syncSessionUpdate("user-1", "g3", { weekday: 1 });
    await vi.advanceTimersByTimeAsync(0);
    expect(deleteSessionFromLocalMock).toHaveBeenCalledTimes(3);

    await vi.advanceTimersByTimeAsync(250);
    const infoCalls = vi.mocked(showToast).mock.calls.filter((c) => c[0] === "info");
    expect(infoCalls.length).toBe(1);
    expect(infoCalls[0][1]).toMatch(/3개/);
  });

  it("race guard — syncSessionCreate 직후 30s 내 PUT 404는 cleanup 스킵 (POST race 보호)", async () => {
    // POST는 pending (응답 안 줌) — 동시에 PUT /position이 먼저 도달해 404 받는 상황
    // mock: 두 fetch 모두 호출되지만 PUT만 즉시 404, POST는 미해결
    mockFetch.mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        return new Promise(() => {}); // forever pending
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: "not found" }),
      });
    });

    // 새 session POST 발사 (race guard 시작)
    syncSessionCreate("user-1", {
      id: "fresh-session",
      subjectId: "s",
      studentIds: [],
      weekday: 1,
      startsAt: "09:00",
      endsAt: "10:00",
      weekStartDate: "2026-05-04",
      enrollmentIds: [],
    } as any);

    // 직후 PUT /position이 404 받음
    syncSessionUpdate("user-1", "fresh-session", { weekday: 2 });
    await vi.advanceTimersByTimeAsync(0);

    // race guard로 cleanup 스킵 — deleteSessionFromLocal 호출 안 됨
    expect(deleteSessionFromLocalMock).not.toHaveBeenCalled();
    // 토스트도 안 뜸
    await vi.advanceTimersByTimeAsync(250);
    const infoCalls = vi.mocked(showToast).mock.calls.filter((c) => c[0] === "info");
    expect(infoCalls.length).toBe(0);
  });

  it("race guard 만료 후 (30s 경과) 동일 ID PUT 404 → 정상 cleanup", async () => {
    mockFetch.mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        return new Promise(() => {}); // forever pending
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: "not found" }),
      });
    });

    syncSessionCreate("user-1", {
      id: "stale-fresh",
      subjectId: "s",
      studentIds: [],
      weekday: 1,
      startsAt: "09:00",
      endsAt: "10:00",
      weekStartDate: "2026-05-04",
      enrollmentIds: [],
    } as any);

    // 30초 + 1ms 경과
    await vi.advanceTimersByTimeAsync(30_001);

    syncSessionUpdate("user-1", "stale-fresh", { weekday: 2 });
    await vi.advanceTimersByTimeAsync(0);

    // grace 만료 → cleanup 정상 실행
    expect(deleteSessionFromLocalMock).toHaveBeenCalledWith("stale-fresh");
  });
});
