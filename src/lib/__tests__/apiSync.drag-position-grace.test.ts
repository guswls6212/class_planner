/**
 * Regression: drag-position-order race — POST(create) vs PUT(/position) ordering
 * + ghost-cleanup create-grace.
 *
 * UAT finding (uat-audit-findings-2026-05-30.md, S-6.2 / E-7):
 *   드래그 위치 sync 는 일반 PUT /api/sessions/:id 가 아니라 전용
 *   /api/sessions/:id/position 엔드포인트(syncSessionUpdateAsync)를 쓴다.
 *   "새 세션 생성 직후 즉시 드래그" 시 POST 응답 전에 PUT /position 이 먼저 도달해
 *   404 를 받으면, GHOST_CLEANUP_GRACE_MS(30s) 가드가 없을 때 방금 만든 세션을
 *   ghost cleanup 이 즉시 localStorage 에서 삭제하던 사고가 있었다(2026-05-04).
 *
 * 기존 apiSync.ghost-cleanup.test.ts 의 race-guard 테스트는 모달 편집 경로인
 * fire-and-forget `syncSessionUpdate`(일반 PUT /api/sessions/:id) 만 다룬다.
 * 드래그 경로(`syncSessionUpdateAsync`, /position)에 대한 create-grace 회귀
 * 가드는 비어 있었다 — 본 spec 이 그 정확한 동작을 잠근다.
 *
 * 판정: passing (코드 정상). cleanupGhostSession 이 두 경로에서 공유되고
 * isWithinCreateGrace 를 검사하므로 드래그 경로도 보호된다. 본 테스트는 그
 * 올바른 동작을 회귀로부터 잠그는 가드.
 *
 * 결정성: 비결정 timing 없음 — vi.useFakeTimers + 명시적 advanceTimersByTimeAsync.
 * waitForTimeout 류 없음(unit). fetch / localStorageCrud / toast 전부 mock.
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

// 고유 데이터 — hardcoded ID 충돌 방지 (test-authoring-guide §3)
const uid = () => `sess-${crypto.randomUUID()}`;

/** create-grace 대상 신규 세션 — id 만 테스트별 고유 */
function makeNewSession(id: string) {
  return {
    id,
    subjectId: "subj-1",
    studentIds: [],
    weekday: 1,
    startsAt: "09:00",
    endsAt: "10:00",
    weekStartDate: "2026-05-04",
    enrollmentIds: [],
    yPosition: 0,
  } as never;
}

/** POST 는 영원히 pending(응답 전), PUT 만 즉시 주어진 status 로 응답 */
function postPendingPutResponds(status: number, ok: boolean) {
  return (_url: string, init?: RequestInit) => {
    if (init?.method === "POST") {
      return new Promise(() => {}); // forever pending — POST 미완료 상태 재현
    }
    return Promise.resolve({
      ok,
      status,
      json: () => Promise.resolve(ok ? {} : { error: "not found" }),
    });
  };
}

describe("apiSync — drag /position create-grace race (drag-position-order)", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    __resetSyncStateForTests();
    deleteSessionFromLocalMock.mockClear();
    vi.mocked(showToast).mockClear();
    mockFetch = vi.fn();
    global.fetch = mockFetch as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.useRealTimers();
    __resetSyncStateForTests();
  });

  describe("drag 경로는 전용 /position 엔드포인트를 쓴다 (일반 PUT 아님)", () => {
    it("syncSessionUpdateAsync 는 PUT /api/sessions/:id/position?userId= 로 발사한다", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });
      const id = uid();

      await syncSessionUpdateAsync("user-1", id, {
        weekday: 3,
        startsAt: "13:00",
        endsAt: "14:00",
        yPosition: 2,
      } as never);

      const [url, init] = mockFetch.mock.calls[0];
      // 전용 위치 엔드포인트 — 일반 /api/sessions/:id partial PUT 아님
      expect(url).toContain(`/api/sessions/${id}/position`);
      expect(url).not.toMatch(new RegExp(`/api/sessions/${id}(\\?|$)`));
      expect(url).toContain("userId=user-1");
      expect(init).toMatchObject({ method: "PUT" });
      // partial body — API 필드명 매핑 (startsAt→time, endsAt→endTime)
      expect(JSON.parse(init.body as string)).toEqual({
        weekday: 3,
        time: "13:00",
        endTime: "14:00",
        yPosition: 2,
      });
    });
  });

  describe("create 직후 드래그 → /position 404 (POST race) — ghost 삭제 보류", () => {
    it("grace 윈도우 내 404 면 deleteSessionFromLocal 미호출 + false 반환 + 토스트 없음", async () => {
      const id = uid();
      // POST 는 pending, 곧바로 드래그한 PUT /position 이 먼저 404 받는 상황 재현
      mockFetch.mockImplementation(postPendingPutResponds(404, false));

      // 1) 새 세션 생성 발사 — markRecentCreate(id) 로 grace 시작
      syncSessionCreate("user-1", makeNewSession(id));
      // 2) POST 응답 전, 같은 세션을 드래그 → /position PUT 이 404
      const ok = await syncSessionUpdateAsync("user-1", id, {
        weekday: 2,
        startsAt: "11:00",
        endsAt: "12:00",
        yPosition: 1,
      } as never);

      // 404 라 sync 는 실패(false)지만, 방금 만든 세션을 localStorage 에서 지우면 안 됨
      expect(ok).toBe(false);
      expect(deleteSessionFromLocalMock).not.toHaveBeenCalled();

      // 디바운스 200ms 경과해도 "서버에 없어 정리됨" 토스트 안 뜸
      await vi.advanceTimersByTimeAsync(250);
      const infoToasts = vi
        .mocked(showToast)
        .mock.calls.filter((c) => c[0] === "info");
      expect(infoToasts.length).toBe(0);
    });

    it("PUT /position 과 POST 둘 다 발사된다 (드래그가 create 를 대체하지 않음)", async () => {
      const id = uid();
      mockFetch.mockImplementation(postPendingPutResponds(404, false));

      syncSessionCreate("user-1", makeNewSession(id));
      await syncSessionUpdateAsync("user-1", id, {
        weekday: 2,
        startsAt: "11:00",
        endsAt: "12:00",
        yPosition: 1,
      } as never);

      const methods = mockFetch.mock.calls.map((c) => c[1]?.method);
      expect(methods).toContain("POST"); // 생성 sync 발사됨
      expect(methods).toContain("PUT"); // 위치 sync 발사됨
      const postCall = mockFetch.mock.calls.find((c) => c[1]?.method === "POST");
      const putCall = mockFetch.mock.calls.find((c) => c[1]?.method === "PUT");
      expect(postCall?.[0]).toContain("/api/sessions?userId=user-1");
      expect(putCall?.[0]).toContain(`/api/sessions/${id}/position`);
    });
  });

  describe("grace 경계 — 30초 만료 후엔 진짜 ghost 로 정상 정리", () => {
    it("create 후 30s+1ms 경과 뒤 동일 id /position 404 → deleteSessionFromLocal 호출", async () => {
      const id = uid();
      mockFetch.mockImplementation(postPendingPutResponds(404, false));

      syncSessionCreate("user-1", makeNewSession(id));
      // grace(30s) 만료
      await vi.advanceTimersByTimeAsync(30_001);

      const ok = await syncSessionUpdateAsync("user-1", id, {
        weekday: 2,
        startsAt: "11:00",
        endsAt: "12:00",
        yPosition: 1,
      } as never);

      expect(ok).toBe(false);
      // grace 만료 → 정상 cleanup (오래된 잔재로 간주)
      expect(deleteSessionFromLocalMock).toHaveBeenCalledWith(id);
    });
  });

  describe("create 와 무관한 세션 — grace 없으면 즉시 정리", () => {
    it("markRecentCreate 안 된 id 의 /position 404 → 즉시 cleanup (grace 미적용)", async () => {
      const ghostId = uid();
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

      const ok = await syncSessionUpdateAsync("user-1", ghostId, {
        weekday: 4,
        startsAt: "15:00",
        endsAt: "16:00",
        yPosition: 0,
      } as never);

      expect(ok).toBe(false);
      expect(deleteSessionFromLocalMock).toHaveBeenCalledWith(ghostId);
    });
  });

  describe("정상 200 응답 — 정리 안 함 (drag sync 성공)", () => {
    it("grace 내 /position 200 → cleanup 미호출 + true 반환", async () => {
      const id = uid();
      mockFetch.mockImplementation(postPendingPutResponds(200, true));

      syncSessionCreate("user-1", makeNewSession(id));
      const ok = await syncSessionUpdateAsync("user-1", id, {
        weekday: 2,
        startsAt: "11:00",
        endsAt: "12:00",
        yPosition: 1,
      } as never);

      expect(ok).toBe(true);
      expect(deleteSessionFromLocalMock).not.toHaveBeenCalled();
    });
  });
});
