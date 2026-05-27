/**
 * updateSessionPosition 의 핵심 logic 만 pure function 으로 추출.
 *
 * 기존: schedule/page.tsx 의 updateSessionPosition (91 줄) 가 duration 계산 + new
 * endTime + reposition + updateData + sync diff 모두 inline.
 *
 * 본 utils: **state mutation / async 안 함**. duration 보존 + reposition + changed
 * sessions diff 까지 pure. updateData / sync / setIsSyncingSession 은 page 호출.
 *
 * 단일 drag drop 의 핵심 path — handleSessionDrop 의 single 분기에서 호출됨.
 *
 * Sub-proposal: schedule-page-split-refactor PR 12 (loop iteration 7, utils 패턴 확장).
 */

import type { Session, Enrollment, Subject } from "@/lib/planner";
import { timeToMinutes, minutesToTime } from "@/lib/planner";
import { repositionSessions as repositionSessionsUtil } from "@/lib/sessionCollisionUtils";

export type SessionPositionUpdateFailureReason = "session-not-found";

export interface SessionPositionUpdatePlan {
  ok: true;
  /** updateData payload — reposition 완료된 sessions */
  mergedSessions: Session[];
  /** 실제 변경된 sessions (original vs new diff) — sync 대상 */
  changedSessions: Session[];
  /** 사용자 drag 의 새 endTime — duration 보존 */
  newEndTime: string;
}

export interface SessionPositionUpdateFailure {
  ok: false;
  reason: SessionPositionUpdateFailureReason;
  sessionId: string;
}

export function planSessionPositionUpdate(params: {
  sessionId: string;
  weekday: number;
  /** drag drop 의 새 startTime — endTime 은 duration 보존으로 계산 */
  time: string;
  yPosition: number;
  sessions: Session[];
  enrollments: Enrollment[];
  subjects: Subject[];
}): SessionPositionUpdatePlan | SessionPositionUpdateFailure {
  const existingSession = params.sessions.find((s) => s.id === params.sessionId);
  if (!existingSession) {
    return {
      ok: false,
      reason: "session-not-found",
      sessionId: params.sessionId,
    };
  }

  // duration 보존 — 새 endTime = 새 startMinutes + durationMinutes.
  const durationMinutes =
    timeToMinutes(existingSession.endsAt) -
    timeToMinutes(existingSession.startsAt);
  const newStartMinutes = timeToMinutes(params.time);
  const newEndTime = minutesToTime(newStartMinutes + durationMinutes);

  // 충돌 방지 reposition.
  const newSessions = repositionSessionsUtil(
    params.sessions,
    params.enrollments,
    params.subjects,
    params.weekday,
    params.time,
    newEndTime,
    params.yPosition,
    params.sessionId,
  );

  // changed sessions diff — original 과 weekday/startsAt/endsAt/yPosition 비교.
  // 단일 drag 라도 collision chain push 로 다른 sessions 가 변경됐을 수 있음.
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
