/**
 * 스케줄 페이지의 드래그&드롭 로직
 */

import { useCallback, useRef } from "react";
import { logger } from "../lib/logger";
import type { Session } from "../lib/planner";
import { minutesToTime, timeToMinutes } from "../lib/planner";

export function useScheduleDragAndDrop(
  sessions: Session[],
  updateData: (data: any) => Promise<void>
) {
  const draggedSessionRef = useRef<Session | null>(null);
  const dragStartPositionRef = useRef<{ x: number; y: number } | null>(null);

  // 드래그 시작
  const handleDragStart = useCallback((session: Session, event: any) => {
    logger.debug("드래그 시작", { sessionId: session.id });
    draggedSessionRef.current = session;

    if (event.dataTransfer) {
      event.dataTransfer.setData("text/plain", session.id);
      event.dataTransfer.effectAllowed = "move";
    }

    // 드래그 시작 위치 저장
    dragStartPositionRef.current = {
      x: event.clientX,
      y: event.clientY,
    };
  }, []);

  // 드래그 오버
  const handleDragOver = useCallback((event: any) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  // 드롭 처리
  const handleDrop = useCallback(
    async (weekday: number, yPosition: number, event: any) => {
      event.preventDefault();

      const draggedSession = draggedSessionRef.current;
      if (!draggedSession) {
        logger.warn("드래그된 세션이 없음");
        return;
      }

      logger.debug("드롭 처리 시작", {
        sessionId: draggedSession.id,
        targetWeekday: weekday,
        targetYPosition: yPosition,
      });

      // 같은 위치에 드롭하면 아무것도 하지 않음
      if (
        draggedSession.weekday === weekday &&
        draggedSession.yPosition === yPosition
      ) {
        logger.debug("같은 위치에 드롭 - 무시");
        draggedSessionRef.current = null;
        return;
      }

      try {
        // 세션 위치 업데이트
        const updatedSessions = sessions.map((session) => {
          if (session.id === draggedSession.id) {
            return {
              ...session,
              weekday,
              yPosition,
            };
          }
          return session;
        });

        await updateData({ sessions: updatedSessions });
        logger.info("세션 드래그&드롭 완료", {
          sessionId: draggedSession.id,
          newWeekday: weekday,
          newYPosition: yPosition,
        });
      } catch (error) {
        logger.error("세션 드래그&드롭 실패", undefined, error as Error);
      } finally {
        draggedSessionRef.current = null;
        dragStartPositionRef.current = null;
      }
    },
    [sessions, updateData]
  );

  // 드래그 종료
  const handleDragEnd = useCallback(() => {
    logger.debug("드래그 종료");
    draggedSessionRef.current = null;
    dragStartPositionRef.current = null;
  }, []);

  // 시간 기반 드롭 처리
  const handleTimeDrop = useCallback(
    async (weekday: number, targetMinutes: number, event: any) => {
      event.preventDefault();

      const draggedSession = draggedSessionRef.current;
      if (!draggedSession) {
        return;
      }

      const sessionDurationMinutes =
        timeToMinutes(draggedSession.endsAt) -
        timeToMinutes(draggedSession.startsAt);

      const newStartTime = minutesToTime(targetMinutes);
      const newEndTime = minutesToTime(targetMinutes + sessionDurationMinutes);

      logger.debug("시간 기반 드롭", {
        sessionId: draggedSession.id,
        newStartTime,
        newEndTime,
      });

      try {
        const updatedSessions = sessions.map((session) => {
          if (session.id === draggedSession.id) {
            return {
              ...session,
              weekday,
              startsAt: newStartTime,
              endsAt: newEndTime,
            };
          }
          return session;
        });

        await updateData({ sessions: updatedSessions });
        logger.info("시간 기반 드래그&드롭 완료");
      } catch (error) {
        logger.error("시간 기반 드래그&드롭 실패", undefined, error as Error);
      } finally {
        draggedSessionRef.current = null;
      }
    },
    [sessions, updateData]
  );

  return {
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    handleTimeDrop,
    draggedSession: draggedSessionRef.current,
  };
}


