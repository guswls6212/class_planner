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

  it("p3 저장 시 localStorage 키 'p3'", () => {
    setScheduleLayoutPreference("p3");
    expect(localStorage.getItem(STORAGE_KEY)).toBe("p3");
  });

  it("default 저장 시 localStorage 키 제거 (BC)", () => {
    localStorage.setItem(STORAGE_KEY, "p3");
    setScheduleLayoutPreference("default");
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("연속 호출 idempotent", () => {
    setScheduleLayoutPreference("p3");
    setScheduleLayoutPreference("p3");
    expect(localStorage.getItem(STORAGE_KEY)).toBe("p3");
  });
});
