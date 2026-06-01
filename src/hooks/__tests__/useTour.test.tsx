import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTour } from "../useTour";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    session: { user: { id: "test-user" } },
    user: { id: "test-user" },
    loading: false,
  }),
}));

vi.mock("@/hooks/useMyRole", () => ({
  useMyRole: () => ({
    role: "owner",
    canManage: true,
    isLoading: false,
    academies: [],
    linkedTeacherId: null,
    adminCount: 0,
  }),
}));

// tour-persistence-cross-device — DB SSOT 호출 mock.
// fetchTourState default: 빈 상태 (DB 에도 안 본 user). upsertTourCompletion default: success.
const mockFetchTourState = vi.fn().mockResolvedValue({ coreAt: null, loginAt: null });
const mockUpsertTourCompletion = vi.fn().mockResolvedValue(true);
vi.mock("@/lib/tour/tourPersistence", () => ({
  fetchTourState: (...args: unknown[]) => mockFetchTourState(...args),
  upsertTourCompletion: (...args: unknown[]) => mockUpsertTourCompletion(...args),
}));

// features.ts isVisible mock — 튜토리얼 게이팅 제어. default 가시(true), 숨김 케이스만 false.
const { mockIsVisible } = vi.hoisted(() => ({
  mockIsVisible: vi.fn((_key: string) => true),
}));
vi.mock("@/config/features", () => ({
  isVisible: (key: string) => mockIsVisible(key),
}));

// DB fetch (mocked Promise) 의 microtask flush — fakeTimers 환경에서 dbSyncDone 갱신 후 자동 시작 effect 가 재실행되도록.
async function flushDbSync() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

const FLAG_KEY = "onboarding_completed_test-user";
const localStorageMock = window.localStorage as unknown as {
  getItem: ReturnType<typeof vi.fn>;
  setItem: ReturnType<typeof vi.fn>;
};

describe("useTour", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockIsVisible.mockReturnValue(true);
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockClear();
    mockFetchTourState.mockResolvedValue({ coreAt: null, loginAt: null });
    mockUpsertTourCompletion.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts inactive initially", () => {
    const { result } = renderHook(() => useTour());
    expect(result.current.isActive).toBe(false);
    expect(result.current.currentStep).toBe(0);
    expect(result.current.totalSteps).toBeGreaterThan(0);
  });

  it("auto-starts after delay when localStorage flag is absent", async () => {
    const { result } = renderHook(() => useTour());
    expect(result.current.isActive).toBe(false);
    await flushDbSync();
    await act(async () => {
      vi.advanceTimersByTime(1100);
    });
    expect(result.current.isActive).toBe(true);
  });

  it("튜토리얼이 숨김(features.ts tutorial off)이면 자동 시작 안 함", async () => {
    mockIsVisible.mockReturnValue(false);
    const { result } = renderHook(() => useTour());
    await flushDbSync();
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.isActive).toBe(false);
  });

  it("does NOT auto-start when localStorage flag is present", async () => {
    localStorageMock.getItem.mockReturnValue("2026-01-01T00:00:00.000Z");
    const { result } = renderHook(() => useTour());
    await flushDbSync();
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.isActive).toBe(false);
  });

  it("starts immediately on window event dispatch (force start ignores flag)", () => {
    localStorageMock.getItem.mockReturnValue("2026-01-01");
    const { result } = renderHook(() => useTour());
    expect(result.current.isActive).toBe(false);
    act(() => {
      window.dispatchEvent(new CustomEvent("class-planner:start-tour"));
    });
    expect(result.current.isActive).toBe(true);
    expect(result.current.currentStep).toBe(0);
  });

  it("start() activates the tour from the first step", () => {
    const { result } = renderHook(() => useTour());
    act(() => result.current.start());
    expect(result.current.isActive).toBe(true);
    expect(result.current.currentStep).toBe(0);
  });

  it("next() advances currentStep", () => {
    const { result } = renderHook(() => useTour());
    act(() => result.current.start());
    expect(result.current.currentStep).toBe(0);
    act(() => result.current.next());
    expect(result.current.currentStep).toBe(1);
  });

  it("prev() decreases currentStep but not below 0", () => {
    const { result } = renderHook(() => useTour());
    act(() => result.current.start());
    act(() => result.current.next());
    act(() => result.current.prev());
    expect(result.current.currentStep).toBe(0);
    act(() => result.current.prev());
    expect(result.current.currentStep).toBe(0);
  });

  it("skip() completes tour and sets localStorage flag", () => {
    const { result } = renderHook(() => useTour());
    act(() => result.current.start());
    act(() => result.current.skip());
    expect(result.current.isActive).toBe(false);
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      FLAG_KEY,
      expect.any(String),
    );
  });

  it("complete() resets state and persists flag", () => {
    const { result } = renderHook(() => useTour());
    act(() => result.current.start());
    act(() => result.current.next());
    act(() => result.current.complete());
    expect(result.current.isActive).toBe(false);
    expect(result.current.currentStep).toBe(0);
    expect(result.current.targetRect).toBeNull();
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      FLAG_KEY,
      expect.any(String),
    );
  });

  it("next() on last step completes the tour", () => {
    const { result } = renderHook(() => useTour());
    act(() => result.current.start());
    const total = result.current.totalSteps;
    for (let i = 0; i < total - 1; i++) {
      act(() => result.current.next());
    }
    expect(result.current.currentStep).toBe(total - 1);
    act(() => result.current.next());
    expect(result.current.isActive).toBe(false);
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });

  it("step returns current TourStep with required fields", () => {
    const { result } = renderHook(() => useTour());
    act(() => result.current.start());
    expect(result.current.step).toBeTruthy();
    expect(result.current.step?.targetSelector).toMatch(/\[data-tour=/);
    expect(result.current.step?.title.length).toBeGreaterThan(0);
    expect(result.current.step?.description.length).toBeGreaterThan(0);
  });

  it("anonymous → user 전환 시 anonymous flag 가 user flag 로 마이그레이션 (자동 시작 X)", () => {
    const ANON_KEY = "onboarding_completed_anonymous";
    const userFlag = `onboarding_completed_test-user`;
    // anonymous flag 만 set, user flag 없는 상태
    (window.localStorage.getItem as ReturnType<typeof vi.fn>).mockImplementation(
      (k: string) => (k === ANON_KEY ? "2026-01-01T00:00:00.000Z" : null),
    );
    renderHook(() => useTour());
    // useEffect 가 mount 시 user flag 도 set
    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      userFlag,
      "2026-01-01T00:00:00.000Z",
    );
  });

  it("DB 에 coreAt/loginAt 있으면 localStorage 채움 (cross-device)", async () => {
    const DB_TIMESTAMP = "2026-01-15T10:00:00.000Z";
    mockFetchTourState.mockResolvedValue({ coreAt: DB_TIMESTAMP, loginAt: DB_TIMESTAMP });
    renderHook(() => useTour());
    await flushDbSync();
    // DB 결과로 localStorage 채워졌는지 검증 — coreFlagKey, loginFlagKey 모두 set 호출
    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      "onboarding_completed_test-user",
      DB_TIMESTAMP,
    );
    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      "onboarding_login_completed_test-user",
      DB_TIMESTAMP,
    );
  });

  it("complete() 호출 시 DB upsert 도 함께 trigger (cross-device 영속화)", async () => {
    const { result } = renderHook(() => useTour());
    await flushDbSync();
    act(() => result.current.start());
    act(() => result.current.complete());
    // mockUpsertTourCompletion 가 호출됐는지 검증 (segment + timestamp)
    expect(mockUpsertTourCompletion).toHaveBeenCalledWith(
      "test-user",
      "core",
      expect.any(String),
    );
  });
});
