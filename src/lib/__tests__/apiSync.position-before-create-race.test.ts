import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Regression lock — race-gap "position-before-create-404"
 * (UAT audit findings 2026-05-30: §E-7 / §S-6.2).
 *
 * 드래그-드롭 위치 변경의 *production 경로*는 fire-and-forget `syncSessionUpdate`
 * (일반 PUT /api/sessions/[id]) 가 아니라 awaitable `syncSessionUpdateAsync`
 * (PUT /api/sessions/[id]/position) 다. (schedule/page.tsx:630,687,1518)
 *
 * 사고 시나리오: '수업 추가'로 새 session 을 만든 직후(POST 응답 도착 전) 곧바로
 * 그 session 을 드래그하면 PUT /position 이 POST 보다 먼저 server 에 도달해 404 를
 * 받는다. 404 는 cleanupGhostSession 을 호출 → 방금 만든 정상 session 을
 * localStorage 에서 즉시 삭제하던 사고(2026-05-04)가 있었다.
 *
 * 가드: syncSessionCreate 가 markRecentCreate 로 30s(GHOST_CLEANUP_GRACE_MS) grace
 * 를 시작하고, cleanupGhostSession 이 isWithinCreateGrace 로 그 안의 ghost cleanup
 * 을 보류한다. 기존 apiSync.ghost-cleanup.test.ts 는 *fire-and-forget*
 * syncSessionUpdate 경로의 grace 만 검증한다 — 실제 드래그가 쓰는
 * syncSessionUpdateAsync(/position) 경로의 create-grace 회귀 가드는 부재했다.
 *
 * 판정: passing — 현재 코드가 올바르다. 이 테스트는 그 올바른 동작을 잠근다.
 */

vi.mock("../logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock("../toast", () => ({
  showToast: vi.fn(),
  showError: vi.fn(),
}));

// outbox enqueue 를 결정적으로 관찰 — 5xx 분기 검증용.
const enqueueOutboxMock = vi.fn();
vi.mock("../syncOutbox", () => ({
  enqueueOutbox: (...args: unknown[]) => enqueueOutboxMock(...args),
}));

// ghost cleanup 의 localStorage 삭제를 spy — 실제 호출 여부가 핵심 단언.
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

const USER = "user-race";
const FRESH_ID = "fresh-drag-session";

/** 드래그-드롭이 보내는 /position payload 형태(weekday/startsAt/endsAt/yPosition). */
const DRAG_DELTA = {
  weekday: 3,
  startsAt: "13:00",
  endsAt: "14:00",
  yPosition: 1,
} as const;

/** syncSessionCreate 가 받는 Session 형태(최소 필드). */
function makeFreshSession(id: string) {
  return {
    id,
    subjectId: "subj-1",
    studentIds: [],
    weekday: 1,
    startsAt: "09:00",
    endsAt: "10:00",
    weekStartDate: "2026-05-25",
    enrollmentIds: [],
    yPosition: 0,
  } as Parameters<typeof syncSessionCreate>[1];
}

describe("apiSync — position-before-create 404 race (드래그 /position 경로)", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    __resetSyncStateForTests();
    deleteSessionFromLocalMock.mockClear();
    enqueueOutboxMock.mockClear();
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.useRealTimers();
    __resetSyncStateForTests();
    vi.clearAllMocks();
  });

  it("새 session 생성 직후(POST 응답 전) PUT /position 이 404여도 ghost cleanup 보류 — 정상 session 유실 0", async () => {
    // POST 는 forever-pending(응답 전), PUT /position 은 먼저 도달해 404.
    mockFetch.mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        return new Promise<Response>(() => {}); // 응답 안 옴 — POST 아직 in-flight
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: "not found" }),
      } as unknown as Response);
    });

    // 1) 수업 추가 — race grace 시작
    syncSessionCreate(USER, makeFreshSession(FRESH_ID));

    // 2) 응답 오기 전 곧바로 드래그 — /position 으로 404 받음
    const ok = await syncSessionUpdateAsync(USER, FRESH_ID, { ...DRAG_DELTA });

    // 404 라 sync 는 false 지만, grace 안이므로 localStorage 삭제는 보류돼야 함.
    expect(ok).toBe(false);
    expect(deleteSessionFromLocalMock).not.toHaveBeenCalled();

    // grace 디바운스 토스트도 안 떠야 함(삭제 자체가 없었으므로).
    await vi.advanceTimersByTimeAsync(250);
    expect(deleteSessionFromLocalMock).not.toHaveBeenCalled();
  });

  it("드래그 sync 는 일반 PUT 이 아니라 /position 전용 endpoint 를 친다", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    } as unknown as Response);

    await syncSessionUpdateAsync(USER, FRESH_ID, { ...DRAG_DELTA });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [calledUrl, calledInit] = mockFetch.mock.calls[0];
    expect(calledUrl).toContain(`/api/sessions/${FRESH_ID}/position`);
    expect(calledUrl).toContain(`userId=${USER}`);
    expect((calledInit as RequestInit).method).toBe("PUT");
    // /position body 는 API 스펙 필드명(time/endTime)으로 매핑돼야 함.
    const body = JSON.parse((calledInit as RequestInit).body as string);
    expect(body).toMatchObject({
      weekday: DRAG_DELTA.weekday,
      time: DRAG_DELTA.startsAt,
      endTime: DRAG_DELTA.endsAt,
      yPosition: DRAG_DELTA.yPosition,
    });
  });

  it("grace 만료(30s 경과) 후 동일 ID /position 404 → 진짜 ghost 로 판단해 정상 cleanup", async () => {
    mockFetch.mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        return new Promise<Response>(() => {});
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: "not found" }),
      } as unknown as Response);
    });

    syncSessionCreate(USER, makeFreshSession(FRESH_ID));

    // grace(30s) 만료
    await vi.advanceTimersByTimeAsync(30_001);

    const ok = await syncSessionUpdateAsync(USER, FRESH_ID, { ...DRAG_DELTA });

    expect(ok).toBe(false);
    // grace 만료라 오래된 잔재(ghost)로 보고 정상 정리.
    expect(deleteSessionFromLocalMock).toHaveBeenCalledWith(FRESH_ID);
  });

  it("최근 생성 이력 없는 ID 의 /position 404 → grace 무관, 즉시 cleanup", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: "not found" }),
    } as unknown as Response);

    const ok = await syncSessionUpdateAsync(USER, "stale-orphan-id", {
      ...DRAG_DELTA,
    });

    expect(ok).toBe(false);
    expect(deleteSessionFromLocalMock).toHaveBeenCalledWith("stale-orphan-id");
  });

  it("/position 5xx → ghost cleanup 안 하고 outbox 에 enqueue (다음 진입 시 재시도)", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: "server error" }),
    } as unknown as Response);

    const ok = await syncSessionUpdateAsync(USER, FRESH_ID, { ...DRAG_DELTA });

    expect(ok).toBe(false);
    // 5xx 는 ghost 가 아님 — localStorage 삭제 금지.
    expect(deleteSessionFromLocalMock).not.toHaveBeenCalled();
    // 일시 장애라 outbox 보관.
    expect(enqueueOutboxMock).toHaveBeenCalledTimes(1);
    const [outUser, outItem] = enqueueOutboxMock.mock.calls[0];
    expect(outUser).toBe(USER);
    expect(outItem).toMatchObject({
      id: `session:update:${FRESH_ID}`,
      method: "PUT",
    });
    expect(outItem.url).toContain(`/api/sessions/${FRESH_ID}/position`);
  });

  it("/position 네트워크 오류 → ghost cleanup 안 하고 outbox 에 enqueue", async () => {
    mockFetch.mockRejectedValue(new Error("network down"));

    const ok = await syncSessionUpdateAsync(USER, FRESH_ID, { ...DRAG_DELTA });

    expect(ok).toBe(false);
    expect(deleteSessionFromLocalMock).not.toHaveBeenCalled();
    expect(enqueueOutboxMock).toHaveBeenCalledTimes(1);
  });
});
