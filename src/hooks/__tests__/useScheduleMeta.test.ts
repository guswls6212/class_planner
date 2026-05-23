import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useScheduleMeta } from "../useScheduleMeta";

const USER_ID = "user-1";
const ACADEMY_ID = "acad-1";
const KEY = `class_planner_${USER_ID}_${ACADEMY_ID}_lastViewedAt_schedule`;

const fetchMock = vi.fn();
const originalFetch = global.fetch;
// setupTests.ts가 localStorage를 vi.fn() 더미로 모킹하므로 hook이 정상 동작하도록
// 이 파일에서만 인메모리 store로 재정의
const lsStore = new Map<string, string>();
const lsGet = vi
  .spyOn(window.localStorage, "getItem")
  .mockImplementation((k: string) => lsStore.get(k) ?? null);
const lsSet = vi
  .spyOn(window.localStorage, "setItem")
  .mockImplementation((k: string, v: string) => {
    lsStore.set(k, v);
  });
const lsRemove = vi
  .spyOn(window.localStorage, "removeItem")
  .mockImplementation((k: string) => {
    lsStore.delete(k);
  });

beforeEach(() => {
  vi.clearAllMocks();
  fetchMock.mockReset();
  lsStore.clear();
  // spy 위에 깔린 mockImplementation은 clearAllMocks로 지워지지 않지만
  // 호출 카운트는 리셋 — 안전하게 다시 set
  lsGet.mockImplementation((k: string) => lsStore.get(k) ?? null);
  lsSet.mockImplementation((k: string, v: string) => {
    lsStore.set(k, v);
  });
  lsRemove.mockImplementation((k: string) => {
    lsStore.delete(k);
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  Object.defineProperty(document, "visibilityState", {
    value: "visible",
    configurable: true,
  });
});

afterEach(() => {
  global.fetch = originalFetch;
});

function jsonResponse(payload: unknown, ok = true) {
  return {
    ok,
    json: async () => payload,
  } as unknown as Response;
}

describe("useScheduleMeta", () => {
  it("userId=null 이면 idle 상태 (fetch 호출 안 함)", () => {
    const { result } = renderHook(() => useScheduleMeta(null, ACADEMY_ID));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.scheduleUpdatedAt).toBeNull();
    expect(result.current.hasChanges).toBe(false);
  });

  it("academyId=null 이면 idle 상태 (active_academy 미설정 보호)", () => {
    const { result } = renderHook(() => useScheduleMeta(USER_ID, null));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.scheduleUpdatedAt).toBeNull();
    expect(result.current.hasChanges).toBe(false);
  });

  it("초기 fetch — scheduleUpdatedAt 설정 + lastViewedAt 신규 초기화 (hasChanges=false)", async () => {
    // next는 명시적으로 과거: useEffect가 lastViewed=now로 초기화한 후 fetchMeta가
    // next < lastViewed로 판단해 hasChanges=false가 되어야 한다.
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ scheduleUpdatedAt: "2020-01-01T00:00:00Z" }),
    );

    const { result } = renderHook(() => useScheduleMeta(USER_ID, ACADEMY_ID));

    await waitFor(() => {
      expect(result.current.scheduleUpdatedAt).toBe("2020-01-01T00:00:00Z");
    });
    expect(result.current.hasChanges).toBe(false);
    expect(window.localStorage.getItem(KEY)).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/academies/active/schedule-meta?userId=${USER_ID}&academyId=${ACADEMY_ID}`,
    );
  });

  it("lastViewedAt보다 새로운 timestamp가 오면 hasChanges=true", async () => {
    // 초기 useEffect에서 lastViewedKey가 비어있으면 now로 채우는 코드를 우회
    // 하기 위해 미리 과거 시각으로 채워둠.
    // 24h stale auto-ack을 피하기 위해 24h 안의 시각 사용 (1시간 차)
    window.localStorage.setItem(KEY, "2026-05-04T09:00:00Z");
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ scheduleUpdatedAt: "2026-05-04T10:00:00Z" }),
    );

    const { result } = renderHook(() => useScheduleMeta(USER_ID, ACADEMY_ID));

    // 초기 fetch 완료까지 대기 — 그 시점에 hasChanges가 계산됨
    await waitFor(() => {
      expect(result.current.scheduleUpdatedAt).toBe("2026-05-04T10:00:00Z");
    });
    expect(result.current.hasChanges).toBe(true);
  });

  it("acknowledgeChanges — hasChanges=false + lastViewedAt 갱신", async () => {
    // 24h stale auto-ack을 피하기 위해 24h 안의 시각 사용
    window.localStorage.setItem(KEY, "2026-05-04T09:00:00Z");
    fetchMock.mockResolvedValue(
      jsonResponse({ scheduleUpdatedAt: "2026-05-04T10:00:00Z" }),
    );

    const { result } = renderHook(() => useScheduleMeta(USER_ID, ACADEMY_ID));

    await waitFor(() => {
      expect(result.current.scheduleUpdatedAt).toBe("2026-05-04T10:00:00Z");
    });
    expect(result.current.hasChanges).toBe(true);

    act(() => {
      result.current.acknowledgeChanges();
    });

    expect(result.current.hasChanges).toBe(false);
    const stored = window.localStorage.getItem(KEY);
    expect(stored).not.toBe("2026-05-04T09:00:00Z");
  });

  it("fetch 실패 — 에러 무시 + scheduleUpdatedAt 유지", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: "fail" }, false));

    const { result } = renderHook(() => useScheduleMeta(USER_ID, ACADEMY_ID));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.scheduleUpdatedAt).toBeNull();
  });

  it("scheduleUpdatedAt이 null 응답 — hasChanges는 false 유지", async () => {
    window.localStorage.setItem(KEY, "2026-05-03T00:00:00Z");
    fetchMock.mockResolvedValueOnce(jsonResponse({ scheduleUpdatedAt: null }));

    const { result } = renderHook(() => useScheduleMeta(USER_ID, ACADEMY_ID));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.hasChanges).toBe(false);
  });

  describe("self-sync 윈도우 — 본인 변경 자동 감지 (2026-05-04 회귀 가드)", () => {
    it("server timestamp가 본인 sync 직후(<10s)이면 hasChanges=false 유지 + lastViewedAt 자동 갱신", async () => {
      // 사용자 본인이 sync 발사 → apiSync.onSyncSuccess가 selfSync 이벤트 dispatch.
      // Polling fetch가 그 직후 server timestamp를 받으면 본인 변경으로 판단.
      window.localStorage.setItem(KEY, "2026-05-03T00:00:00Z");
      // 본인 sync 시점을 현재로 시뮬레이션 — server timestamp도 거의 같은 시각
      const nowIso = new Date().toISOString();
      fetchMock.mockResolvedValueOnce(jsonResponse({ scheduleUpdatedAt: nowIso }));

      // selfSync 이벤트 발사 시뮬레이션
      const apiSync = await import("../../lib/apiSync");
      const { syncStudentCreate } = apiSync;
      const { result } = renderHook(() => useScheduleMeta(USER_ID, ACADEMY_ID));
      // hook mount 직후 selfSync 이벤트 발사
      const mockFetchOk = vi.fn().mockResolvedValue(jsonResponse({}));
      const prevFetch = global.fetch;
      global.fetch = mockFetchOk as unknown as typeof fetch;
      syncStudentCreate(USER_ID, { id: "stu-1", name: "A" } as any);
      // microtask flush
      await new Promise((r) => setTimeout(r, 50));
      global.fetch = fetchMock as unknown as typeof fetch;
      // 첫 polling fetch 결과 대기 (mount 직후 자동 fetch)
      await waitFor(() => {
        expect(result.current.scheduleUpdatedAt).toBe(nowIso);
      });
      // 본인 변경 자동 감지 — hasChanges는 false 유지
      expect(result.current.hasChanges).toBe(false);
      // lastViewedAt이 server timestamp로 자동 갱신
      expect(window.localStorage.getItem(KEY)).toBe(nowIso);
    });

    it("self-sync 이벤트가 없는 상태(다른 사람 변경)에서는 정상 hasChanges=true", async () => {
      // 24h stale auto-ack 회피 — 24h 안의 시각 사용 (1시간 차)
      window.localStorage.setItem(KEY, "2026-05-04T09:00:00Z");
      fetchMock.mockResolvedValueOnce(
        jsonResponse({ scheduleUpdatedAt: "2026-05-04T10:00:00Z" }),
      );

      const { result } = renderHook(() => useScheduleMeta(USER_ID, ACADEMY_ID));

      await waitFor(() => {
        expect(result.current.scheduleUpdatedAt).toBe("2026-05-04T10:00:00Z");
      });
      // self-sync 이벤트 발사 안 했으니 정상 알림
      expect(result.current.hasChanges).toBe(true);
    });
  });

  describe("Stale auto-ack (24h+) 및 cross-tab self-sync 공유 — 사용자 보고 회귀 가드", () => {
    it("lastViewedAt이 25시간 전 + server timestamp 새 → 24h stale로 자동 ack (hasChanges=false)", async () => {
      // 사용자 보고 시나리오: 어제 본인이 변경했고 오늘 페이지 새로 진입.
      // self-sync ref는 0(reload로 초기화)이지만 server는 어제 시각을 그대로 갖고 있음.
      // 24h 이상 차이라 stale로 판단 → 자동 ack → 토스트 안 뜸.
      const lastViewed = new Date(
        Date.now() - 25 * 60 * 60 * 1000,
      ).toISOString();
      const serverNew = new Date().toISOString();
      window.localStorage.setItem(KEY, lastViewed);
      fetchMock.mockResolvedValueOnce(
        jsonResponse({ scheduleUpdatedAt: serverNew }),
      );

      const { result } = renderHook(() => useScheduleMeta(USER_ID, ACADEMY_ID));

      await waitFor(() => {
        expect(result.current.scheduleUpdatedAt).toBe(serverNew);
      });
      // 24h auto-ack 발화 → hasChanges 그대로 false
      expect(result.current.hasChanges).toBe(false);
      // lastViewedAt이 server timestamp로 자동 갱신
      expect(window.localStorage.getItem(KEY)).toBe(serverNew);
    });

    it("localStorage SELF_SYNC_STORAGE_KEY가 mount 시 fallback으로 ref 복구", async () => {
      // 사용자 보고 시나리오 변형: 페이지 reload 직후, 이전 세션의 self-sync 시각이
      // localStorage에 남아있음. mount fallback으로 ref가 복구되어 윈도우 안 잡힘.
      const recentSelfSync = Date.now() - 2_000; // 2초 전
      const serverTs = new Date(recentSelfSync).toISOString();
      window.localStorage.setItem(
        "class_planner_last_self_sync",
        String(recentSelfSync),
      );
      window.localStorage.setItem(KEY, "2026-05-04T09:00:00Z");
      fetchMock.mockResolvedValueOnce(
        jsonResponse({ scheduleUpdatedAt: serverTs }),
      );

      const { result } = renderHook(() => useScheduleMeta(USER_ID, ACADEMY_ID));

      await waitFor(() => {
        expect(result.current.scheduleUpdatedAt).toBe(serverTs);
      });
      // self-sync window 안 → 자동 ack → hasChanges false
      expect(result.current.hasChanges).toBe(false);
    });
  });

  describe("joined_at 자동 ack — 박관리자 invite accept 케이스 (2026-05-23 회귀 가드)", () => {
    it("schedule_updated_at <= memberJoinedAt 이면 자동 ack (hasChanges=false 유지)", async () => {
      // 사용자 보고 시나리오: 박관리자가 UAT Test Academy 에 admin 으로 invite accept
      //   joined_at = 2026-05-23 13:58:44
      //   schedule_updated_at = 2026-05-23 13:57:49 (가입 55초 전 owner 변경)
      // 가입 이전의 변경은 새 멤버에게 알릴 가치 없음 — 자동 ack.
      // 다른 academy 에서 set 된 stale lastViewed 가 잔존해도 무관.
      window.localStorage.setItem(KEY, "2026-05-23T12:57:10.930Z"); // 다른 academy 잔존 시뮬
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          scheduleUpdatedAt: "2026-05-23T13:57:49.709Z",
          memberJoinedAt: "2026-05-23T13:58:44.719Z",
        }),
      );

      const { result } = renderHook(() => useScheduleMeta(USER_ID, ACADEMY_ID));

      await waitFor(() => {
        expect(result.current.scheduleUpdatedAt).toBe(
          "2026-05-23T13:57:49.709Z",
        );
      });
      // 자동 ack → 토스트 안 뜸
      expect(result.current.hasChanges).toBe(false);
      // lastViewedAt 이 server schedule_updated_at 으로 갱신
      expect(window.localStorage.getItem(KEY)).toBe("2026-05-23T13:57:49.709Z");
    });

    it("schedule_updated_at > memberJoinedAt 이면 정상 비교 (hasChanges=true)", async () => {
      // 가입 후 다른 admin 이 schedule 변경한 정상 시나리오 — 알림 유지.
      window.localStorage.setItem(KEY, "2026-05-23T14:00:00.000Z");
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          scheduleUpdatedAt: "2026-05-23T14:05:00.000Z",
          memberJoinedAt: "2026-05-23T13:58:44.000Z",
        }),
      );

      const { result } = renderHook(() => useScheduleMeta(USER_ID, ACADEMY_ID));

      await waitFor(() => {
        expect(result.current.scheduleUpdatedAt).toBe(
          "2026-05-23T14:05:00.000Z",
        );
      });
      // joined_at(13:58) 이후 변경(14:05) → 정상 알림
      expect(result.current.hasChanges).toBe(true);
    });

    it("memberJoinedAt=null 이면 (a) (a') (b) 기존 분기로 동작 (회귀 가드)", async () => {
      // legacy server / RLS 우회 케이스 — memberJoinedAt 누락 시 hook 이 옛 분기로 fallback
      window.localStorage.setItem(KEY, "2026-05-04T09:00:00Z");
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          scheduleUpdatedAt: "2026-05-04T10:00:00Z",
          memberJoinedAt: null,
        }),
      );

      const { result } = renderHook(() => useScheduleMeta(USER_ID, ACADEMY_ID));

      await waitFor(() => {
        expect(result.current.scheduleUpdatedAt).toBe("2026-05-04T10:00:00Z");
      });
      expect(result.current.hasChanges).toBe(true);
    });
  });

  describe("academy 별 lastViewedKey 분리 — multi-academy 회귀 가드 (2026-05-23)", () => {
    it("다른 academy 의 lastViewed 가 비교 baseline 으로 쓰이지 않음", async () => {
      // 사용자 보고 root cause: 박관리자가 academy A 에서 lastViewed set 했다가
      // academy B (UAT Test Academy) 첫 진입 시 A 의 stale lastViewed 로 비교돼
      // false-positive 토스트.
      const ACADEMY_B = "acad-2";
      const KEY_A = `class_planner_${USER_ID}_${ACADEMY_ID}_lastViewedAt_schedule`;
      const KEY_B = `class_planner_${USER_ID}_${ACADEMY_B}_lastViewedAt_schedule`;

      // academy A 의 stale lastViewed
      window.localStorage.setItem(KEY_A, "2026-05-23T12:57:10Z");

      // academy B 의 schedule_updated_at — A 의 lastViewed 보다 새로움
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          scheduleUpdatedAt: "2026-05-23T13:57:49Z",
          memberJoinedAt: null, // joined_at ack 분기 우회 — 본 테스트는 키 분리만 검증
        }),
      );

      const { result } = renderHook(() => useScheduleMeta(USER_ID, ACADEMY_B));

      await waitFor(() => {
        expect(result.current.scheduleUpdatedAt).toBe("2026-05-23T13:57:49Z");
      });
      // academy B 의 lastViewed 키는 비어있었으므로 (a') 첫 진입 분기로 set
      expect(result.current.hasChanges).toBe(false);
      expect(window.localStorage.getItem(KEY_B)).toBe("2026-05-23T13:57:49Z");
      // academy A 의 lastViewed 는 그대로 유지 — 분리됨
      expect(window.localStorage.getItem(KEY_A)).toBe("2026-05-23T12:57:10Z");
    });

    it("academy 전환 시 hasChanges/ackedTimestamp 가 reset 됨", async () => {
      // academy A 에서 hasChanges=true 상태였다가 academy B 로 전환하면
      // ack ref 초기화 + 새 academy 의 schedule 비교 흐름 시작.
      const ACADEMY_B = "acad-2";
      // academy A 첫 fetch — hasChanges=true 만들기
      window.localStorage.setItem(
        `class_planner_${USER_ID}_${ACADEMY_ID}_lastViewedAt_schedule`,
        "2026-05-23T13:00:00Z",
      );
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          scheduleUpdatedAt: "2026-05-23T13:30:00Z",
          memberJoinedAt: "2026-05-22T00:00:00Z",
        }),
      );

      const { result, rerender } = renderHook(
        ({ academyId }: { academyId: string }) =>
          useScheduleMeta(USER_ID, academyId),
        { initialProps: { academyId: ACADEMY_ID } },
      );
      await waitFor(() => {
        expect(result.current.hasChanges).toBe(true);
      });

      // academy B 전환 — 새 academy 는 첫 진입이라 (a') 분기로 ack
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          scheduleUpdatedAt: "2026-05-23T14:00:00Z",
          memberJoinedAt: null,
        }),
      );
      rerender({ academyId: ACADEMY_B });

      await waitFor(() => {
        expect(result.current.scheduleUpdatedAt).toBe("2026-05-23T14:00:00Z");
      });
      // hasChanges 가 academy 전환 시 reset 됨
      expect(result.current.hasChanges).toBe(false);
    });
  });
});
