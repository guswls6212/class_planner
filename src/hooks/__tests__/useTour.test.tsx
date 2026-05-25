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

const FLAG_KEY = "onboarding_completed_test-user";
const localStorageMock = window.localStorage as unknown as {
  getItem: ReturnType<typeof vi.fn>;
  setItem: ReturnType<typeof vi.fn>;
};

describe("useTour", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockClear();
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

  it("auto-starts after delay when localStorage flag is absent", () => {
    const { result } = renderHook(() => useTour());
    expect(result.current.isActive).toBe(false);
    act(() => {
      vi.advanceTimersByTime(1100);
    });
    expect(result.current.isActive).toBe(true);
  });

  it("does NOT auto-start when localStorage flag is present", () => {
    localStorageMock.getItem.mockReturnValue("2026-01-01T00:00:00.000Z");
    const { result } = renderHook(() => useTour());
    act(() => {
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
});
