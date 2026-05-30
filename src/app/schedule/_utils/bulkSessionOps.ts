/**
 * 다중 선택된 sessions에 대한 일괄 작업 유틸리티.
 *
 * 충돌 정책 — 옵션 B (recommended):
 *   충돌 없는 항목만 진행, 충돌 항목은 결과 객체에 분리해 호출자가 토스트로 안내
 *
 * Server sync는 호출자가 책임 (이 유틸은 localStorage SSOT만 다룸).
 */

import type { Session } from "@/lib/planner";
import { timeToMinutes } from "@/lib/planner";
import {
  getClassPlannerData,
  setClassPlannerData,
} from "@/lib/localStorageCrud";
import { logger } from "@/lib/logger";

export interface BulkDeleteResult {
  /** 삭제된 세션 (undo 시 복원용 — 원본 그대로 보관) */
  deleted: Session[];
  /** 찾을 수 없어 건너뛴 id */
  notFound: string[];
  /** Lane reflow로 yPosition이 변경된 sessions — 호출자가 server sync 필요 */
  reflowed: Session[];
}

export interface LaneReassignResult {
  sessions: Session[];
  /** yPosition이 실제로 변경된 sessions */
  reflowed: Session[];
}

/**
 * 영향받은 weekday의 sessions에 대해 yPosition을 1부터 압축 재할당.
 *
 * 알고리즘:
 *   1. 같은 weekday sessions를 (기존 yPosition asc, startsAt asc) 순으로 정렬
 *   2. 각 session에 가장 낮은 free lane (시간 overlap 없는 lane) 할당
 *
 * 효과: 삭제로 생긴 lane 빈 공간 압축 (예: lane 1, 3, 4 → 1, 2, 3).
 * 사용자가 의도한 lane 우선순위(작은 yPosition 우선)는 정렬에서 존중.
 *
 * delete-vs-move 비대칭 회수: computeBulkMoveTargets는 이동 시 lane 자동 재배치를
 * "client layout이 처리" 하지만 delete 후엔 lane 압축이 없어 4개 → 3개 됐을 때
 * yPosition=4 그대로 → effectiveLanes 4 또는 lane 중간 빔 (사용자 보고 2026-05-11).
 */
export function reassignLanesByWeekday(
  sessions: Session[],
  affectedWeekdays: Set<number>,
): LaneReassignResult {
  if (affectedWeekdays.size === 0) {
    return { sessions, reflowed: [] };
  }

  const reflowed: Session[] = [];
  const byWeekday = new Map<number, Session[]>();
  const others: Session[] = [];

  for (const s of sessions) {
    if (affectedWeekdays.has(s.weekday)) {
      const arr = byWeekday.get(s.weekday) ?? [];
      arr.push(s);
      byWeekday.set(s.weekday, arr);
    } else {
      others.push(s);
    }
  }

  const compactedSessions: Session[] = [...others];

  for (const daySessions of byWeekday.values()) {
    const sorted = [...daySessions].sort((a, b) => {
      const dy = (a.yPosition ?? 1) - (b.yPosition ?? 1);
      if (dy !== 0) return dy;
      return timeToMinutes(a.startsAt) - timeToMinutes(b.startsAt);
    });

    // laneEnds[i] = lane i를 점유한 마지막 세션의 종료 분
    const laneEnds: number[] = [];

    for (const s of sorted) {
      const startMin = timeToMinutes(s.startsAt);
      const endMin = timeToMinutes(s.endsAt);

      // 가장 낮은 free lane (laneEnds[i] <= startMin이면 free)
      let lane = 0;
      while (lane < laneEnds.length && laneEnds[lane] > startMin) {
        lane++;
      }
      laneEnds[lane] = endMin;

      const newYPosition = lane + 1;
      if (newYPosition !== (s.yPosition ?? 1)) {
        const updated = { ...s, yPosition: newYPosition };
        compactedSessions.push(updated);
        reflowed.push(updated);
      } else {
        compactedSessions.push(s);
      }
    }
  }

  return { sessions: compactedSessions, reflowed };
}

/**
 * 다중 sessions를 localStorage에서 한꺼번에 제거.
 * 호출자는 결과의 deleted를 5~7s 동안 보관해 undo 시 복원 가능.
 */
export function bulkDeleteSessionsFromLocal(
  ids: string[],
): BulkDeleteResult {
  const data = getClassPlannerData();
  const idSet = new Set(ids);
  const deleted: Session[] = [];
  const notFound: string[] = [];

  for (const id of ids) {
    const found = data.sessions.find((s) => s.id === id);
    if (found) deleted.push(found);
    else notFound.push(id);
  }

  const remaining = data.sessions.filter((s) => !idSet.has(s.id));

  // 영향받은 weekday만 reflow — 삭제로 인해 lane 공간이 생긴 weekday.
  // 예: 같은 시간 lane 1,2,3,4 중 lane 2 삭제 시 lane 3,4가 lane 2,3으로 압축.
  const affectedWeekdays = new Set(deleted.map((s) => s.weekday));
  const { sessions: reflowedSessions, reflowed } = reassignLanesByWeekday(
    remaining,
    affectedWeekdays,
  );

  data.sessions = reflowedSessions;
  data.lastModified = new Date().toISOString();
  setClassPlannerData(data);

  logger.info("bulkDeleteSessionsFromLocal", {
    requested: ids.length,
    deleted: deleted.length,
    notFound: notFound.length,
    reflowed: reflowed.length,
  });

  return { deleted, notFound, reflowed };
}

/**
 * undo — bulkDeleteSessionsFromLocal로 제거한 sessions 복원.
 * 이미 같은 id가 있으면 건너뜀 (서버 sync race 방지).
 *
 * sessions array를 spread로 새 reference 생성 — getClassPlannerData가
 * dataCache memoization(2bad68f)으로 같은 reference를 반환하기 때문에 push로
 * mutate하면 setData(localData) 후 React가 sub-array 변화 인지 못 한다
 * (T8 e2e 회귀 root cause: SessionBlock memo skip → 화면 미갱신).
 */
export function restoreBulkDeletedSessions(deleted: Session[]): void {
  if (deleted.length === 0) return;
  const data = getClassPlannerData();
  const existingIds = new Set(data.sessions.map((s) => s.id));
  const toRestore = deleted.filter((s) => !existingIds.has(s.id));
  if (toRestore.length === 0) return;
  data.sessions = [...data.sessions, ...toRestore];
  data.lastModified = new Date().toISOString();
  setClassPlannerData(data);
  logger.info("restoreBulkDeletedSessions", { restored: toRestore.length });
}
