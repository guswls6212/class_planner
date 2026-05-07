import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  computeAutoRange,
  readStoredRange,
  resolveTimeRange,
  timeRangeStorageKey,
  writeStoredRange,
  DEFAULT_TIME_RANGE,
} from "../useTimeRange";
import type { Session } from "../../lib/planner";

// setupTests.ts replaces localStorage with empty vi.fn() mocks. Wire them to an
// in-memory store so writeStoredRange + readStoredRange can roundtrip in tests.
let mockStorage: Record<string, string> = {};

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
  vi.mocked(localStorage.clear).mockImplementation(() => {
    mockStorage = {};
  });
});

function makeSession(startsAt: string, endsAt: string): Session {
  return {
    id: `s-${startsAt}-${endsAt}`,
    weekday: 0,
    startsAt,
    endsAt,
    enrollmentIds: [],
  } as unknown as Session;
}

describe("computeAutoRange", () => {
  it("0개 sessions → 9-18 fallback", () => {
    expect(computeAutoRange([])).toEqual({
      startHour: 9,
      endHour: 18,
      mode: "auto",
    });
  });

  it("min/max ± 1h padding", () => {
    const sessions = [makeSession("10:00", "11:00"), makeSession("14:00", "15:30")];
    expect(computeAutoRange(sessions)).toEqual({
      startHour: 9,
      endHour: 17,
      mode: "auto",
    });
  });

  it("0시 이전으로 padding 안 내려감 (clamp 0)", () => {
    const sessions = [makeSession("00:00", "01:00")];
    expect(computeAutoRange(sessions).startHour).toBe(0);
  });

  it("24시 이후로 padding 안 올라감 (clamp 24)", () => {
    const sessions = [makeSession("22:00", "23:30")];
    expect(computeAutoRange(sessions).endHour).toBe(24);
  });

  it("end가 30분 단위면 ceil 후 +1h", () => {
    const sessions = [makeSession("10:00", "10:30")];
    // min=10, max=10.5 → ceil=11, +1 = 12
    expect(computeAutoRange(sessions).endHour).toBe(12);
  });

  it("invalid time string은 fallback", () => {
    const sessions = [makeSession("invalid", "also-invalid")];
    expect(computeAutoRange(sessions)).toEqual({
      startHour: 9,
      endHour: 18,
      mode: "auto",
    });
  });
});

describe("resolveTimeRange", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("storage 미설정 + query 없음 → default 9-23 (BC)", () => {
    expect(
      resolveTimeRange({ queryValue: null, sessions: [], stored: readStoredRange(null) }),
    ).toEqual(DEFAULT_TIME_RANGE);
  });

  it("query ?range=auto → auto computed", () => {
    const sessions = [makeSession("10:00", "11:00")];
    expect(
      resolveTimeRange({ queryValue: "auto", sessions, stored: null }),
    ).toEqual({ startHour: 9, endHour: 12, mode: "auto" });
  });

  it("query ?range=7-22 → custom", () => {
    expect(
      resolveTimeRange({ queryValue: "7-22", sessions: [], stored: null }),
    ).toEqual({ startHour: 7, endHour: 22, mode: "custom" });
  });

  it("query ?range=default → default", () => {
    expect(
      resolveTimeRange({ queryValue: "default", sessions: [], stored: null }),
    ).toEqual(DEFAULT_TIME_RANGE);
  });

  it("query 잘못된 format → storage/default fallback", () => {
    expect(
      resolveTimeRange({ queryValue: "garbage", sessions: [], stored: null }),
    ).toEqual(DEFAULT_TIME_RANGE);
  });

  it("query start >= end → storage/default fallback", () => {
    expect(
      resolveTimeRange({ queryValue: "20-10", sessions: [], stored: null }),
    ).toEqual(DEFAULT_TIME_RANGE);
  });

  it("storage custom → 적용", () => {
    writeStoredRange("user-x", { mode: "custom", startHour: 7, endHour: 22 });
    expect(
      resolveTimeRange({
        queryValue: null,
        sessions: [],
        stored: readStoredRange("user-x"),
      }),
    ).toEqual({ startHour: 7, endHour: 22, mode: "custom" });
  });

  it("storage auto → 데이터 기반 계산", () => {
    writeStoredRange("user-y", { mode: "auto" });
    const sessions = [makeSession("13:00", "16:30")];
    expect(
      resolveTimeRange({
        queryValue: null,
        sessions,
        stored: readStoredRange("user-y"),
      }),
    ).toEqual({ startHour: 12, endHour: 18, mode: "auto" });
  });

  it("storage default → 9-23", () => {
    writeStoredRange("user-z", { mode: "default" });
    expect(
      resolveTimeRange({
        queryValue: null,
        sessions: [],
        stored: readStoredRange("user-z"),
      }),
    ).toEqual(DEFAULT_TIME_RANGE);
  });

  it("storage custom 잘못된 값 (start >= end) → default fallback", () => {
    writeStoredRange("user-bad", { mode: "custom", startHour: 20, endHour: 10 });
    expect(
      resolveTimeRange({
        queryValue: null,
        sessions: [],
        stored: readStoredRange("user-bad"),
      }),
    ).toEqual(DEFAULT_TIME_RANGE);
  });

  it("query가 storage보다 우선", () => {
    writeStoredRange("user-q", { mode: "custom", startHour: 7, endHour: 22 });
    expect(
      resolveTimeRange({
        queryValue: "10-15",
        sessions: [],
        stored: readStoredRange("user-q"),
      }),
    ).toEqual({ startHour: 10, endHour: 15, mode: "custom" });
  });

  it("anonymous (userId=null) storage key 사용", () => {
    writeStoredRange(null, { mode: "custom", startHour: 8, endHour: 21 });
    expect(
      resolveTimeRange({ queryValue: null, sessions: [], stored: readStoredRange(null) }),
    ).toEqual({ startHour: 8, endHour: 21, mode: "custom" });
  });
});

describe("timeRangeStorageKey", () => {
  it("userId 있을 때 _userId_ 포함", () => {
    expect(timeRangeStorageKey("u-1")).toBe("class_planner_u-1_time_range");
  });

  it("userId null이면 anonymous", () => {
    expect(timeRangeStorageKey(null)).toBe(
      "class_planner_anonymous_time_range",
    );
  });
});
