/**
 * insertSessionBeforeLane 의 핵심 logic 만 pure function 으로 추출.
 *
 * 기존: schedule/page.tsx 의 insertSessionBeforeLane (72 줄) 가 duration 보존 +
 * insertSessionAtLane + updateData + sync diff 모두 inline.
 *
 * 본 utils: **state mutation / async 안 함**. duration 보존 + insert + changed
 * sessions diff 까지 pure. updateData / sync / setGridVersion 은 page 호출.
 *
 * Variant E (Edge Hover Slot) — lane 사이 LaneInsertSlot 에 drop 시 사용자가 명시한
 * lane 삽입. collision-based 의 repositionSessions 와 달리 explicit 삽입.
 *
 * Sub-proposal: schedule-page-split-refactor PR 13 (loop iteration 8, utils 패턴 확장).
 */

import type { Session } from "@/lib/planner";
import { timeToMinutes, minutesToTime } from "@/lib/planner";
import { insertSessionAtLane } from "@/lib/laneInsert";

export type SessionInsertFailureReason = "session-not-found";

export interface SessionInsertPlan {
  ok: true;
  /** updateData payload — insert 완료된 sessions */
  mergedSessions: Session[];
  /** 실제 변경된 sessions (original vs new diff) — sync 대상 */
  changedSessions: Session[];
  /** duration 보존된 새 endTime */
  newEndTime: string;
}

export interface SessionInsertFailure {
  ok: false;
  reason: SessionInsertFailureReason;
  sessionId: string;
}

export function planSessionInsertBeforeLane(params: {
  sessionId: string;
  weekday: number;
  /** drag drop 의 새 startTime — endTime 은 duration 보존 */
  time: string;
  insertBeforeYPos: number;
  sessions: Session[];
}): SessionInsertPlan | SessionInsertFailure {
  const existing = params.sessions.find((s) => s.id === params.sessionId);
  if (!existing) {
    return {
      ok: false,
      reason: "session-not-found",
      sessionId: params.sessionId,
    };
  }

  // duration 보존.
  const durationMinutes =
    timeToMinutes(existing.endsAt) - timeToMinutes(existing.startsAt);
  const newStartMinutes = timeToMinutes(params.time);
  const newEndTime = minutesToTime(newStartMinutes + durationMinutes);

  // 명시적 lane 삽입.
  const newSessions = insertSessionAtLane(
    params.sessions,
    params.weekday,
    params.time,
    newEndTime,
    params.insertBeforeYPos,
    params.sessionId,
  );

  // changed sessions diff — moving session + shift 된 lane 들.
  const originalById = new Map(params.sessions.map((s) => [s.id, s]));
  const changedSessions = newSessions.filter((s) => {
    const original = originalById.get(s.id);
    if (!original) return false;
    return (
      original.weekday !== s.weekday ||
      original.startsAt !== s.startsAt ||
      original.endsAt !== s.endsAt ||
      original.yPosition !== s.yPosition
    );
  });

  return {
    ok: true,
    mergedSessions: newSessions,
    changedSessions,
    newEndTime,
  };
}
