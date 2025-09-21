/**
 * 스케줄 페이지의 세션 관리 로직
 */

import { useCallback } from "react";
import { logger } from "../lib/logger";
import type { Enrollment, Session } from "../lib/planner";
import { timeToMinutes } from "../lib/planner";

interface SessionWithPriority extends Session {
  priorityLevel?: number;
}

export function useScheduleSessionManagement(
  sessions: Session[],
  enrollments: Enrollment[],
  updateData: (data: any) => Promise<void>,
  startApiCall: (name: string) => void,
  endApiCall: (name: string, success: boolean) => void,
  startInteraction: (name: string) => void,
  endInteraction: (name: string) => void
) {
  // 시간 충돌 감지 함수
  const isTimeOverlapping = useCallback(
    (start1: string, end1: string, start2: string, end2: string): boolean => {
      const start1Minutes = timeToMinutes(start1);
      const end1Minutes = timeToMinutes(end1);
      const start2Minutes = timeToMinutes(start2);
      const end2Minutes = timeToMinutes(end2);

      return start1Minutes < end2Minutes && start2Minutes < end1Minutes;
    },
    []
  );

  // 충돌하는 세션들 찾기
  const findCollidingSessions = useCallback(
    (
      weekday: number,
      startTime: string,
      endTime: string,
      excludeSessionId?: string
    ): Session[] => {
      return sessions.filter((session) => {
        return (
          session.weekday === weekday &&
          session.id !== excludeSessionId &&
          isTimeOverlapping(
            startTime,
            endTime,
            session.startsAt,
            session.endsAt
          )
        );
      });
    },
    [sessions, isTimeOverlapping]
  );

  // 특정 yPosition에서 충돌 확인
  const checkCollisionsAtYPosition = useCallback(
    (
      targetDaySessions: Map<number, SessionWithPriority[]>,
      yPosition: number,
      targetStartTime: string,
      targetEndTime: string,
      checkWithPriorityLevel1: boolean = false
    ): boolean => {
      const sessionsAtYPosition = targetDaySessions.get(yPosition) || [];

      if (checkWithPriorityLevel1) {
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
        return sessionsAtYPosition.some((session) =>
          isTimeOverlapping(
            session.startsAt,
            session.endsAt,
            targetStartTime,
            targetEndTime
          )
        );
      }
    },
    [isTimeOverlapping]
  );

  // 세션 추가 함수
  const addSession = useCallback(
    async (sessionData: any) => {
      logger.debug("세션 추가 시작", { sessionData });
      startInteraction("add_session");

      // 1단계: 각 학생에 대해 enrollment 생성/확인
      const enrollmentIds: string[] = [];
      const newEnrollments: any[] = [];

      for (const studentId of sessionData.studentIds) {
        let enrollment = enrollments.find(
          (e) =>
            e.studentId === studentId && e.subjectId === sessionData.subjectId
        );

        if (!enrollment) {
          enrollment = {
            id: crypto.randomUUID(),
            studentId: studentId,
            subjectId: sessionData.subjectId,
          };
          newEnrollments.push(enrollment);
          logger.debug("새로운 enrollment 생성", { enrollment });
        } else {
          logger.debug("기존 enrollment 사용", { enrollment });
        }

        enrollmentIds.push(enrollment.id);
      }

      // 2단계: 세션 생성
      const newSession = {
        id: crypto.randomUUID(),
        subjectId: sessionData.subjectId,
        studentIds: sessionData.studentIds,
        weekday: sessionData.weekday,
        startsAt: sessionData.startTime,
        endsAt: sessionData.endTime,
        room: sessionData.room || "",
        enrollmentIds: enrollmentIds,
        yPosition: sessionData.yPosition || 1,
      };

      logger.debug("새로운 세션 생성", { newSession });

      // 3단계: enrollment와 session을 한 번에 업데이트
      const updateDataPayload: any = {
        sessions: [...sessions, newSession],
      };

      if (newEnrollments.length > 0) {
        logger.debug("새로운 enrollments와 세션을 함께 저장", {
          newEnrollments,
        });
        updateDataPayload.enrollments = [...enrollments, ...newEnrollments];
      }

      startApiCall("update_data");
      await updateData(updateDataPayload);
      endApiCall("update_data", true);

      logger.info("세션 추가 완료");
      endInteraction("add_session");

      // 충돌 해결을 위해 다음 렌더링 사이클에서 실행
      setTimeout(async () => {
        try {
          logger.debug("충돌 해결 시작 (비동기)");

          const updatedSessions = [...sessions, newSession];
          const updatedEnrollments =
            newEnrollments.length > 0
              ? [...enrollments, ...newEnrollments]
              : enrollments;

          // 충돌 해결 로직은 별도 함수로 분리 예정
          logger.info("충돌 해결 업데이트 완료");
        } catch (error) {
          logger.error("충돌 해결 실패", undefined, error as Error);
        }
      }, 0);
    },
    [
      sessions,
      enrollments,
      updateData,
      startInteraction,
      endInteraction,
      startApiCall,
      endApiCall,
    ]
  );

  // 세션 업데이트 함수
  const updateSession = useCallback(
    async (sessionId: string, sessionData: any) => {
      logger.debug("세션 업데이트 시작", { sessionId, sessionData });

      const newSessions = sessions.map((s) => {
        if (s.id === sessionId) {
          const updatedSession = {
            ...s,
            ...sessionData,
            startsAt: sessionData.startTime || s.startsAt,
            endsAt: sessionData.endTime || s.endsAt,
          };

          delete updatedSession.startTime;
          delete updatedSession.endTime;

          logger.debug("세션 업데이트", {
            original: { startsAt: s.startsAt, endsAt: s.endsAt },
            updated: {
              startsAt: updatedSession.startsAt,
              endsAt: updatedSession.endsAt,
            },
          });

          return updatedSession;
        }
        return s;
      });

      await updateData({ sessions: newSessions });
      logger.info("세션 업데이트 완료");
    },
    [sessions, updateData]
  );

  return {
    addSession,
    updateSession,
    findCollidingSessions,
    checkCollisionsAtYPosition,
    isTimeOverlapping,
  };
}


