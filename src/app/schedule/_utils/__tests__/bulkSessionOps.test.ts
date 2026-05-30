import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  bulkDeleteSessionsFromLocal,
  reassignLanesByWeekday,
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
  // pendingDeletes 모듈이 module-init 시점에 호출 — mock 누락 시 CI fail.
  getStorageKey: () => "classPlannerData:test",
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

// ── Lane reflow tests (사용자 보고 2026-05-11) ─────────────────────────────
const makeSessionLane = (
  id: string,
  weekday: number,
  yPosition: number,
  startsAt: string,
  endsAt: string,
): Session =>
  ({
    id,
    weekday,
    yPosition,
    startsAt,
    endsAt,
    enrollmentIds: [],
    weekStartDate: "2026-05-04",
  }) as Session;

describe("reassignLanesByWeekday", () => {
  it("lane 1,3,4 (gap at 2) → 1,2,3 압축", () => {
    const sessions = [
      makeSessionLane("a", 0, 1, "12:00", "13:00"),
      makeSessionLane("b", 0, 3, "12:00", "13:00"),
      makeSessionLane("c", 0, 4, "12:00", "13:00"),
    ];
    const { sessions: result, reflowed } = reassignLanesByWeekday(
      sessions,
      new Set([0]),
    );
    const byId = new Map(result.map((s) => [s.id, s]));
    expect(byId.get("a")?.yPosition).toBe(1);
    expect(byId.get("b")?.yPosition).toBe(2);
    expect(byId.get("c")?.yPosition).toBe(3);
    expect(reflowed.map((s) => s.id).sort()).toEqual(["b", "c"]);
  });

  it("시간 overlap 없으면 lane 1로 압축", () => {
    const sessions = [
      makeSessionLane("a", 0, 3, "09:00", "10:00"),
      makeSessionLane("b", 0, 4, "11:00", "12:00"),
    ];
    const { sessions: result, reflowed } = reassignLanesByWeekday(
      sessions,
      new Set([0]),
    );
    const byId = new Map(result.map((s) => [s.id, s]));
    // 두 세션 시간 overlap 없음 → 둘 다 lane 1
    expect(byId.get("a")?.yPosition).toBe(1);
    expect(byId.get("b")?.yPosition).toBe(1);
    expect(reflowed.length).toBe(2);
  });

  it("영향 안 받은 weekday 세션은 그대로", () => {
    const sessions = [
      makeSessionLane("a", 0, 3, "12:00", "13:00"),
      makeSessionLane("b", 1, 3, "12:00", "13:00"), // weekday 1 — affected에 없음
    ];
    const { sessions: result, reflowed } = reassignLanesByWeekday(
      sessions,
      new Set([0]),
    );
    const byId = new Map(result.map((s) => [s.id, s]));
    expect(byId.get("a")?.yPosition).toBe(1); // reflow
    expect(byId.get("b")?.yPosition).toBe(3); // 그대로
    expect(reflowed.map((s) => s.id)).toEqual(["a"]);
  });

  it("affectedWeekdays 빈 set — no-op", () => {
    const sessions = [makeSessionLane("a", 0, 3, "12:00", "13:00")];
    const { sessions: result, reflowed } = reassignLanesByWeekday(
      sessions,
      new Set(),
    );
    expect(result).toBe(sessions); // 동일 reference
    expect(reflowed).toEqual([]);
  });

  it("기존 yPosition 우선순위 존중 — 작은 값이 먼저 lane 할당", () => {
    // yPosition asc로 정렬 → b(yPosition=1)가 먼저 lane 1, a(yPosition=2)가 lane 2
    const sessions = [
      makeSessionLane("a", 0, 2, "12:00", "13:00"),
      makeSessionLane("b", 0, 1, "12:00", "13:00"),
    ];
    const { sessions: result } = reassignLanesByWeekday(sessions, new Set([0]));
    const byId = new Map(result.map((s) => [s.id, s]));
    expect(byId.get("b")?.yPosition).toBe(1);
    expect(byId.get("a")?.yPosition).toBe(2);
  });
});

describe("bulkDeleteSessionsFromLocal — lane reflow integration", () => {
  it("4개 lane 중 가운데 3개 삭제 → 남은 1개 lane 1로 압축 (사용자 시나리오)", () => {
    mockData.sessions = [
      makeSessionLane("s1", 0, 1, "12:00", "13:00"),
      makeSessionLane("s2", 0, 2, "12:00", "13:00"),
      makeSessionLane("s3", 0, 3, "12:00", "13:00"),
      makeSessionLane("s4", 0, 4, "12:00", "13:00"),
    ];
    const result = bulkDeleteSessionsFromLocal(["s1", "s2", "s4"]);
    expect(result.deleted.map((s) => s.id).sort()).toEqual(["s1", "s2", "s4"]);
    expect(mockData.sessions.length).toBe(1);
    expect(mockData.sessions[0].id).toBe("s3");
    // s3는 lane 3 → lane 1로 압축됨
    expect(mockData.sessions[0].yPosition).toBe(1);
    expect(result.reflowed.map((s) => s.id)).toEqual(["s3"]);
  });

  it("삭제로 lane 빔 없으면 reflow 0 (lane 1 → lane 1)", () => {
    mockData.sessions = [
      makeSessionLane("s1", 0, 1, "12:00", "13:00"),
      makeSessionLane("s2", 0, 2, "12:00", "13:00"),
    ];
    const result = bulkDeleteSessionsFromLocal(["s2"]);
    // s1은 이미 lane 1 → 변경 없음
    expect(result.reflowed).toEqual([]);
    expect(mockData.sessions[0].yPosition).toBe(1);
  });

  it("다른 weekday session은 reflow 영향 안 받음", () => {
    mockData.sessions = [
      makeSessionLane("s1", 0, 1, "12:00", "13:00"),
      makeSessionLane("s2", 0, 2, "12:00", "13:00"),
      makeSessionLane("s3", 1, 3, "12:00", "13:00"), // weekday 1
    ];
    const result = bulkDeleteSessionsFromLocal(["s1"]);
    // weekday 0만 영향 → s2가 lane 2 → lane 1로 압축
    // s3 (weekday 1)는 그대로 lane 3
    const byId = new Map(mockData.sessions.map((s) => [s.id, s]));
    expect(byId.get("s2")?.yPosition).toBe(1);
    expect(byId.get("s3")?.yPosition).toBe(3);
    expect(result.reflowed.map((s) => s.id)).toEqual(["s2"]);
  });
});
