/**
 * 세션 충돌 감지 및 해결 유틸리티
 * develop 브랜치에서 작동하던 원래 로직 복원
 */

import { logger } from "./logger";
import type { Enrollment, Session, Subject } from "./planner";
import { timeToMinutes } from "./planner";

interface SessionWithPriority extends Session {
  priorityLevel?: number;
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

  // 1. targetDaySessions = Map<yPosition, SessionWithPriority[]>
  const targetDaySessions = new Map<number, SessionWithPriority[]>();

  // 해당 요일의 모든 세션들을 yPosition별로 그룹화 (우선순위 레벨 0으로 초기화)
  sessions
    .filter((s) => s.weekday === targetWeekday)
    .forEach((session) => {
      const yPos = session.yPosition || 1;
      if (!targetDaySessions.has(yPos)) {
        targetDaySessions.set(yPos, []);
      }
      targetDaySessions.get(yPos)!.push({ ...session, priorityLevel: 0 });
    });

  logger.debug("초기 targetDaySessions", {
    sessions: Object.fromEntries(
      Array.from(targetDaySessions.entries()).map(([yPos, sessions]) => [
        yPos,
        sessions.map((s) => ({ id: s.id, priorityLevel: s.priorityLevel })),
      ])
    ),
  });

  // 2. 충돌 해결 로직 (재귀적 처리)
  let currentYPosition = targetYPosition;

  // 초기 충돌 확인
  let hasCollisions = checkCollisionsAtYPosition(
    targetDaySessions,
    currentYPosition,
    targetStartTime,
    targetEndTime
  );

  let loopCount = 0; // 루프 카운터 추가

  while (hasCollisions) {
    loopCount++;
    const sessionsAtCurrentPos = targetDaySessions.get(currentYPosition) || [];

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
      const nextYPosition = currentYPosition + 1;

      collidingSessions.forEach((session) => {
        // 기존 위치에서 제거
        const currentSessions = targetDaySessions.get(currentYPosition) || [];
        targetDaySessions.set(
          currentYPosition,
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
          fromYPosition: currentYPosition,
          toYPosition: nextYPosition,
          fromPriorityLevel: session.priorityLevel || 0,
          toPriorityLevel: (session.priorityLevel || 0) + 1,
        });
      });

      currentYPosition = nextYPosition;
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

      const nextYPosition = currentYPosition + 1;

      lowPrioritySessions.forEach((session) => {
        // 기존 위치에서 제거
        const currentSessions = targetDaySessions.get(currentYPosition) || [];
        targetDaySessions.set(
          currentYPosition,
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
          fromYPosition: currentYPosition,
          toYPosition: nextYPosition,
          newPriorityLevel: (session.priorityLevel || 0) + 1,
        });
      });

      currentYPosition = nextYPosition;
    }

    // 다음 yPosition에서 충돌 확인
    // 두 번째 루프부터는 우선순위 레벨 1인 세션들과의 충돌 확인
    hasCollisions = checkCollisionsAtYPosition(
      targetDaySessions,
      currentYPosition,
      targetStartTime,
      targetEndTime,
      loopCount > 1 // 두 번째 루프부터 우선순위 레벨 1 세션들과 충돌 확인
    );

    // 무한 루프 방지 (안전 장치)
    if (loopCount > 20) {
      logger.warn("충돌 해결 루프 제한 도달, 강제 종료", {
        loopCount,
        currentYPosition,
      });
      break;
    }
  }

  // 3. 이동할 세션을 목표 위치에 배치
  const movingSession = sessions.find((s) => s.id === movingSessionId);
  if (movingSession) {
    logger.debug("이동할 세션을 목표 위치에 배치", {
      sessionId: movingSessionId,
      targetYPosition: currentYPosition,
    });

    // 이동할 세션을 목표 위치에 추가
    if (!targetDaySessions.has(currentYPosition)) {
      targetDaySessions.set(currentYPosition, []);
    }

    // 기존 위치에서 제거 (다른 요일이나 위치에 있을 수 있음)
    targetDaySessions.forEach((sessionList, yPos) => {
      const filteredList = sessionList.filter((s) => s.id !== movingSessionId);
      targetDaySessions.set(yPos, filteredList);
    });

    // 새 위치와 시간으로 업데이트하여 추가
    targetDaySessions.get(currentYPosition)!.push({
      ...movingSession,
      weekday: targetWeekday,
      startsAt: targetStartTime,
      endsAt: targetEndTime,
      yPosition: currentYPosition,
      priorityLevel: 1, // 이동하는 세션은 우선순위 1
    });
  }

  // 4. 최종 세션 배열 생성
  const finalSessions: Session[] = [];

  // 다른 요일의 세션들은 그대로 유지
  sessions
    .filter((s) => s.weekday !== targetWeekday)
    .forEach((session) => {
      finalSessions.push(session);
    });

  // 해당 요일의 세션들은 충돌 해결된 것으로 교체
  targetDaySessions.forEach((sessionList) => {
    sessionList.forEach((session) => {
      // priorityLevel 속성 제거하고 원래 Session 타입으로 변환
      const { priorityLevel, ...cleanSession } = session;
      finalSessions.push(cleanSession as Session);
    });
  });

  logger.debug("우선순위 기반 충돌 해결 완료");
  return finalSessions;
};
