import type { Session } from "./planner";
import { isTimeOverlapping } from "./sessionCollisionUtils";

/**
 * 명시적 lane insertion — 사용자가 lane N 과 lane N+1 "사이" 의 gap droppable 에
 * drop 했을 때 사용. `repositionSessions` 의 collision-based reposition 과 달리
 * 같은 시간대 lane ≥ insertBeforeYPos 세션을 단순히 +1 shift, movingSession 을
 * 그 빈 lane 에 배치 후 target/source 요일 모두 yPosition 압축 — 사용자 의도가
 * "이 위치에 끼우기" 임을 명시적으로 따른다.
 *
 * Variant E (Edge Hover Slot) UI 와 짝지어진 알고리즘. omni-radar 2026-05-13
 * lane stack 사고 이후 도입.
 *
 * compaction (2026-05-14): movingSession 의 sourceYPos 가 빈 자리가 되면 effective
 * lane 수보다 큰 yPos 가 화면 밖으로 사라지는 회귀 발생 (예: lane 3 세션을 lane 6
 * 으로 이동 → lane 3 빈, yPos 6 hidden). target/source 요일 yPosition 을 점유
 * 순서대로 1, 2, 3... 재부여 (같은 yPos 내 원래 배열 순서 보존).
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
  //    movingSession 자체는 제외 (step 2 에서 yPosition 재할당).
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

  // 3) target 요일 yPosition 압축 — 같은 요일 이동도 source 자리 빈 lane 발생.
  const targetCompacted = compactYPositions(placed, targetWeekday);

  // 4) Cross-weekday 이동 시 source 요일도 압축.
  if (!isCrossWeekday) return targetCompacted;
  return compactYPositions(targetCompacted, sourceWeekday);
}

/**
 * 한 요일의 sessions yPosition 을 점유 순서대로 1, 2, 3... 재부여. 빈 lane 제거.
 * 같은 yPosition 내 sessions 는 원래 배열 순서 보존.
 */
function compactYPositions(sessions: Session[], weekday: number): Session[] {
  const sortedYs = Array.from(
    new Set(
      sessions
        .filter((s) => s.weekday === weekday)
        .map((s) => s.yPosition ?? 1),
    ),
  ).sort((a, b) => a - b);
  const yPosMap = new Map<number, number>();
  sortedYs.forEach((oldY, i) => yPosMap.set(oldY, i + 1));
  return sessions.map((s) =>
    s.weekday === weekday
      ? { ...s, yPosition: yPosMap.get(s.yPosition ?? 1) ?? 1 }
      : s,
  );
}
