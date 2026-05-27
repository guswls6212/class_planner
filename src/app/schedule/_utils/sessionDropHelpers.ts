/**
 * handleSessionDrop 의 bulk 분기 logic 만 pure function 으로 추출.
 *
 * 기존: schedule/page.tsx 의 handleSessionDrop (90+ 줄) 중 multi-select bulk move
 * 분기. computeBulkMoveTargets → applyBulkMoves → sequential reposition 까지 inline.
 *
 * 본 utils: **state mutation / async 안 함**. updatedSessions (reposition chain 완료)
 * + moves (sync 용) + outOfRange / movedCount 반환. updateData / syncSessionUpdateAsync
 * / showToast / setGridVersion / clear 는 page 안 유지.
 *
 * 단일 drop 은 기존 `_handleSessionDropBase` (dndHelpers 의 buildHandleSessionDrop)
 * 유지 — 이미 추출되어 있음.
 *
 * Sub-proposal: schedule-page-split-refactor PR 8 (loop iteration 3, utils 패턴 확장).
 */

import type { Session, Enrollment, Subject } from "@/lib/planner";
import { repositionSessions as repositionSessionsUtil } from "@/lib/sessionCollisionUtils";
import {
  computeBulkMoveTargets,
  applyBulkMoves,
  type BulkMoveTarget,
} from "./computeBulkMoveTargets";

export type BulkSessionDropFailureReason = "no-permission";

export interface BulkSessionDropPlan {
  ok: true;
  /** updateData payload — reposition chain 완료된 sessions */
  updatedSessions: Session[];
  /** 서버 sync 용 moves — 각 session id 의 새 position 정보 */
  moves: BulkMoveTarget[];
  /** 토스트 메시지에 쓰일 이동된 session 수 (= moves.length) */
  movedCount: number;
  /** 시간 범위(자정 이전) 초과로 건너뛴 session 수 */
  outOfRange: number;
}

export interface BulkSessionDropFailure {
  ok: false;
  reason: BulkSessionDropFailureReason;
}

export function planBulkSessionDrop(params: {
  canManage: boolean;
  sessions: Session[];
  enrollments: Enrollment[];
  subjects: Subject[];
  anchorSessionId: string;
  newWeekday: number;
  newTime: string;
  newYPosition: number;
  selectedSessionIds: string[];
}): BulkSessionDropPlan | BulkSessionDropFailure {
  if (!params.canManage) return { ok: false, reason: "no-permission" };

  const { moves, outOfRange } = computeBulkMoveTargets({
    sessions: params.sessions,
    anchorSessionId: params.anchorSessionId,
    newWeekday: params.newWeekday,
    newTime: params.newTime,
    newYPosition: params.newYPosition,
    selectedIds: params.selectedSessionIds,
  });

  // ⚠️ Bug fix (2026-05-04): 이전엔 _handleSessionDropBase 를 N번 await 없이
  // 호출하여 모든 호출이 같은 stale `sessions` snapshot 을 closure 로 잡고
  // 각자 updateData(자신의 newSessions) 를 호출 → React state race 로 마지막
  // 호출만 반영. 해결: moves 를 단일 batch 로 sessions 에 적용한 뒤 updateData 1회.
  let updatedSessions = applyBulkMoves(params.sessions, moves);

  // ⚠️ Bug fix (2026-05-04 보강): batch 적용만 하고 충돌 재배치 안 호출 시 같은 (weekday, time)
  // 시각적 stack overlap. 단일 drop 은 updateSessionPosition 안에서 reposition 하지만
  // bulk batch 는 별도 처리. 각 move 적용 후 sequential reposition.
  //
  // sequential reposition 순서 결정성 (2026-05-15, adr/014):
  // anchor 먼저 + 추종 yPos asc — anchor 가 자기 lane 점유 후 추종이 contiguous yPos.
  const anchorMove = moves.find(
    (m) => m.session.id === params.anchorSessionId,
  );
  const followerMoves = moves
    .filter((m) => m.session.id !== params.anchorSessionId)
    .sort((a, b) => a.yPosition - b.yPosition);
  const orderedMoves: BulkMoveTarget[] = [
    anchorMove,
    ...followerMoves,
  ].filter((m): m is BulkMoveTarget => Boolean(m));

  for (const move of orderedMoves) {
    updatedSessions = repositionSessionsUtil(
      updatedSessions,
      params.enrollments,
      params.subjects,
      move.weekday,
      move.startsAt,
      move.endsAt,
      move.yPosition,
      move.session.id,
    );
  }

  return {
    ok: true,
    updatedSessions,
    moves,
    movedCount: moves.length,
    outOfRange,
  };
}
