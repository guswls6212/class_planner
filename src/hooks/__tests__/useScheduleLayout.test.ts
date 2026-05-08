import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { setScheduleLayoutPreference } from "../useScheduleLayout";

const STORAGE_KEY = "class_planner_schedule_layout";

let mockStorage: Record<string, string> = {};

describe("setScheduleLayoutPreference", () => {
  beforeEach(() => {
    mockStorage = {};
    vi.mocked(localStorage.getItem).mockImplementation(
      (key) => mockStorage[key] ?? null,
    );
    vi.mocked(localStorage.setItem).mockImplementation((key, value) => {
      mockStorage[key] = String(value);
    });
    vi.mocked(localStorage.removeItem).mockImplementation((key) => {
      delete mockStorage[key];
    });
  });

  afterEach(() => {
    mockStorage = {};
  });

  // ADR-010 (2026-05-08): P3가 default로 승격되어 storage 의미 반전됨.
  // 'p3' 저장 = removeItem (default라 저장 불필요), 'default' 저장 = explicit opt-out.

  it("p3 저장 시 localStorage 키 제거 (P3가 default)", () => {
    localStorage.setItem(STORAGE_KEY, "default");
    setScheduleLayoutPreference("p3");
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("default 저장 시 localStorage 키 'default' (explicit opt-out)", () => {
    setScheduleLayoutPreference("default");
    expect(localStorage.getItem(STORAGE_KEY)).toBe("default");
  });

  it("연속 호출 idempotent — p3", () => {
    setScheduleLayoutPreference("p3");
    setScheduleLayoutPreference("p3");
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("연속 호출 idempotent — default", () => {
    setScheduleLayoutPreference("default");
    setScheduleLayoutPreference("default");
    expect(localStorage.getItem(STORAGE_KEY)).toBe("default");
  });

  it("p3 → default toggle: storage 'default'", () => {
    setScheduleLayoutPreference("p3");
    setScheduleLayoutPreference("default");
    expect(localStorage.getItem(STORAGE_KEY)).toBe("default");
  });

  it("default → p3 toggle: storage 제거", () => {
    setScheduleLayoutPreference("default");
    setScheduleLayoutPreference("p3");
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
