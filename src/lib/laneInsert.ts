import type { Session } from "./planner";
import { isTimeOverlapping } from "./sessionCollisionUtils";

/**
 * 명시적 lane insertion — 사용자가 lane N 과 lane N+1 "사이" 의 gap droppable 에
 * drop 했을 때 사용. `repositionSessions` 의 collision-based reposition 과 달리
 * 같은 시간대 lane ≥ insertBeforeYPos 세션을 단순히 +1 shift, movingSession 을
 * 그 빈 lane 에 배치 — 사용자 의도가 "이 위치에 끼우기" 임을 명시적으로 따른다.
 *
 * Variant E (Edge Hover Slot) UI 와 짝지어진 알고리즘. omni-radar 2026-05-13
 * lane stack 사고 이후 도입.
 *
 * 다른 요일에서 옮겨오는 경우 sourceWeekday 의 yPosition 1부터 재압축 (compact).
 */
export function insertSessionAtLane(
  sessions: Session[],
  targetWeekday: number,
  targetStartTime: string,
  targetEndTime: string,
  insertBeforeYPos: number,
  movingSessionId: string,
): Session[] {
  const moving = sessions.find((s) => s.id === movingSessionId);
  if (!moving) return sessions;

  const sourceWeekday = moving.weekday;
  const isCrossWeekday = sourceWeekday !== targetWeekday;

  // 1) 같은 요일·같은 시간 겹침 lane ≥ insertBeforeYPos 세션 → yPosition +1 shift.
  //    movingSession 자체는 제외 (어차피 step 2 에서 yPosition 재할당).
  const shifted = sessions.map((s) => {
    if (s.id === movingSessionId) return s;
    if (
      s.weekday === targetWeekday &&
      (s.yPosition ?? 1) >= insertBeforeYPos &&
      isTimeOverlapping(s.startsAt, s.endsAt, targetStartTime, targetEndTime)
    ) {
      return { ...s, yPosition: (s.yPosition ?? 1) + 1 };
    }
    return s;
  });

  // 2) movingSession 의 weekday/startsAt/endsAt/yPosition 갱신.
  const placed = shifted.map((s) =>
    s.id === movingSessionId
      ? {
          ...s,
          weekday: targetWeekday,
          startsAt: targetStartTime,
          endsAt: targetEndTime,
          yPosition: insertBeforeYPos,
        }
      : s,
  );

  // 3) Cross-weekday 이동 시 source 요일 yPosition 압축 (movingSession 빠진 후
  //    빈 lane 제거). 같은 요일 이동은 step 1 의 shift 만으로 충분.
  if (!isCrossWeekday) return placed;

  const sourceDay = placed.filter(
    (s) => s.weekday === sourceWeekday && s.id !== movingSessionId,
  );
  const sortedY = Array.from(
    new Set(sourceDay.map((s) => s.yPosition ?? 1)),
  ).sort((a, b) => a - b);
  const yPosMap = new Map<number, number>();
  sortedY.forEach((oldY, i) => yPosMap.set(oldY, i + 1));

  return placed.map((s) =>
    s.weekday === sourceWeekday && s.id !== movingSessionId
      ? { ...s, yPosition: yPosMap.get(s.yPosition ?? 1) ?? 1 }
      : s,
  );
}
