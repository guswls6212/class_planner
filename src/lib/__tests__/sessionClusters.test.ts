import { describe, expect, it } from "vitest";
import { computeRowClusters } from "../sessionClusters";
import type { Session } from "../planner";

const make = (id: string, startsAt: string, endsAt: string, yPosition = 1): Session =>
  ({
    id,
    weekday: 0,
    startsAt,
    endsAt,
    yPosition,
    enrollmentIds: [],
    weekStartDate: "2026-05-15",
  }) as Session;

describe("computeRowClusters", () => {
  it("빈 input → 빈 배열", () => {
    expect(computeRowClusters([])).toEqual([]);
  });

  it("1 session → 1 cluster (requiredLanes=1)", () => {
    const clusters = computeRowClusters([make("a", "10:00", "11:00")]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]).toMatchObject({
      key: "600", // 10:00 = 600 min
      startMin: 600,
      endMin: 660,
      requiredLanes: 1,
    });
    expect(clusters[0].sessions.map((s) => s.id)).toEqual(["a"]);
  });

  it("같은 시간 5 sessions → 1 cluster (requiredLanes=5)", () => {
    const clusters = computeRowClusters([
      make("a", "10:00", "11:00", 1),
      make("b", "10:00", "11:00", 2),
      make("c", "10:00", "11:00", 3),
      make("d", "10:00", "11:00", 4),
      make("e", "10:00", "11:00", 5),
    ]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].requiredLanes).toBe(5);
    expect(clusters[0].sessions).toHaveLength(5);
  });

  it("시간 안 겹침 3 sessions → 3 cluster", () => {
    const clusters = computeRowClusters([
      make("a", "10:00", "11:00"),
      make("b", "12:00", "13:00"),
      make("c", "15:00", "16:00"),
    ]);
    expect(clusters).toHaveLength(3);
    expect(clusters.map((c) => c.startMin)).toEqual([600, 720, 900]);
  });

  it("부분 겹침 A↔B → 1 cluster", () => {
    const clusters = computeRowClusters([
      make("a", "10:00", "11:00"),
      make("b", "10:30", "11:30"),
    ]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]).toMatchObject({ startMin: 600, endMin: 690 });
  });

  it("transitive 겹침 A↔B↔C (A 와 C 는 직접 안 겹침) → 1 cluster", () => {
    // A 10:00-11:00, B 10:30-12:00, C 11:30-13:00. A↔B (10:30~11:00), B↔C (11:30~12:00).
    // A 와 C 는 직접 안 겹침 (11:00 ≤ 11:30). 그러나 B 가 다리.
    const clusters = computeRowClusters([
      make("a", "10:00", "11:00"),
      make("b", "10:30", "12:00"),
      make("c", "11:30", "13:00"),
    ]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]).toMatchObject({ startMin: 600, endMin: 780 });
    expect(clusters[0].sessions).toHaveLength(3);
  });

  it("연속 배치 (앞 session 의 end == 뒤 session 의 start) → 2 cluster (시간 겹침 strict)", () => {
    // 10:00-11:00 과 11:00-12:00 — 같은 시각 종료/시작. computeRequiredLanes 의 정렬 규칙
    // (종료-1 먼저) 와 일관: 같은 lane 공유 가능 = 시간 겹침 없음 = 다른 cluster.
    const clusters = computeRowClusters([
      make("a", "10:00", "11:00"),
      make("b", "11:00", "12:00"),
    ]);
    expect(clusters).toHaveLength(2);
  });

  it("두 cluster 사이 + 각 cluster 내 동시 lane 검증", () => {
    // Cluster 1: 10:00-11:00 lane 1, 10:00-11:00 lane 2 → requiredLanes=2
    // Cluster 2: 14:00-15:00 lane 1 → requiredLanes=1
    const clusters = computeRowClusters([
      make("a", "10:00", "11:00", 1),
      make("b", "10:00", "11:00", 2),
      make("c", "14:00", "15:00", 1),
    ]);
    expect(clusters).toHaveLength(2);
    expect(clusters[0]).toMatchObject({ requiredLanes: 2, startMin: 600 });
    expect(clusters[1]).toMatchObject({ requiredLanes: 1, startMin: 840 });
  });

  it("cluster key 는 startMin string — 같은 weekday 내 unique", () => {
    const clusters = computeRowClusters([
      make("a", "10:00", "11:00"),
      make("b", "12:00", "13:00"),
    ]);
    const keys = clusters.map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length); // unique
    expect(keys).toEqual(["600", "720"]);
  });
});
