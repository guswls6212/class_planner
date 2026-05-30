/**
 * 회귀 가드 — cross-week navigate + 즉시 드래그 시 POST/PUT race ghost-cleanup 보호.
 *
 * 배경 (UAT audit S-5.24 / S-6.13, uat-audit-findings-2026-05-30.md):
 *   다른 주(週)로 navigate 한 직후 새 세션을 등록(syncSessionCreate)하고, 응답이
 *   도착하기 전 곧바로 그 세션을 드래그하면 — 드래그 commit 은 production 에서
 *   `/api/sessions/[id]/position` 전용 엔드포인트(syncSessionUpdateAsync)를 사용한다
 *   (apiSync.ts:849). 이 PUT /position 이 POST 보다 먼저 서버에 도달하면 404 를
 *   받는데, 이때 30초(GHOST_CLEANUP_GRACE_MS) grace 가 방금 만든 세션을
 *   ghost-cleanup 으로 즉시 삭제하지 않도록 보호해야 한다 (apiSync.ts:50-71, 869).
 *
 * 기존 apiSync.ghost-cleanup.test.ts 는 fire-and-forget PUT 경로
 * (syncSessionUpdate → /api/sessions/[id]) 의 grace guard 만 검증한다.
 * 본 spec 은 **드래그 경로(syncSessionUpdateAsync → /position)** 가 동일 grace 를
 * 존중하는지를 잠근다 — 이 경로 회귀(예: cleanupGhostSession 우회, grace 체크 누락)
 * 시 새 세션이 silent 삭제되는 사고를 노출한다.
 *
 * 결정적(deterministic): fetch mock + vi.useFakeTimers. 실제 멀티탭/타이밍 race 가
 * 아니라 "create 직후 grace 윈도우 내 404" 라는 단일 모듈 불변식이므로 단위 재현 가능.
 */

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
  // pendingDeletes 모듈이 module-init 시점에 호출 — mock 누락 시 CI fail.
  getStorageKey: () => "classPlannerData:test",
}));

import {
  syncSessionCreate,
  syncSessionUpdateAsync,
  __resetSyncStateForTests,
} from "../apiSync";
import { showToast } from "../toast";

// 각 테스트 고유 ID — 격리 + grace 맵 leak 방지(추가 안전망; __reset 도 clear 함).
const freshId = () => `xweek-${crypto.randomUUID()}`;

const makeNewSession = (id: string, weekStartDate: string) =>
  ({
    id,
    subjectId: "subj-x",
    studentIds: [],
    weekday: 1,
    startsAt: "09:00",
    endsAt: "10:00",
    weekStartDate, // 다른 주 등록 — planSessionAdd 가 채워 넣는 필드
    enrollmentIds: [],
  }) as any;

describe("apiSync — cross-week navigate + 즉시 드래그 POST/PUT race (/position 경로)", () => {
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

  it("드래그(/position) PUT 이 POST 보다 먼저 도달해 404 → grace 내라 새 세션 삭제 안 함", async () => {
    const id = freshId();
    // POST 는 영원히 pending (아직 서버 미도달), /position PUT 만 즉시 404.
    mockFetch.mockImplementation((_url: string, init?: RequestInit) => {
      if (init?.method === "POST") return new Promise(() => {}); // forever pending
      return Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: "not found" }),
      });
    });

    // 1) 다른 주(2026-05-25)로 navigate 후 세션 등록 → race guard 시작
    syncSessionCreate("user-1", makeNewSession(id, "2026-05-25"));

    // 2) 응답 전 곧바로 드래그 — production 드래그 commit 경로(/position).
    const ok = await syncSessionUpdateAsync("user-1", id, {
      weekday: 2,
      startsAt: "11:00",
      endsAt: "12:00",
      yPosition: 1,
    } as any);

    // /position 은 404 라 false 반환하지만,
    expect(ok).toBe(false);
    // grace(30s) 보호로 방금 만든 세션을 localStorage 에서 지우지 않아야 한다.
    expect(deleteSessionFromLocalMock).not.toHaveBeenCalled();

    // "서버에 없어 정리됨" 토스트도 발화하지 않는다.
    await vi.advanceTimersByTimeAsync(250);
    const infoCalls = vi
      .mocked(showToast)
      .mock.calls.filter((c) => c[0] === "info");
    expect(infoCalls.length).toBe(0);
  });

  it("PUT URL 은 /api/sessions/[id]/position 전용 엔드포인트 (partial PUT 아님)", async () => {
    const id = freshId();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    await syncSessionUpdateAsync("user-1", id, {
      weekday: 2,
      startsAt: "11:00",
      endsAt: "12:00",
      yPosition: 1,
    } as any);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [calledUrl, init] = mockFetch.mock.calls[0];
    expect(String(calledUrl)).toContain(`/api/sessions/${id}/position`);
    expect(String(calledUrl)).toContain("userId=user-1");
    expect((init as RequestInit).method).toBe("PUT");
    // /position body 필드명: time/endTime (= startsAt/endsAt), weekday, yPosition.
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).toMatchObject({
      weekday: 2,
      time: "11:00",
      endTime: "12:00",
      yPosition: 1,
    });
  });

  it("grace 만료(30s 경과) 후 동일 세션 /position 404 → 진짜 ghost 로 cleanup", async () => {
    const id = freshId();
    mockFetch.mockImplementation((_url: string, init?: RequestInit) => {
      if (init?.method === "POST") return new Promise(() => {}); // forever pending
      return Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: "not found" }),
      });
    });

    syncSessionCreate("user-1", makeNewSession(id, "2026-05-25"));

    // 30초 + 1ms 경과 — grace 만료
    await vi.advanceTimersByTimeAsync(30_001);

    const ok = await syncSessionUpdateAsync("user-1", id, {
      weekday: 2,
      startsAt: "11:00",
      endsAt: "12:00",
      yPosition: 1,
    } as any);

    expect(ok).toBe(false);
    // grace 만료 후엔 정상 cleanup (오래된 잔재만 제거하는 의도된 동작).
    expect(deleteSessionFromLocalMock).toHaveBeenCalledWith(id);
  });

  it("create 없이 곧바로 /position 404 → grace 없음 → 즉시 cleanup (대조군)", async () => {
    const id = freshId();
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: "not found" }),
    });

    // syncSessionCreate 선행 없음 → markRecentCreate 안 됨 → grace 보호 대상 아님.
    const ok = await syncSessionUpdateAsync("user-1", id, {
      weekday: 2,
      startsAt: "11:00",
      endsAt: "12:00",
      yPosition: 1,
    } as any);

    expect(ok).toBe(false);
    expect(deleteSessionFromLocalMock).toHaveBeenCalledWith(id);
  });

  it("/position 200 정상 응답 → cleanup 안 함 (드래그가 제 위치에 반영됨)", async () => {
    const id = freshId();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    });

    const ok = await syncSessionUpdateAsync("user-1", id, {
      weekday: 2,
      startsAt: "11:00",
      endsAt: "12:00",
      yPosition: 1,
    } as any);

    expect(ok).toBe(true);
    expect(deleteSessionFromLocalMock).not.toHaveBeenCalled();
  });
});