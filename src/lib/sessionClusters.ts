import type { Session } from "./planner";
import { timeToMinutes } from "./planner";
import { computeRequiredLanes } from "./sessionCollisionUtils";

/**
 * Time-overlap connected component (= "row cluster") in a single weekday.
 *
 * Sessions 가 시간 겹침으로 transitively connected 인 group. row-level overflow
 * expand (`+N` / `-` 버튼) 의 단위. dnd-visual-feedback.md § 7 (effectiveLanes
 * freeze) 와 무관하지만 같은 cluster 정의 사용.
 */
export type SessionCluster = {
  /** stable id within a weekday — cluster 의 startMin. cluster 끼리 시간 겹침 X 이므로 unique. */
  key: string;
  /** cluster 내 sessions 가 시작하는 가장 이른 minute (since midnight). */
  startMin: number;
  /** cluster 내 sessions 가 끝나는 가장 늦은 minute. */
  endMin: number;
  /** cluster 에 속한 sessions (정렬 순서 — startMin asc, endMin desc). */
  sessions: Session[];
  /** cluster 내 sweep-line 으로 계산한 max 동시 lane (≥1). */
  requiredLanes: number;
};

/**
 * Sessions 를 시간 겹침 기반 connected components (= clusters) 로 그룹화.
 *
 * 두 sessions 가 시간 겹침이 있으면 같은 cluster. transitively connected:
 *   A(10:00-11:00) ↔ B(10:30-12:00) ↔ C(11:30-13:00) → A,B,C 한 cluster
 *   (A 와 C 는 직접 겹치지 않아도 B 가 다리 역할).
 *
 * Algorithm: sweep-line (input sessions startMin asc 정렬 후 진행 중 cluster
 * endMin 추적, 다음 session startMin < endMin 이면 같은 cluster, 아니면 새 cluster).
 *
 * @param sessions 같은 weekday 내 sessions (다른 weekday 섞이지 않은 input).
 * @returns startMin asc 정렬된 cluster 배열. 빈 input → [].
 */
export function computeRowClusters(sessions: Session[]): SessionCluster[] {
  if (sessions.length === 0) return [];

  const sorted = [...sessions].sort((a, b) => {
    const ax = timeToMinutes(a.startsAt);
    const bx = timeToMinutes(b.startsAt);
    if (ax !== bx) return ax - bx;
    return timeToMinutes(b.endsAt) - timeToMinutes(a.endsAt);
  });

  const clusters: SessionCluster[] = [];
  let current: { startMin: number; endMin: number; sessions: Session[] } | null = null;

  const flush = () => {
    if (!current) return;
    clusters.push({
      key: `${current.startMin}`,
      startMin: current.startMin,
      endMin: current.endMin,
      sessions: current.sessions,
      requiredLanes: computeRequiredLanes(current.sessions),
    });
    current = null;
  };

  for (const s of sorted) {
    const sStart = timeToMinutes(s.startsAt);
    const sEnd = timeToMinutes(s.endsAt);
    if (current && sStart < current.endMin) {
      current.sessions.push(s);
      if (sEnd > current.endMin) current.endMin = sEnd;
    } else {
      flush();
      current = { startMin: sStart, endMin: sEnd, sessions: [s] };
    }
  }
  flush();

  return clusters;
}
