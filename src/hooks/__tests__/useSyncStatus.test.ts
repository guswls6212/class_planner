import { renderHook, act, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSyncStatus } from "../useSyncStatus";
import { __resetSyncStateForTests, syncStudentCreate } from "@/lib/apiSync";

vi.mock("@/lib/toast", () => ({
  showToast: vi.fn(),
}));

// retry 타이머가 테스트 종료 후에 fire하면 stale fetch closure에 부딪혀 crash.
// 모든 테스트에서 fetch는 mockable, 기본값은 ok=true (retry 시 무해).
const safeMockFetch = vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({}),
});

beforeEach(() => {
  __resetSyncStateForTests();
  safeMockFetch.mockReset();
  safeMockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
  global.fetch = safeMockFetch as unknown as typeof fetch;
});

afterEach(() => {
  __resetSyncStateForTests();
});

describe("useSyncStatus", () => {
  it("기본 상태는 idle", () => {
    const { result } = renderHook(() => useSyncStatus());
    expect(result.current).toBe("idle");
  });

  it("실패 시 'failed_retrying'으로 전환된다", async () => {
    // 첫 호출만 실패, 이후 retry는 success로 돌아가도록.
    safeMockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: "fail" }),
    });

    const { result } = renderHook(() => useSyncStatus());
    expect(result.current).toBe("idle");

    await act(async () => {
      syncStudentCreate("user-1", { name: "test" });
      await new Promise((r) => setTimeout(r, 0));
    });

    await waitFor(() => {
      expect(result.current).toBe("failed_retrying");
    });
  });
});
