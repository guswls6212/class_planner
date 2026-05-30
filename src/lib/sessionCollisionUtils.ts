/**
 * sessionCollisionUtils: schedule grid 의 session 시간 충돌 감지 + 우선순위
 * reposition + lane compact 만 담당 (pure algorithm — no I/O, logger.debug only).
 *
 * 의존성:
 *   - planner.timeToMinutes (시간 string → minutes 변환)
 *   - 호출처: schedule/page.tsx drag handler, useScheduleLayout, computeTentativeLayout
 *   - non-goal: localStorage I/O, server sync, UI rendering
 *
 * 결정 history:
 *   - 2026-05-13 (omni-radar): sourceYPos 점유 시 chain redirect → anchor stack 사고.
 *     canRedirectToSourceYPos 가드 도입.
 *   - Variant E (insertBefore preview): drop handler 와 preview 결과 일치 보장 위해
 *     동일 algorithm 을 insertSessionAtLanePreview 에 inline (circular import 회피).
 *   - ADR-002 (2026-05-28): Cohesion Sweep — repositionSessions 안 inline patterns
 *     (buildDaySessionsMap × 2, compactYPositions × 2) 를 internal pure helpers 로 추출.
 *     함수 자체 한 알고리즘 흐름이라 분리 X, helpers 만 응집도 ↑.
 */

import { logger } from "./logger";
import type { Enrollment, Session, Subject } from "./planner";
import { timeToMinutes } from "./planner";

export interface SessionWithPriority extends Session {
  priorityLevel?: number;
}

/**
 * weekday 의 sessions 를 yPosition 별 그룹화한 Map 생성 (priorityLevel: 0 초기화).
 *
 * - excludeId 가 주어지면 그 session 제외 (cross-weekday move 시 source 에서 이동
 *   세션 자체 제거 목적).
 * - yPosition undefined/null 은 1 로 정규화.
 * - 반환 Map 의 sub-array 는 mutable — caller 가 in-place push/filter 가능.
 *
 * repositionSessions 의 target/source weekday 그룹화 두 곳에서 사용.
 */
export function buildDaySessionsMap(
  sessions: Session[],
  weekday: number,
  excludeId?: string,
): Map<number, SessionWithPriority[]> {
  const map = new Map<number, SessionWithPriority[]>();
  sessions
    .filter((s) => s.weekday === weekday && (excludeId == null || s.id !== excludeId))
    .forEach((session) => {
      // `|| 1` preserves original behavior (yPosition=0 → 1; only 1-indexed lanes used in app).
      const yPos = session.yPosition || 1;
      if (!map.has(yPos)) map.set(yPos, []);
      map.get(yPos)!.push({ ...session, priorityLevel: 0 });
    });
  return map;
}

/**
 * yPosition 기준 정렬된 Map 을 1부터 빈 행 제거하며 compact 재배치.
 * priorityLevel 속성은 제거하고 plain Session 배열로 반환.
 *
 * repositionSessions 의 source/target weekday compact 두 곳에서 사용.
 */
export function compactYPositions(
  daySessionsMap: Map<number, SessionWithPriority[]>,
): Session[] {
  const result: Session[] = [];
  const sortedYs = Array.from(daySessionsMap.keys()).sort((a, b) => a - b);
  let compactIdx = 1;
  sortedYs.forEach((yPos) => {
    const list = daySessionsMap.get(yPos) ?? [];
    if (list.length === 0) return;
    list.forEach((session) => {
      const reassigned: SessionWithPriority = {
        ...session,
        yPosition: compactIdx,
      };
      const { priorityLevel: _pl, ...clean } = reassigned;
      result.push(clean as Session);
    });
    compactIdx += 1;
  });
  return result;
}

/**
 * 시간 겹침 검사
 */
export const isTimeOverlapping = (
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean => {
  const start1Minutes = timeToMinutes(start1);
  const end1Minutes = timeToMinutes(end1);
  const start2Minutes = timeToMinutes(start2);
  const end2Minutes = timeToMinutes(end2);

  return start1Minutes < end2Minutes && start2Minutes < end1Minutes;
};

/**
 * 특정 yPosition에서 충돌 확인
 */
export const checkCollisionsAtYPosition = (
  targetDaySessions: Map<number, SessionWithPriority[]>,
  yPosition: number,
  targetStartTime: string,
  targetEndTime: string,
  checkWithPriorityLevel1: boolean = false
): boolean => {
  const sessionsAtYPosition = targetDaySessions.get(yPosition) || [];

  if (checkWithPriorityLevel1) {
    // 우선순위 레벨 1인 세션들과 충돌 확인
    const priorityLevel1Sessions = sessionsAtYPosition.filter(
      (session) => session.priorityLevel === 1
    );

    return priorityLevel1Sessions.some((prioritySession) =>
      sessionsAtYPosition.some(
        (session) =>
          session.priorityLevel === 0 &&
          isTimeOverlapping(
            session.startsAt,
            session.endsAt,
            prioritySession.startsAt,
            prioritySession.endsAt
          )
      )
    );
  } else {
    // 기존 로직: 이동하려는 세션의 시간과 충돌 확인
    return sessionsAtYPosition.some((session) =>
      isTimeOverlapping(
        session.startsAt,
        session.endsAt,
        targetStartTime,
        targetEndTime
      )
    );
  }
};

/**
 * 우선순위 기반 충돌 해결 로직 (develop 브랜치 원본)
 */
export const repositionSessions = (
  sessions: Session[],
  enrollments: Enrollment[],
  subjects: Subject[],
  targetWeekday: number,
  targetStartTime: string,
  targetEndTime: string,
  targetYPosition: number,
  movingSessionId: string
): Session[] => {
  logger.debug("우선순위 기반 충돌 해결 시작", {
    targetWeekday,
    targetStartTime,
    targetEndTime,
    targetYPosition,
    movingSessionId,
  });

  // 1. targetDaySessions = Map<yPosition, SessionWithPriority[]> — weekday 그룹화 (priorityLevel: 0).
  const targetDaySessions = buildDaySessionsMap(sessions, targetWeekday);

  logger.debug("초기 targetDaySessions", {
    sessions: Object.fromEntries(
      Array.from(targetDaySessions.entries()).map(([yPos, sessions]) => [
        yPos,
        sessions.map((s) => ({ id: s.id, priorityLevel: s.priorityLevel })),
      ])
    ),
  });

  // 2. 충돌 해결 로직 (재귀적 처리)
  // 이동 대상의 목표 y는 고정(anchor), 충돌 전파는 별도 포인터로 진행
  const anchorYPosition = targetYPosition;
  let propagateYPosition = targetYPosition;

  // Bug fix: 같은 요일 내에서 더 높은 레인(높은 yPos)으로 이동 시,
  // 기존 chain propagation(충돌 세션을 yPos+1으로 밀기)은 compaction 후
  // 이동 세션이 소스 자리로 돌아오는 문제가 있음.
  // → 첫 충돌(loopCount=1)에서 충돌 세션을 yPos+1이 아닌 소스 빈 자리로 이동해야 함.
  const movingSessionForChain = sessions.find((s) => s.id === movingSessionId);
  const sourceYPosForChain =
    movingSessionForChain?.weekday === targetWeekday
      ? (movingSessionForChain?.yPosition ?? undefined)
      : undefined;
  const isMovingToHigherLane =
    sourceYPosForChain !== undefined && targetYPosition > sourceYPosForChain;

  // Bug fix (omni-radar 2026-05-13): sourceYPos 가 다른 시간 겹침 세션으로 점유되어
  // 있으면 그쪽으로 chain redirect 시 그 세션과 다시 충돌 → chain 이 anchor 까지
  // 도달해 anchor 위에 stack (lane 2개에 같은 yPosition). 사용자 보고: 5번 12:00 세션을
  // 1번/2번 사이로 drag → 1번이 5번 뒤에 같은 lane 으로 겹침.
  // → sourceYPos 에 시간 겹침 세션 있으면 단순 propagate+1 chain 으로 fallback.
  const sourceYPosOccupiedByConflict =
    isMovingToHigherLane &&
    sourceYPosForChain !== undefined &&
    sessions.some(
      (s) =>
        s.id !== movingSessionId &&
        s.weekday === targetWeekday &&
        (s.yPosition ?? 1) === sourceYPosForChain &&
        isTimeOverlapping(
          s.startsAt,
          s.endsAt,
          targetStartTime,
          targetEndTime,
        ),
    );
  const canRedirectToSourceYPos =
    isMovingToHigherLane && !sourceYPosOccupiedByConflict;

  // 초기 충돌 확인
  let hasCollisions = checkCollisionsAtYPosition(
    targetDaySessions,
    propagateYPosition,
    targetStartTime,
    targetEndTime
  );

  let loopCount = 0; // 루프 카운터 추가

  while (hasCollisions) {
    loopCount++;
    const sessionsAtCurrentPos =
      targetDaySessions.get(propagateYPosition) || [];

    let collidingSessions: SessionWithPriority[] = [];

    if (loopCount === 1) {
      // 첫 번째 루프: 이동할 세션과 시간이 겹치는 세션들 찾기
      collidingSessions = sessionsAtCurrentPos.filter(
        (session) =>
          session.id !== movingSessionId &&
          isTimeOverlapping(
            targetStartTime,
            targetEndTime,
            session.startsAt,
            session.endsAt
          )
      );
    } else {
      // 두 번째 루프부터: 우선순위 레벨 1인 세션들과 시간이 겹치는 세션들 찾기
      const highPrioritySessions = sessionsAtCurrentPos.filter(
        (session) => (session.priorityLevel || 0) >= 1
      );

      collidingSessions = sessionsAtCurrentPos.filter(
        (session) =>
          session.id !== movingSessionId &&
          highPrioritySessions.some((highPrioritySession) =>
            isTimeOverlapping(
              highPrioritySession.startsAt,
              highPrioritySession.endsAt,
              session.startsAt,
              session.endsAt
            )
          )
      );
    }

    if (collidingSessions.length === 0) {
      // 충돌 없음, 종료
      break;
    }

    // 첫 번째 루프에서는 우선순위 체크하지 않고 모든 충돌 세션 이동
    if (loopCount === 1) {
      // isMovingToHigherLane: 같은 요일 내 더 높은 레인으로 이동 시
      // 충돌 세션을 yPos+1(아래)로 미는 대신 소스 빈 자리(sourceYPos)로 이동.
      // 이렇게 해야 compaction 후에도 이동 세션이 targetYPos에 정착.
      // 단, sourceYPos 가 이미 다른 시간 겹침 세션으로 점유되어 있으면 그쪽으로
      // 보내봤자 또 충돌 → chain anchor 침범 (omni-radar 2026-05-13).
      const nextYPosition =
        canRedirectToSourceYPos && sourceYPosForChain !== undefined
          ? sourceYPosForChain
          : propagateYPosition + 1;

      collidingSessions.forEach((session) => {
        // 기존 위치에서 제거
        const currentSessions = targetDaySessions.get(propagateYPosition) || [];
        targetDaySessions.set(
          propagateYPosition,
          currentSessions.filter((s) => s.id !== session.id)
        );

        // 새 위치에 추가 (우선순위 레벨 +1)
        if (!targetDaySessions.has(nextYPosition)) {
          targetDaySessions.set(nextYPosition, []);
        }
        targetDaySessions.get(nextYPosition)!.push({
          ...session,
          yPosition: nextYPosition,
          priorityLevel: (session.priorityLevel || 0) + 1,
        });

        // enrollmentIds를 통해 과목 정보 찾기
        const enrollment = enrollments.find((e) =>
          session.enrollmentIds?.includes(e.id)
        );
        const subject = enrollment
          ? subjects.find((sub) => sub.id === enrollment.subjectId)
          : null;

        logger.debug("세션 이동 및 우선순위 업데이트", {
          sessionId: session.id,
          subjectName: subject?.name || "알 수 없음",
          time: `${session.startsAt} - ${session.endsAt}`,
          fromYPosition: propagateYPosition,
          toYPosition: nextYPosition,
          fromPriorityLevel: session.priorityLevel || 0,
          toPriorityLevel: (session.priorityLevel || 0) + 1,
        });
      });
      // 체인 전파: 다음 줄에서 계속 확인
      propagateYPosition = nextYPosition;
    } else {
      // 두 번째 루프부터는 우선순위 레벨 기반 처리

      // 우선순위 레벨 1인 세션들은 현재 위치에 유지
      const highPrioritySessions = collidingSessions.filter(
        (session) => (session.priorityLevel || 0) >= 1
      );

      // 우선순위 레벨 0인 세션들만 다음 위치로 이동
      const lowPrioritySessions = collidingSessions.filter(
        (session) => (session.priorityLevel || 0) === 0
      );

      if (lowPrioritySessions.length === 0) {
        // 이동할 우선순위 레벨 0 세션이 없음, 종료
        break;
      }

      const nextYPosition = propagateYPosition + 1;

      lowPrioritySessions.forEach((session) => {
        // 기존 위치에서 제거
        const currentSessions = targetDaySessions.get(propagateYPosition) || [];
        targetDaySessions.set(
          propagateYPosition,
          currentSessions.filter((s) => s.id !== session.id)
        );

        // 새 위치에 추가 (우선순위 레벨 +1)
        if (!targetDaySessions.has(nextYPosition)) {
          targetDaySessions.set(nextYPosition, []);
        }
        targetDaySessions.get(nextYPosition)!.push({
          ...session,
          yPosition: nextYPosition,
          priorityLevel: (session.priorityLevel || 0) + 1,
        });

        logger.debug("우선순위 레벨 0 세션 이동", {
          sessionId: session.id,
          fromYPosition: propagateYPosition,
          toYPosition: nextYPosition,
          newPriorityLevel: (session.priorityLevel || 0) + 1,
        });
      });
      // 체인 전파
      propagateYPosition = nextYPosition;
    }

    // 다음 전파 위치에서 충돌 재확인 (2회차부터 우선순위 고려)
    hasCollisions = checkCollisionsAtYPosition(
      targetDaySessions,
      propagateYPosition,
      targetStartTime,
      targetEndTime,
      loopCount > 1
    );

    // 무한 루프 방지 (안전 장치)
    if (loopCount > 20) {
      logger.warn("충돌 해결 루프 제한 도달, 강제 종료", {
        loopCount,
        currentYPosition: propagateYPosition,
      });
      break;
    }
  }

  // 3. 이동할 세션을 목표 위치에 배치
  const movingSession = sessions.find((s) => s.id === movingSessionId);
  if (movingSession) {
    logger.debug("이동할 세션을 목표 위치에 배치", {
      sessionId: movingSessionId,
      targetYPosition: anchorYPosition,
    });

    // 이동할 세션을 목표 위치에 추가
    if (!targetDaySessions.has(anchorYPosition)) {
      targetDaySessions.set(anchorYPosition, []);
    }

    // 기존 위치에서 제거 (다른 요일이나 위치에 있을 수 있음)
    targetDaySessions.forEach((sessionList, yPos) => {
      const filteredList = sessionList.filter((s) => s.id !== movingSessionId);
      targetDaySessions.set(yPos, filteredList);
    });

    // 새 위치와 시간으로 업데이트하여 추가
    targetDaySessions.get(anchorYPosition)!.push({
      ...movingSession,
      weekday: targetWeekday,
      startsAt: targetStartTime,
      endsAt: targetEndTime,
      yPosition: anchorYPosition,
      priorityLevel: 1, // 이동하는 세션은 우선순위 1
    });
  }

  // 4. 최종 세션 배열 생성
  const finalSessions: Session[] = [];

  // 다른 요일의 세션들은 유지하되,
  // 교차-요일 이동 시 원래 요일(sourceWeekday)은 yPosition을 1부터 다시 압축(compact)
  const sourceWeekday = movingSession ? movingSession.weekday : undefined;
  const isCrossWeekdayMove =
    sourceWeekday !== undefined && sourceWeekday !== targetWeekday;

  // 4-1) 원래 요일 압축 처리 (교차-요일 이동인 경우 — 이동 세션 자체 제외 후 compact).
  if (isCrossWeekdayMove && sourceWeekday !== undefined) {
    const sourceDaySessions = buildDaySessionsMap(
      sessions,
      sourceWeekday,
      movingSessionId,
    );
    finalSessions.push(...compactYPositions(sourceDaySessions));
  }

  // 4-2) 나머지 다른 요일들은 그대로 유지 (이동 세션 제외, sourceWeekday는 이미 처리했으므로 스킵)
  sessions
    .filter(
      (s) =>
        s.weekday !== targetWeekday &&
        (!isCrossWeekdayMove || s.weekday !== sourceWeekday)
    )
    .forEach((session) => {
      if (session.id === movingSessionId) return;
      finalSessions.push(session);
    });

  // 해당(목표) 요일의 세션들은 충돌 해결된 것으로 교체 — 빈 yPosition 제거 + 1부터 compact 재배치.
  finalSessions.push(...compactYPositions(targetDaySessions));

  logger.debug("우선순위 기반 충돌 해결 완료");
  return finalSessions;
};

/**
 * 세션 배열에서 실제로 필요한 lane 수를 계산 (sweep-line).
 * 저장된 yPosition 값을 무시하고 시간 겹침 기반으로 계산.
 * 고아 yPosition(삭제/이동 후 남은 비연속 값)으로 인한 빈 lane 방지.
 */
export function computeRequiredLanes(sessions: Session[]): number {
  if (sessions.length === 0) return 1;
  const events: [number, number][] = sessions.flatMap((s) => [
    [timeToMinutes(s.startsAt), 1],
    [timeToMinutes(s.endsAt), -1],
  ]);
  // 같은 시각: 종료(-1) 먼저 처리 → 연속 배치 세션이 같은 lane 공유
  events.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let maxConcurrent = 0;
  let current = 0;
  for (const [, delta] of events) {
    current += delta;
    if (current > maxConcurrent) maxConcurrent = current;
  }
  return Math.max(1, maxConcurrent);
}

/**
 * 드래그 중인 세션의 현재 목표 위치를 기반으로 드롭 후의 레이아웃을 미리 계산.
 * 드래그가 없으면 입력 Map을 그대로 반환.
 *
 * targetMode === "insertBefore" 일 때 (Variant E — LaneInsertSlot hover) drop
 * 핸들러와 동일한 명시적 lane shift+insert 시뮬레이션 — 사용자가 보는 preview 와
 * 실제 drop 결과 일치 보장. 그 외엔 기존 collision-based reposition.
 */
export function computeTentativeLayout(
  sessionsMap: Map<number, Session[]>,
  enrollments: Enrollment[],
  subjects: Subject[],
  dragged: Session | null,
  targetWeekday: number | null,
  targetStartTime: string | null,
  targetYPosition: number | null,
  options?: {
    excludeDraggedFromResult?: boolean;
    targetMode?: "lane" | "insertBefore";
  },
): Map<number, Session[]> {
  if (
    !dragged ||
    targetWeekday == null ||
    targetStartTime == null ||
    targetYPosition == null
  ) {
    return sessionsMap;
  }

  const origDurationMin =
    timeToMinutes(dragged.endsAt) - timeToMinutes(dragged.startsAt);
  const newStartMin = timeToMinutes(targetStartTime);
  const newEndMin = newStartMin + origDurationMin;
  const hh = Math.floor(newEndMin / 60).toString().padStart(2, "0");
  const mm = (newEndMin % 60).toString().padStart(2, "0");
  const newEndTime = `${hh}:${mm}`;

  const allSessions = Array.from(sessionsMap.values()).flat();
  // dynamic import 회피 — 같은 lib/ 내 다른 파일이라 직접 import 가능하지만
  // circular dependency 우려 (laneInsert → this file 의 isTimeOverlapping 사용).
  // 그래서 inline 동일 알고리즘. 추후 helper 공유는 별도 리팩터.
  const tentative =
    options?.targetMode === "insertBefore"
      ? insertSessionAtLanePreview(
          allSessions,
          targetWeekday,
          targetStartTime,
          newEndTime,
          targetYPosition,
          dragged.id,
        )
      : repositionSessions(
          allSessions,
          enrollments,
          subjects,
          targetWeekday,
          targetStartTime,
          newEndTime,
          targetYPosition,
          dragged.id,
        );

  const result = new Map<number, Session[]>();
  for (const s of tentative) {
    // excludeDraggedFromResult: 드래그 세션을 결과에서 제외하여 SessionBlock이
    // target 위치에 렌더되지 않게 함. 대신 DragGhost(pointer-events:none)를 사용.
    if (options?.excludeDraggedFromResult && s.id === dragged.id) continue;
    if (!result.has(s.weekday)) result.set(s.weekday, []);
    result.get(s.weekday)!.push(s);
  }
  return result;
}

/**
 * Variant E preview helper — `insertSessionAtLane` 와 동일 의미. circular import
 * 회피 위해 동일 algorithm inline. drop handler 와 preview 의 결과가 같도록.
 */
function insertSessionAtLanePreview(
  sessions: Session[],
  targetWeekday: number,
  startsAt: string,
  endsAt: string,
  insertBeforeYPos: number,
  movingId: string,
): Session[] {
  const moving = sessions.find((s) => s.id === movingId);
  if (!moving) return sessions;
  const sourceWeekday = moving.weekday;
  const isCross = sourceWeekday !== targetWeekday;

  const shifted = sessions.map((s) => {
    if (s.id === movingId) return s;
    if (
      s.weekday === targetWeekday &&
      (s.yPosition ?? 1) >= insertBeforeYPos &&
      isTimeOverlapping(s.startsAt, s.endsAt, startsAt, endsAt)
    ) {
      return { ...s, yPosition: (s.yPosition ?? 1) + 1 };
    }
    return s;
  });

  const placed = shifted.map((s) =>
    s.id === movingId
      ? {
          ...s,
          weekday: targetWeekday,
          startsAt,
          endsAt,
          yPosition: insertBeforeYPos,
        }
      : s,
  );

  const compactDay = (arr: Session[], wd: number): Session[] => {
    const ys = Array.from(
      new Set(arr.filter((s) => s.weekday === wd).map((s) => s.yPosition ?? 1)),
    ).sort((a, b) => a - b);
    const m = new Map<number, number>();
    ys.forEach((y, i) => m.set(y, i + 1));
    return arr.map((s) =>
      s.weekday === wd ? { ...s, yPosition: m.get(s.yPosition ?? 1) ?? 1 } : s,
    );
  };

  const targetCompact = compactDay(placed, targetWeekday);
  return isCross ? compactDay(targetCompact, sourceWeekday) : targetCompact;
}
