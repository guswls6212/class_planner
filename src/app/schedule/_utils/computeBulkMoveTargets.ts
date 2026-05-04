/**
 * 다중 선택된 sessions 일괄 이동/복사 시 각 세션의 새 위치(weekday/time/yPosition)
 * 를 계산.
 *
 * anchor session(드래그된 세션)의 새 위치 - 원래 위치 = delta (요일/시간).
 * 모든 selected sessions에 동일 delta 적용. weekday는 0~6 clamp, 시간은 음수
 * 가드(자정 이전).
 *
 * 충돌 검사 정책 (2026-05-04 수정):
 *   ❌ 이전: yPosition 무시한 시간 overlap만 검사 → 같은 시간 다른 lane도 false
 *      positive → 사용자가 "둘 다 충돌로 못 옮김" 토스트 보고. 일반 drop은 lane
 *      자동 재배치하므로 이 검사는 다중 경로에서만 inconsistent 거부 발생.
 *   ✅ 현재: 충돌 검사 제거. 일반 drop과 동일 정책 — lane 자동 재배치 client
 *      layout이 처리. 호출자가 _handleSessionDropBase로 모두 dispatch.
 *      음수 시간(자정 이전)만 outOfRange로 분류.
 */

import type { Session } from "@/lib/planner";
import { timeToMinutes, minutesToTime } from "@/lib/planner";

export interface BulkMoveTarget {
  session: Session;
  weekday: number;
  startsAt: string;
  endsAt: string;
  yPosition: number;
}

export interface BulkMoveResult {
  /** 적용 가능한 이동 대상들 */
  moves: BulkMoveTarget[];
  /** 시간이 자정 이전으로 떨어져 건너뛴 항목 수 */
  outOfRange: number;
}

export function computeBulkMoveTargets(args: {
  sessions: Session[];
  anchorSessionId: string;
  newWeekday: number;
  newTime: string;
  newYPosition: number;
  selectedIds: string[];
}): BulkMoveResult {
  const {
    sessions,
    anchorSessionId,
    newWeekday,
    newTime,
    newYPosition,
    selectedIds,
  } = args;

  const anchor = sessions.find((s) => s.id === anchorSessionId);
  if (!anchor) return { moves: [], outOfRange: 0 };

  const dWeekday = newWeekday - anchor.weekday;
  const dMinutes = timeToMinutes(newTime) - timeToMinutes(anchor.startsAt);
  const selectedSet = new Set(selectedIds);
  const candidates = sessions.filter((s) => selectedSet.has(s.id));

  const moves: BulkMoveTarget[] = [];
  let outOfRange = 0;

  for (const s of candidates) {
    const targetWeekday = Math.max(0, Math.min(6, s.weekday + dWeekday));
    const targetStartMin = timeToMinutes(s.startsAt) + dMinutes;
    const targetEndMin = timeToMinutes(s.endsAt) + dMinutes;

    if (targetStartMin < 0) {
      outOfRange++;
      continue;
    }
    moves.push({
      session: s,
      weekday: targetWeekday,
      startsAt: minutesToTime(targetStartMin),
      endsAt: minutesToTime(targetEndMin),
      yPosition:
        s.id === anchorSessionId ? newYPosition : s.yPosition ?? 1,
    });
  }

  return { moves, outOfRange };
}

/**
 * moves를 sessions 배열에 batch로 적용한 결과를 반환.
 *
 * ⚠️ Bug fix (2026-05-04): 이전엔 schedule/page.tsx에서 N번 sequential하게
 * _handleSessionDropBase / addSession을 호출했지만 각 호출이 같은 stale
 * `sessions` snapshot을 closure로 잡아 React state race로 마지막 update만
 * 살아남았음 (사용자가 "2개 옮긴다고 토스트 떠도 1개만 이동" 보고).
 *
 * 이 함수는 pure — closure 상관없이 단일 패스로 모든 moves를 적용한 새 sessions
 * 배열을 반환. 호출자는 한 번만 updateData(result) 호출.
 */
export function applyBulkMoves(
  sessions: Session[],
  moves: BulkMoveTarget[],
): Session[] {
  if (moves.length === 0) return sessions;
  const moveById = new Map(moves.map((m) => [m.session.id, m] as const));
  return sessions.map((s) => {
    const m = moveById.get(s.id);
    if (!m) return s;
    return {
      ...s,
      weekday: m.weekday,
      startsAt: m.startsAt,
      endsAt: m.endsAt,
      yPosition: m.yPosition,
    };
  });
}
