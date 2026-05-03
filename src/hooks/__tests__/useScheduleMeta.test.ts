import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useScheduleMeta } from "../useScheduleMeta";

const USER_ID = "user-1";
const KEY = `class_planner_${USER_ID}_lastViewedAt_schedule`;

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
    const { result } = renderHook(() => useScheduleMeta(null));
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

    const { result } = renderHook(() => useScheduleMeta(USER_ID));

    await waitFor(() => {
      expect(result.current.scheduleUpdatedAt).toBe("2020-01-01T00:00:00Z");
    });
    expect(result.current.hasChanges).toBe(false);
    expect(window.localStorage.getItem(KEY)).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/academies/active/schedule-meta?userId=${USER_ID}`,
    );
  });

  it("lastViewedAt보다 새로운 timestamp가 오면 hasChanges=true", async () => {
    // 초기 useEffect에서 lastViewedKey가 비어있으면 now로 채우는 코드를 우회
    // 하기 위해 미리 과거 시각으로 채워둠.
    window.localStorage.setItem(KEY, "2026-05-03T00:00:00Z");
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ scheduleUpdatedAt: "2026-05-04T10:00:00Z" }),
    );

    const { result } = renderHook(() => useScheduleMeta(USER_ID));

    // 초기 fetch 완료까지 대기 — 그 시점에 hasChanges가 계산됨
    await waitFor(() => {
      expect(result.current.scheduleUpdatedAt).toBe("2026-05-04T10:00:00Z");
    });
    expect(result.current.hasChanges).toBe(true);
  });

  it("acknowledgeChanges — hasChanges=false + lastViewedAt 갱신", async () => {
    window.localStorage.setItem(KEY, "2026-05-03T00:00:00Z");
    fetchMock.mockResolvedValue(
      jsonResponse({ scheduleUpdatedAt: "2026-05-04T10:00:00Z" }),
    );

    const { result } = renderHook(() => useScheduleMeta(USER_ID));

    await waitFor(() => {
      expect(result.current.scheduleUpdatedAt).toBe("2026-05-04T10:00:00Z");
    });
    expect(result.current.hasChanges).toBe(true);

    act(() => {
      result.current.acknowledgeChanges();
    });

    expect(result.current.hasChanges).toBe(false);
    const stored = window.localStorage.getItem(KEY);
    expect(stored).not.toBe("2026-05-03T00:00:00Z");
  });

  it("fetch 실패 — 에러 무시 + scheduleUpdatedAt 유지", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: "fail" }, false));

    const { result } = renderHook(() => useScheduleMeta(USER_ID));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.scheduleUpdatedAt).toBeNull();
  });

  it("scheduleUpdatedAt이 null 응답 — hasChanges는 false 유지", async () => {
    window.localStorage.setItem(KEY, "2026-05-03T00:00:00Z");
    fetchMock.mockResolvedValueOnce(jsonResponse({ scheduleUpdatedAt: null }));

    const { result } = renderHook(() => useScheduleMeta(USER_ID));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.hasChanges).toBe(false);
  });
});
