import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  bulkDeleteSessionsFromLocal,
  restoreBulkDeletedSessions,
} from "../bulkSessionOps";
import type { Session } from "@/lib/planner";

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

const mockData = {
  students: [],
  subjects: [],
  sessions: [] as Session[],
  enrollments: [],
  teachers: [],
  templates: [],
  version: "1.0",
  lastModified: "",
};

vi.mock("@/lib/localStorageCrud", () => ({
  getClassPlannerData: () =>
    JSON.parse(JSON.stringify(mockData)) as typeof mockData,
  setClassPlannerData: (next: typeof mockData) => {
    mockData.sessions = next.sessions;
    mockData.lastModified = next.lastModified;
    return true;
  },
}));

const makeSession = (id: string, weekday = 0): Session =>
  ({
    id,
    weekday,
    startsAt: "09:00",
    endsAt: "10:00",
    enrollmentIds: [],
    weekStartDate: "2026-05-04",
  }) as Session;

beforeEach(() => {
  mockData.sessions = [
    makeSession("s1"),
    makeSession("s2"),
    makeSession("s3"),
  ];
  mockData.lastModified = "";
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("bulkDeleteSessionsFromLocal", () => {
  it("요청한 ids만 제거 + deleted 반환", () => {
    const result = bulkDeleteSessionsFromLocal(["s1", "s3"]);
    expect(result.deleted.map((s) => s.id)).toEqual(["s1", "s3"]);
    expect(result.notFound).toEqual([]);
    expect(mockData.sessions.map((s) => s.id)).toEqual(["s2"]);
  });

  it("존재하지 않는 id는 notFound로 분류", () => {
    const result = bulkDeleteSessionsFromLocal(["s1", "missing"]);
    expect(result.deleted.map((s) => s.id)).toEqual(["s1"]);
    expect(result.notFound).toEqual(["missing"]);
  });

  it("빈 입력 — empty 반환", () => {
    const result = bulkDeleteSessionsFromLocal([]);
    expect(result.deleted).toEqual([]);
    expect(result.notFound).toEqual([]);
    expect(mockData.sessions.length).toBe(3);
  });

  it("lastModified 갱신", () => {
    const before = mockData.lastModified;
    bulkDeleteSessionsFromLocal(["s1"]);
    expect(mockData.lastModified).not.toBe(before);
  });
});

describe("restoreBulkDeletedSessions", () => {
  it("제거된 sessions 복원", () => {
    const removed = bulkDeleteSessionsFromLocal(["s1", "s2"]);
    expect(mockData.sessions.length).toBe(1);
    restoreBulkDeletedSessions(removed.deleted);
    expect(mockData.sessions.length).toBe(3);
  });

  it("이미 같은 id 있으면 건너뜀 (sync race 방지)", () => {
    const removed = bulkDeleteSessionsFromLocal(["s1"]);
    // 외부에서 s1 다시 추가 (race 시뮬레이션)
    mockData.sessions.push(makeSession("s1"));
    restoreBulkDeletedSessions(removed.deleted);
    expect(mockData.sessions.filter((s) => s.id === "s1").length).toBe(1);
  });

  it("빈 입력 — 변경 없음", () => {
    const before = mockData.sessions.length;
    restoreBulkDeletedSessions([]);
    expect(mockData.sessions.length).toBe(before);
  });
});
