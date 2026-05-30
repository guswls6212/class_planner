/**
 * handleSessionCopy 의 logic 만 pure function 으로 추출.
 *
 * 기존: schedule/page.tsx 의 handleSessionCopy 가 165 줄 — bulk(multi-select 복사)
 * + single(단일 복사) 2 분기. 안 closure 가 sessions/enrollments/subjects/selectedDate
 * /sessionSelection/canManage 모두 잡고 updateData/addSession/syncEnrollmentCreate/
 * syncSessionCreate/showToast/setGridVersion/clear 모두 호출.
 *
 * 본 utils: **state mutation 안 함**. orderedMoves 계산 + newSessions/newEnrollments
 * 생성 + mergedSessions reposition chain push 까지 순수 계산. side-effect (updateData,
 * sync*, toast) 는 page 가 결과 객체 받고 호출.
 *
 * Discriminated union return — `ok: true | false` 로 page 가 분기. failure 시
 * `reason` 으로 토스트/로그 분기 결정.
 *
 * Sub-proposal: schedule-page-split-refactor PR 4+ (loop iteration 1, utils 패턴 확장).
 */

import type { Session, Enrollment, Subject } from "@/lib/planner";
import { timeToMinutes, minutesToTime } from "@/lib/planner";
import { repositionSessions as repositionSessionsUtil } from "@/lib/sessionCollisionUtils";
import { getWeekStartDate } from "@/lib/weekStart";
import {
  computeBulkMoveTargets,
  type BulkMoveTarget,
} from "./computeBulkMoveTargets";

// ============================================================================
// Bulk copy — multi-select 묶음 복사
// ============================================================================

export type BulkSessionCopyFailureReason = "no-permission";

export interface BulkSessionCopyPlan {
  ok: true;
  /** updateData payload — sessions 필드 (reposition chain 완료) */
  mergedSessions: Session[];
  /** updateData payload — enrollments 필드 (newEnrollments append 된 경우만 사용) */
  mergedEnrollments: Enrollment[];
  /** sync 호출 대상 — 새로 만들어진 sessions */
  newSessions: Session[];
  /** sync 호출 대상 — 새로 만들어진 enrollments (existing reuse 시 빈 배열) */
  newEnrollments: Enrollment[];
  /** 토스트 메시지에 쓰일 복사된 session 수 */
  copiedCount: number;
  /** 시간 범위(자정) 초과로 건너뛴 session 수 */
  outOfRange: number;
}

export interface BulkSessionCopyFailure {
  ok: false;
  reason: BulkSessionCopyFailureReason;
}

export function planBulkSessionCopy(params: {
  canManage: boolean;
  sessions: Session[];
  enrollments: Enrollment[];
  subjects: Subject[];
  anchorSessionId: string;
  newWeekday: number;
  newTime: string;
  newYPosition: number;
  selectedSessionIds: string[];
  selectedDate: Date;
}): BulkSessionCopyPlan | BulkSessionCopyFailure {
  if (!params.canManage) return { ok: false, reason: "no-permission" };

  const bulkMove = computeBulkMoveTargets({
    sessions: params.sessions,
    anchorSessionId: params.anchorSessionId,
    newWeekday: params.newWeekday,
    newTime: params.newTime,
    newYPosition: params.newYPosition,
    selectedIds: params.selectedSessionIds,
  });
  const { moves, outOfRange } = bulkMove;

  // sequential reposition 호출 순서 결정성 (2026-05-15, adr/014 참조):
  // anchor 먼저 + 추종 yPos asc — anchor 가 자기 lane 점유 후 추종이 contiguous
  // yPos 로 chain push 안정.
  const anchorMove = moves.find((m) => m.session.id === params.anchorSessionId);
  const followerMoves = moves
    .filter((m) => m.session.id !== params.anchorSessionId)
    .sort((a, b) => a.yPosition - b.yPosition);
  const orderedMoves: BulkMoveTarget[] = [
    anchorMove,
    ...followerMoves,
  ].filter((m): m is BulkMoveTarget => Boolean(m));

  const newSessions: Session[] = [];
  const newEnrollments: Enrollment[] = [];
  const weekStart = getWeekStartDate(params.selectedDate);

  for (const move of orderedMoves) {
    if (!move.session.subjectId) continue;
    const studentIds = (move.session.enrollmentIds ?? [])
      .map((eid) => params.enrollments.find((e) => e.id === eid)?.studentId)
      .filter((sid): sid is string => Boolean(sid));

    // 각 student 마다 enrollment 보장 — 기존 enrollment 우선, 없으면 신규 생성
    const enrollmentIds: string[] = [];
    for (const studentId of studentIds) {
      const existing = params.enrollments.find(
        (e) =>
          e.studentId === studentId && e.subjectId === move.session.subjectId,
      );
      if (existing) {
        enrollmentIds.push(existing.id);
      } else {
        const ne: Enrollment = {
          id: crypto.randomUUID(),
          studentId,
          subjectId: move.session.subjectId,
        };
        newEnrollments.push(ne);
        enrollmentIds.push(ne.id);
      }
    }

    const newSession: Session = {
      id: crypto.randomUUID(),
      subjectId: move.session.subjectId,
      ...(move.session.teacherId && { teacherId: move.session.teacherId }),
      weekday: move.weekday,
      startsAt: move.startsAt,
      endsAt: move.endsAt,
      weekStartDate: weekStart,
      room: move.session.room ?? "",
      enrollmentIds,
      yPosition: move.yPosition,
    };
    newSessions.push(newSession);
  }

  // ⚠️ Bug fix (2026-05-04): 이전엔 새 sessions 를 append 만 했음. 같은 (weekday, time)
  // 충돌 시 yPosition 시각적 stack overlap. 각 새 session 에 대해 sequential reposition
  // — 같은 시간 충돌 시 다음 빈 lane 으로 자동 배치.
  const mergedEnrollments =
    newEnrollments.length > 0
      ? [...params.enrollments, ...newEnrollments]
      : params.enrollments;
  let mergedSessions: Session[] = [...params.sessions, ...newSessions];
  for (const ns of newSessions) {
    mergedSessions = repositionSessionsUtil(
      mergedSessions,
      mergedEnrollments,
      params.subjects,
      ns.weekday,
      ns.startsAt,
      ns.endsAt,
      ns.yPosition ?? 1,
      ns.id,
    );
  }

  return {
    ok: true,
    mergedSessions,
    mergedEnrollments,
    newSessions,
    newEnrollments,
    copiedCount: newSessions.length,
    outOfRange,
  };
}

// ============================================================================
// Single copy — 단일 session 복사 (addSession payload 만 계산)
// ============================================================================

export type SingleSessionCopyFailureReason =
  | "no-permission"
  | "session-not-found"
  | "missing-subject";

export interface SingleSessionCopyAddPayload {
  subjectId: string;
  studentIds: string[];
  teacherId: string | undefined;
  weekday: number;
  startTime: string;
  endTime: string;
  yPosition: number;
  room: string | undefined;
}

export interface SingleSessionCopyPlan {
  ok: true;
  payload: SingleSessionCopyAddPayload;
}

export interface SingleSessionCopyFailure {
  ok: false;
  reason: SingleSessionCopyFailureReason;
  /** logger.warn 에 쓰일 원본 sessionId */
  sessionId: string;
}

export function planSingleSessionCopy(params: {
  canManage: boolean;
  sessions: Session[];
  enrollments: Enrollment[];
  sessionId: string;
  newWeekday: number;
  newTime: string;
  newYPosition: number;
}): SingleSessionCopyPlan | SingleSessionCopyFailure {
  if (!params.canManage) {
    return { ok: false, reason: "no-permission", sessionId: params.sessionId };
  }

  const original = params.sessions.find((s) => s.id === params.sessionId);
  if (!original) {
    return {
      ok: false,
      reason: "session-not-found",
      sessionId: params.sessionId,
    };
  }
  if (!original.subjectId) {
    return {
      ok: false,
      reason: "missing-subject",
      sessionId: params.sessionId,
    };
  }

  // 원본 enrollmentIds → studentIds (addSession 이 enrollment 생성 책임).
  const studentIds = (original.enrollmentIds ?? [])
    .map((eid) => params.enrollments.find((e) => e.id === eid)?.studentId)
    .filter((sid): sid is string => Boolean(sid));

  // 시간 길이 보존
  const durationMin =
    timeToMinutes(original.endsAt) - timeToMinutes(original.startsAt);
  const endTime = minutesToTime(timeToMinutes(params.newTime) + durationMin);

  return {
    ok: true,
    payload: {
      subjectId: original.subjectId,
      studentIds,
      teacherId: original.teacherId ?? undefined,
      weekday: params.newWeekday,
      startTime: params.newTime,
      endTime,
      yPosition: params.newYPosition,
      room: original.room,
    },
  };
}
