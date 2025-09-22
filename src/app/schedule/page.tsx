"use client";

import { SESSION_CELL_HEIGHT } from "@/shared/constants/sessionConstants";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AuthGuard from "../../components/atoms/AuthGuard";
import Button from "../../components/atoms/Button";
import Label from "../../components/atoms/Label";
import PDFDownloadButton from "../../components/molecules/PDFDownloadButton";
import StudentPanel from "../../components/organisms/StudentPanel";
import TimeTableGrid from "../../components/organisms/TimeTableGrid";
import { useDisplaySessions } from "../../hooks/useDisplaySessions";
import { useIntegratedDataLocal } from "../../hooks/useIntegratedDataLocal";
import { useLocal } from "../../hooks/useLocal";
import { usePerformanceMonitoring } from "../../hooks/usePerformanceMonitoring";
import { useStudentPanel } from "../../hooks/useStudentPanel";
import { useTimeValidation } from "../../hooks/useTimeValidation";
import { getClassPlannerData } from "../../lib/localStorageCrud";
import { logger } from "../../lib/logger";
import type { Enrollment, Session, Student } from "../../lib/planner";
import { minutesToTime, timeToMinutes, weekdays } from "../../lib/planner";
import { repositionSessions as repositionSessionsUtil } from "../../lib/sessionCollisionUtils";
import type { GroupSessionData } from "../../types/scheduleTypes";
import { supabase } from "../../utils/supabaseClient";
import GroupSessionModal from "./_components/GroupSessionModal";
import EditSessionModal from "./_components/EditSessionModal";
import styles from "./Schedule.module.css";

export default function SchedulePage() {
  return (
    <AuthGuard requireAuth={true}>
      <SchedulePageContent />
    </AuthGuard>
  );
}

function SchedulePageContent() {
  // 🚀 통합 데이터 훅 사용 (JSONB 기반 효율적 데이터 관리)
  const {
    data: { students, subjects, sessions, enrollments },
    loading: dataLoading,
    error,
    updateData,
    addEnrollment,
  } = useIntegratedDataLocal();

  // 성능 모니터링
  const { startApiCall, endApiCall, startInteraction, endInteraction } =
    usePerformanceMonitoring();

  const [selectedStudentId, setSelectedStudentId] = useLocal<string>(
    "ui:selectedStudent",
    ""
  );

  // 🆕 세션 관리 함수들 (통합 데이터 업데이트 방식)
  const addSession = useCallback(
    async (sessionData: any) => {
      logger.debug("세션 추가 시작", { sessionData });
      startInteraction("add_session");

      // 1단계: 각 학생에 대해 enrollment 생성/확인
      const enrollmentIds: string[] = [];
      const newEnrollments: any[] = [];

      for (const studentId of sessionData.studentIds) {
        // 기존 enrollment가 있는지 확인
        let enrollment = enrollments.find(
          (e) =>
            e.studentId === studentId && e.subjectId === sessionData.subjectId
        );

        if (!enrollment) {
          // 새로운 enrollment 생성
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
        enrollmentIds: enrollmentIds, // ✅ 실제 enrollment ID 사용
        yPosition: sessionData.yPosition || 1, // 🆕 yPosition 추가
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

      // 🆕 충돌 해결을 위해 다음 렌더링 사이클에서 실행
      setTimeout(async () => {
        try {
          logger.debug("충돌 해결 시작 (비동기)");

          // 현재 세션 목록으로 충돌 해결 (새로 생성된 enrollment 포함)
          const updatedSessions = [...sessions, newSession];
          const updatedEnrollments =
            newEnrollments.length > 0
              ? [...enrollments, ...newEnrollments]
              : enrollments;

          const repositionedSessions = repositionSessionsUtil(
            updatedSessions,
            updatedEnrollments,
            subjects,
            sessionData.weekday,
            sessionData.startTime,
            sessionData.endTime,
            sessionData.yPosition || 1,
            newSession.id
          );

          logger.debug("충돌 해결 완료", {
            finalSessionCount: repositionedSessions.length,
          });

          // 충돌 해결된 세션들과 enrollment를 함께 업데이트
          const updatePayload: any = { sessions: repositionedSessions };
          if (newEnrollments.length > 0) {
            updatePayload.enrollments = updatedEnrollments;
          }

          await updateData(updatePayload);

          logger.info("충돌 해결 업데이트 완료");
        } catch (error) {
          logger.error("충돌 해결 실패", undefined, error as Error);
        }
      }, 0);
    },
    [sessions, enrollments, updateData]
  );

  const updateSession = useCallback(
    async (sessionId: string, sessionData: any) => {
      logger.debug("세션 업데이트 시작", { sessionId, sessionData });

      const newSessions = sessions.map((s) => {
        if (s.id === sessionId) {
          const updatedSession = {
            ...s,
            ...sessionData,
            // 시간 필드명 변환 (startTime/endTime → startsAt/endsAt)
            startsAt: sessionData.startTime || s.startsAt,
            endsAt: sessionData.endTime || s.endsAt,
          };

          // 불필요한 필드 제거
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

      // 🆕 시간 변경 시 충돌 재배치 수행
      const target = newSessions.find((s) => s.id === sessionId);
      const targetWeekday = target?.weekday ?? sessionData.weekday ?? 0;
      const targetStartTime = target?.startsAt ?? sessionData.startTime;
      const targetEndTime = target?.endsAt ?? sessionData.endTime;
      const targetYPosition = target?.yPosition || 1;

      const repositioned = repositionSessionsUtil(
        newSessions,
        enrollments,
        subjects,
        targetWeekday,
        targetStartTime,
        targetEndTime,
        targetYPosition,
        sessionId
      );

      await updateData({ sessions: repositioned });
      logger.info("세션 업데이트 및 재배치 완료");
    },
    [sessions, updateData, enrollments, subjects]
  );

  // 🆕 시간 충돌 감지 함수
  const isTimeOverlapping = useCallback(
    (start1: string, end1: string, start2: string, end2: string): boolean => {
      const start1Minutes = timeToMinutes(start1);
      const end1Minutes = timeToMinutes(end1);
      const start2Minutes = timeToMinutes(start2);
      const end2Minutes = timeToMinutes(end2);

      // 두 시간 범위가 겹치는지 확인
      return start1Minutes < end2Minutes && start2Minutes < end1Minutes;
    },
    []
  );

  // 🆕 특정 요일과 시간대에서 충돌하는 세션들 찾기
  const findCollidingSessions = useCallback(
    (
      weekday: number,
      startTime: string,
      endTime: string,
      excludeSessionId?: string
    ): Session[] => {
      return sessions.filter((session) => {
        // 같은 요일이고, 제외할 세션이 아니며, 시간이 겹치는 세션들
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

  // 🆕 임시 우선순위 레벨을 가진 세션 타입
  interface SessionWithPriority extends Session {
    priorityLevel?: number; // 임시로만 사용
  }

  // 🆕 특정 yPosition에서 충돌 확인 함수
  const checkCollisionsAtYPosition = useCallback(
    (
      targetDaySessions: Map<number, SessionWithPriority[]>,
      yPosition: number,
      targetStartTime: string,
      targetEndTime: string,
      checkWithPriorityLevel1: boolean = false // 🆕 우선순위 레벨 1 세션들과 충돌 확인 여부
    ): boolean => {
      const sessionsAtYPosition = targetDaySessions.get(yPosition) || [];

      if (checkWithPriorityLevel1) {
        // 🆕 우선순위 레벨 1인 세션들과 충돌 확인
        const priorityLevel1Sessions = sessionsAtYPosition.filter(
          (session) => session.priorityLevel === 1
        );

        return priorityLevel1Sessions.some((prioritySession) =>
          sessionsAtYPosition.some(
            (session) =>
              session.priorityLevel === 0 && // 우선순위 레벨 0인 세션만 확인
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
    },
    [isTimeOverlapping]
  );

  // 🆕 우선순위 기반 충돌 해결 로직
  const repositionSessions = useCallback(
    (
      sessions: Session[],
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

      // 임시 우선순위 레벨을 가진 세션 타입
      interface SessionWithPriority extends Session {
        priorityLevel?: number;
      }

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

      // 해당 요일의 실제 최대 yPosition 계산
      // const actualMaxYPosition = Math.max(
      //   ...sessions
      //     .filter((s) => s.weekday === targetWeekday)
      //     .map((s) => s.yPosition || 1),
      //   targetYPosition
      // );
      // const maxYPosition = actualMaxYPosition + 1; // 실제 최대값 + 1

      // console.log(
      //   `📊 해당 요일의 최대 yPosition: ${actualMaxYPosition}, 충돌 해결 최대값: ${maxYPosition}`
      // );

      // 초기 충돌 확인
      let hasCollisions = checkCollisionsAtYPosition(
        targetDaySessions,
        currentYPosition,
        targetStartTime,
        targetEndTime
      );

      let loopCount = 0; // 루프 카운터 추가

      while (
        hasCollisions
        // && currentYPosition <= maxYPosition
      ) {
        loopCount++;
        const sessionsAtCurrentPos =
          targetDaySessions.get(currentYPosition) || [];

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

        if (loopCount === 1) {
          logger.debug("첫 번째 루프: 충돌 세션들", {
            currentYPosition,
            collidingSessions: collidingSessions.map((s) => {
              // enrollmentIds를 통해 과목 정보 찾기
              const enrollment = enrollments.find((e) =>
                s.enrollmentIds?.includes(e.id)
              );
              const subject = enrollment
                ? subjects.find((sub) => sub.id === enrollment.subjectId)
                : null;
              return {
                id: s.id,
                subject: subject?.name || "알 수 없음",
                time: `${s.startsAt} - ${s.endsAt}`,
                priorityLevel: s.priorityLevel,
              };
            }),
          });
        } else {
          logger.debug(`${loopCount}번째 루프: 우선순위 레벨 1 충돌 세션들`, {
            loopCount,
            currentYPosition,
            collidingSessions: collidingSessions.map((s) => {
              // enrollmentIds를 통해 과목 정보 찾기
              const enrollment = enrollments.find((e) =>
                s.enrollmentIds?.includes(e.id)
              );
              const subject = enrollment
                ? subjects.find((sub) => sub.id === enrollment.subjectId)
                : null;
              return {
                id: s.id,
                subject: subject?.name || "알 수 없음",
                time: `${s.startsAt} - ${s.endsAt}`,
                priorityLevel: s.priorityLevel,
              };
            }),
          });
        }

        if (collidingSessions.length === 0) {
          // 충돌 없음, 종료
          break; // 루프 바로 종료
        }

        // 첫 번째 루프에서는 우선순위 체크하지 않고 모든 충돌 세션 이동
        if (loopCount === 1) {
          // 첫 번째 루프: 모든 충돌 세션을 다음 위치로 이동

          const nextYPosition = currentYPosition + 1;

          collidingSessions.forEach((session) => {
            // 기존 위치에서 제거
            const currentSessions =
              targetDaySessions.get(currentYPosition) || [];
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
          // 우선순위 레벨 기반 처리

          // 우선순위 레벨 1인 세션들은 현재 위치에 유지
          const highPrioritySessions = collidingSessions.filter(
            (session) => (session.priorityLevel || 0) >= 1
          );

          // 우선순위 레벨 0인 세션들만 다음 위치로 이동
          const lowPrioritySessions = collidingSessions.filter(
            (session) => (session.priorityLevel || 0) === 0
          );

          logger.debug("우선순위 레벨 1 세션들 (현재 위치 유지)", {
            sessions: highPrioritySessions.map((s) => {
              const enrollment = enrollments.find((e) =>
                s.enrollmentIds?.includes(e.id)
              );
              const subject = enrollment
                ? subjects.find((sub) => sub.id === enrollment.subjectId)
                : null;
              return {
                id: s.id,
                subject: subject?.name || "알 수 없음",
                time: `${s.startsAt} - ${s.endsAt}`,
                priorityLevel: s.priorityLevel,
              };
            }),
          });
          logger.debug("우선순위 레벨 0 세션들 (다음 위치로 이동)", {
            sessions: lowPrioritySessions.map((s) => {
              const enrollment = enrollments.find((e) =>
                s.enrollmentIds?.includes(e.id)
              );
              const subject = enrollment
                ? subjects.find((sub) => sub.id === enrollment.subjectId)
                : null;
              return {
                id: s.id,
                subject: subject?.name || "알 수 없음",
                time: `${s.startsAt} - ${s.endsAt}`,
                priorityLevel: s.priorityLevel,
              };
            }),
          });

          if (lowPrioritySessions.length === 0) {
            // 이동할 우선순위 레벨 0 세션이 없음, 종료
            break; // 루프 바로 종료
          }

          const nextYPosition = currentYPosition + 1;

          lowPrioritySessions.forEach((session) => {
            // 기존 위치에서 제거
            const currentSessions =
              targetDaySessions.get(currentYPosition) || [];
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
        }

        // 다음 yPosition에서 충돌 확인
        // 두 번째 루프부터는 우선순위 레벨 1인 세션들과의 충돌 확인
        hasCollisions = checkCollisionsAtYPosition(
          targetDaySessions,
          currentYPosition,
          targetStartTime,
          targetEndTime,
          loopCount > 1 // 🆕 두 번째 루프부터 우선순위 레벨 1 세션들과 충돌 확인
        );
      }

      // 3. 최종 결과 반환 (우선순위 레벨 제거)
      const finalSessions = sessions.map((session) => {
        // 이동할 세션 처리
        if (session.id === movingSessionId) {
          return {
            ...session,
            weekday: targetWeekday,
            startsAt: targetStartTime,
            endsAt: targetEndTime,
            yPosition: targetYPosition,
          };
        }

        // 다른 세션들 처리 (업데이트된 버전으로 교체)
        for (const [yPos, sessionsAtPos] of targetDaySessions) {
          const updatedSession = sessionsAtPos.find((s) => s.id === session.id);
          if (updatedSession) {
            const { priorityLevel, ...sessionWithoutPriority } = updatedSession;
            return sessionWithoutPriority;
          }
        }

        return session;
      });

      logger.debug("우선순위 기반 충돌 해결 완료");
      return finalSessions;
    },
    [isTimeOverlapping]
  );

  const updateSessionPosition = useCallback(
    async (
      sessionId: string,
      weekday: number,
      time: string,
      yPosition: number
    ) => {
      // 기존 세션의 지속 시간 계산
      const existingSession = sessions.find((s) => s.id === sessionId);
      if (!existingSession) {
        console.error("세션을 찾을 수 없습니다:", sessionId);
        return;
      }

      const startMinutes = timeToMinutes(existingSession.startsAt);
      const endMinutes = timeToMinutes(existingSession.endsAt);
      const durationMinutes = endMinutes - startMinutes;

      // 새로운 종료 시간 계산
      const newStartMinutes = timeToMinutes(time);
      const newEndMinutes = newStartMinutes + durationMinutes;
      const newEndTime = minutesToTime(newEndMinutes);

      // 픽셀 위치를 논리적 위치로 변환 (1, 2, 3...)
      const logicalPosition = Math.round(yPosition / SESSION_CELL_HEIGHT) + 1; // 0px = 1번째, SESSION_CELL_HEIGHT px = 2번째, SESSION_CELL_HEIGHT * 2 px = 3번째

      logger.debug("세션 위치 업데이트", {
        sessionId,
        originalTime: `${existingSession.startsAt}-${existingSession.endsAt}`,
        newTime: `${time}-${newEndTime}`,
        durationMinutes,
        logicalPosition,
        originalYPosition: existingSession.yPosition,
      });

      // 🆕 충돌 방지 로직 적용
      logger.debug("repositionSessions 호출 시작");
      const newSessions = repositionSessionsUtil(
        sessions,
        enrollments,
        subjects,
        weekday,
        time,
        newEndTime,
        logicalPosition,
        sessionId
      );
      logger.debug("repositionSessions 완료", {
        newSessionCount: newSessions.length,
      });

      logger.debug("updateData 호출 시작");
      await updateData({ sessions: newSessions });
      logger.info("updateData 완료");
    },
    [sessions, updateData, repositionSessions]
  );

  const deleteSession = useCallback(
    async (sessionId: string) => {
      const newSessions = sessions.filter((s) => s.id !== sessionId);
      await updateData({ sessions: newSessions });
    },
    [sessions, updateData]
  );

  // 🆕 데이터 로딩 완료 후 selectedStudentId 복원
  useEffect(() => {
    if (!dataLoading && students.length > 0) {
      // 클라이언트에서만 localStorage 접근
      if (typeof window !== "undefined") {
        try {
          const savedStudentId = localStorage.getItem("ui:selectedStudent");
          if (savedStudentId && students.some((s) => s.id === savedStudentId)) {
            logger.debug("저장된 학생 선택 복원", { savedStudentId });
            setSelectedStudentId(savedStudentId);
          }
        } catch {
          // localStorage 접근 실패 시 무시
        }
      }
    }
  }, [dataLoading, students, setSelectedStudentId]);

  // 🆕 학생 데이터 디버깅
  useEffect(() => {
    logger.debug("학생 데이터 상태", {
      studentsCount: students.length,
      selectedStudentId,
      selectedStudentName: students.find((s) => s.id === selectedStudentId)
        ?.name,
    });
  }, [students, selectedStudentId]);

  // 🆕 selectedStudentId 변경 감지 및 저장
  useEffect(() => {
    logger.debug("selectedStudentId 변경됨", { selectedStudentId });
    // 클라이언트에서만 localStorage 접근
    if (typeof window !== "undefined") {
      try {
        if (selectedStudentId) {
          localStorage.setItem("ui:selectedStudent", selectedStudentId);
        } else {
          localStorage.removeItem("ui:selectedStudent");
        }
      } catch {
        // localStorage 접근 실패 시 무시
      }
    }
  }, [selectedStudentId]);

  // 🆕 로그인 상태 감지 및 로그아웃 시 정리
  useEffect(() => {
    const checkAuthState = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          logger.debug("로그아웃 상태 감지 - 컴포넌트 정리");
          // 로그아웃 상태에서는 불필요한 로그 방지
          return;
        }

        logger.debug("로그인 상태 확인됨", { email: user.email });
      } catch (error) {
        logger.error("인증 상태 확인 실패", undefined, error as Error);
      }
    };

    checkAuthState();
  }, []);

  // 커스텀 훅 사용
  const { sessions: displaySessions } = useDisplaySessions(
    sessions,
    enrollments,
    selectedStudentId
  );

  const studentPanelState = useStudentPanel(
    students,
    selectedStudentId,
    setSelectedStudentId
  );

  const { validateTimeRange, validateDurationWithinLimit, getNextHour } =
    useTimeValidation();

  // 🆕 그룹 수업 모달 상태
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupModalData, setGroupModalData] = useState<GroupSessionData>({
    studentIds: [], // 빈 배열로 초기화
    subjectId: "",
    weekday: 0,
    startTime: "",
    endTime: "",
    yPosition: 1, // 🆕 기본값 1
  });
  const [groupTimeError, setGroupTimeError] = useState<string>(""); // 시간 입력 에러 메시지

  // 🆕 학생 입력 관련 상태
  const [studentInputValue, setStudentInputValue] = useState("");

  // 🆕 모달용 학생 검색 결과
  const filteredStudentsForModal = useMemo(() => {
    if (!studentInputValue.trim()) return [];
    return students.filter((student) =>
      student.name.toLowerCase().includes(studentInputValue.toLowerCase())
    );
  }, [students, studentInputValue]);

  // 🆕 수업 편집 모달용 학생 입력 상태
  const [editStudentInputValue, setEditStudentInputValue] = useState("");

  // 🆕 수업 편집 모달용 시간 상태
  const [editModalTimeData, setEditModalTimeData] = useState({
    startTime: "",
    endTime: "",
  });
  const [editTimeError, setEditTimeError] = useState<string>("");

  // 🆕 수업 편집 모달용 시작 시간 변경 처리 (종료 시간보다 늦지 않도록)
  const handleEditStartTimeChange = (newStartTime: string) => {
    setEditModalTimeData((prev) => {
      const currentEndTime = prev.endTime;

      // 시작 시간이 종료 시간보다 늦으면 즉시 경고
      if (
        newStartTime &&
        currentEndTime &&
        !validateTimeRange(newStartTime, currentEndTime)
      ) {
        setEditTimeError("종료 시간은 시작 시간보다 늦어야 합니다.");
      }

      // 8시간 초과 시 즉시 경고
      if (
        newStartTime &&
        currentEndTime &&
        !validateDurationWithinLimit(newStartTime, currentEndTime, 480)
      ) {
        setEditTimeError("세션 시간은 최대 8시간까지 설정할 수 있습니다.");
      }

      // 정상 상태면 에러 해제
      if (
        newStartTime &&
        currentEndTime &&
        validateTimeRange(newStartTime, currentEndTime) &&
        validateDurationWithinLimit(newStartTime, currentEndTime, 480)
      ) {
        setEditTimeError("");
      }

      return {
        ...prev,
        startTime: newStartTime,
      };
    });
  };

  // 🆕 수업 편집 모달용 종료 시간 변경 처리 (시작 시간보다 빠르지 않도록)
  const handleEditEndTimeChange = (newEndTime: string) => {
    setEditModalTimeData((prev) => {
      const currentStartTime = prev.startTime;

      // 종료 시간이 시작 시간보다 빠르면 즉시 경고
      if (
        newEndTime &&
        currentStartTime &&
        !validateTimeRange(currentStartTime, newEndTime)
      ) {
        setEditTimeError("종료 시간은 시작 시간보다 늦어야 합니다.");
      }

      // 8시간 초과 시 즉시 경고
      if (
        newEndTime &&
        currentStartTime &&
        !validateDurationWithinLimit(currentStartTime, newEndTime, 480)
      ) {
        setEditTimeError("세션 시간은 최대 8시간까지 설정할 수 있습니다.");
      }

      // 정상 상태면 에러 해제
      if (
        newEndTime &&
        currentStartTime &&
        validateTimeRange(currentStartTime, newEndTime) &&
        validateDurationWithinLimit(currentStartTime, newEndTime, 480)
      ) {
        setEditTimeError("");
      }

      return {
        ...prev,
        endTime: newEndTime,
      };
    });
  };

  // 🆕 학생 입력값 상태 디버깅 및 최적화
  useEffect(() => {
    logger.debug("editStudentInputValue 상태 변경", { editStudentInputValue });
    logger.debug("버튼 활성화 조건", {
      isEnabled: !!editStudentInputValue.trim(),
    });
  }, [editStudentInputValue]);

  // 🆕 세션 편집 모달 상태 (useCallback보다 앞에 선언)
  const [showEditModal, setShowEditModal] = useState(false);
  const [editModalData, setEditModalData] = useState<Session | null>(null);
  const [tempSubjectId, setTempSubjectId] = useState<string>(""); // 🆕 임시 과목 ID
  const [tempEnrollments, setTempEnrollments] = useState<Enrollment[]>([]); // 🆕 임시 enrollment 관리

  // 🆕 학생 입력값 변경 핸들러 최적화
  const handleEditStudentInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      logger.debug("학생 입력값 변경", { value });
      setEditStudentInputValue(value);
    },
    []
  );

  // 🆕 학생 추가 핸들러 최적화
  const handleEditStudentAdd = useCallback(
    (studentId?: string) => {
      logger.debug("handleEditStudentAdd 호출", {
        studentId,
        editStudentInputValue,
      });

      const targetStudentId =
        studentId ||
        students.find(
          (s) => s.name.toLowerCase() === editStudentInputValue.toLowerCase()
        )?.id;

      logger.debug("찾은 학생 ID", { targetStudentId });

      if (!targetStudentId) {
        logger.warn("학생을 찾을 수 없음", {
          inputValue: editStudentInputValue,
        });
        // 존재하지 않는 학생인 경우 입력창을 초기화하지 않고 피드백만 제공
        return;
      }

      // 🆕 학생이 이미 추가되어 있는지 확인
      const isAlreadyAdded = editModalData?.enrollmentIds?.some(
        (enrollmentId: string) => {
          const enrollment = enrollments.find((e) => e.id === enrollmentId);
          return enrollment?.studentId === targetStudentId;
        }
      );

      if (isAlreadyAdded) {
        logger.warn("이미 추가된 학생", { studentId: targetStudentId });
        setEditStudentInputValue("");
        return;
      }

      // enrollment가 있는지 확인하고 없으면 생성
      let enrollment = enrollments.find(
        (e) =>
          e.studentId === targetStudentId &&
          e.subjectId ===
            (() => {
              const firstEnrollment = enrollments.find(
                (e) => e.id === editModalData?.enrollmentIds?.[0]
              );
              return firstEnrollment?.subjectId || "";
            })()
      );

      if (!enrollment) {
        // 🆕 임시 enrollment 객체를 생성하여 tempEnrollments에 추가
        enrollment = {
          id: crypto.randomUUID(),
          studentId: targetStudentId,
          subjectId: (() => {
            const firstEnrollment = enrollments.find(
              (e) => e.id === editModalData?.enrollmentIds?.[0]
            );
            return firstEnrollment?.subjectId || "";
          })(),
        };

        // 🆕 임시 enrollment를 tempEnrollments에 추가
        setTempEnrollments((prev) => [...prev, enrollment!]);
      }

      // enrollmentIds에 추가 (최대 14명 제한)
      if (
        editModalData &&
        !editModalData.enrollmentIds?.includes(enrollment.id)
      ) {
        // 🆕 최대 14명 제한 확인
        const currentCount = editModalData.enrollmentIds?.length || 0;
        if (currentCount >= 14) {
          alert("최대 14명까지 추가할 수 있습니다.");
          return;
        }

        // 🆕 모달 상태만 업데이트 (실제 세션 데이터는 저장 버튼에서 업데이트)
        setEditModalData((prev: Session | null) =>
          prev
            ? {
                ...prev,
                enrollmentIds: [...(prev.enrollmentIds || []), enrollment!.id],
              }
            : null
        );
        // 성공적으로 추가된 경우에만 입력창 초기화
        setEditStudentInputValue("");
      }
    },
    [editStudentInputValue, students, enrollments, editModalData]
  );

  // 🆕 학생 추가 핸들러 최적화
  const handleEditStudentAddClick = useCallback(() => {
    logger.debug("학생 추가 버튼 클릭");
    handleEditStudentAdd();
  }, [handleEditStudentAdd]);

  // 🆕 학생 추가 함수 (최대 14명 제한)
  const addStudent = (studentId: string) => {
    if (!groupModalData.studentIds.includes(studentId)) {
      // 🆕 최대 14명 제한 확인
      if (groupModalData.studentIds.length >= 14) {
        alert("최대 14명까지 추가할 수 있습니다.");
        return;
      }

      setGroupModalData((prev) => ({
        ...prev,
        studentIds: [...prev.studentIds, studentId],
      }));
    }
    setStudentInputValue("");
  };

  // 🆕 학생 제거 함수
  const removeStudent = (studentId: string) => {
    setGroupModalData((prev) => ({
      ...prev,
      studentIds: prev.studentIds.filter((id) => id !== studentId),
    }));
  };

  // 🆕 입력창에서 학생 추가 함수 (최대 14명 제한)
  const addStudentFromInput = () => {
    const trimmedValue = studentInputValue.trim();
    if (!trimmedValue) return;

    // 정확한 이름으로 학생 찾기
    const student = students.find((s) => s.name === trimmedValue);
    if (student && !groupModalData.studentIds.includes(student.id)) {
      // 🆕 최대 14명 제한 확인
      if (groupModalData.studentIds.length >= 14) {
        alert("최대 14명까지 추가할 수 있습니다.");
        return;
      }
      addStudent(student.id);
    }
  };

  // 🆕 입력창 키보드 이벤트 처리
  const handleStudentInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addStudentFromInput();
      // 🆕 입력창 완전 초기화 (이중 보장)
      setStudentInputValue("");
    }
  };

  // 🆕 그룹 수업 추가 함수
  const addGroupSession = async (data: GroupSessionData) => {
    logger.debug("addGroupSession 시작", { data });

    // 시간 유효성 검사
    if (!validateTimeRange(data.startTime, data.endTime)) {
      logger.warn("시간 유효성 검사 실패", {
        startTime: data.startTime,
        endTime: data.endTime,
      });
      setGroupTimeError("종료 시간은 시작 시간보다 늦어야 합니다.");
      return;
    }
    // 8시간 제한 검증
    if (!validateDurationWithinLimit(data.startTime, data.endTime, 480)) {
      setGroupTimeError("세션 시간은 최대 8시간까지 설정할 수 있습니다.");
      return;
    }
    setGroupTimeError("");
    logger.debug("시간 유효성 검사 통과");

    // 🆕 과목 선택 검증
    if (!data.subjectId) {
      logger.warn("과목 선택 검증 실패");
      alert("과목을 선택해주세요.");
      return;
    }
    logger.debug("과목 선택 검증 통과");

    // 🆕 학생 선택 검증
    if (!data.studentIds || data.studentIds.length === 0) {
      logger.warn("학생 선택 검증 실패");
      alert("학생을 선택해주세요.");
      return;
    }
    logger.debug("학생 선택 검증 통과");

    logger.debug("addSession 호출 시작", {
      subjectId: data.subjectId,
      studentIds: data.studentIds,
      startTime: data.startTime,
      endTime: data.endTime,
    });

    try {
      logger.debug("addSession 함수 호출 중");
      await addSession({
        studentIds: data.studentIds,
        subjectId: data.subjectId,
        weekday: data.weekday,
        startTime: data.startTime,
        endTime: data.endTime,
        room: data.room,
        yPosition: data.yPosition || 1, // 🆕 yPosition 추가
      });
      logger.debug("addSession 함수 완료");

      logger.debug("모달 닫기 중");
      setShowGroupModal(false);
      logger.debug("세션 추가 완료");
    } catch (error) {
      logger.error("세션 추가 실패", undefined, error as Error);
      alert("세션 추가에 실패했습니다.");
    }
  };

  // 🆕 그룹 수업 모달 열기
  const openGroupModal = (
    weekday: number,
    time: string,
    yPosition?: number
  ) => {
    logger.debug("그룹 수업 모달 열기", { weekday, time, yPosition });
    setGroupModalData({
      studentIds: [], // 빈 배열로 초기화
      subjectId: "",
      weekday,
      startTime: time,
      endTime: getNextHour(time),
      yPosition: yPosition || 1, // 🆕 yPosition 추가
    });
    setShowGroupModal(true);
    logger.debug("모달 상태 설정 완료", { showGroupModal: true });
  };

  // 🆕 시작 시간 변경 처리 (종료 시간보다 늦지 않도록)
  const handleStartTimeChange = (newStartTime: string) => {
    setGroupModalData((prev) => {
      const currentEndTime = prev.endTime;

      // 시작 시간이 종료 시간보다 늦으면 경고만 표시하고 자동 조정하지 않음
      if (
        newStartTime &&
        currentEndTime &&
        !validateTimeRange(newStartTime, currentEndTime)
      ) {
        // 경고 메시지 표시 (선택사항)
        console.warn(
          "시작 시간이 종료 시간보다 늦습니다. 시간을 확인해주세요."
        );
      }

      return {
        ...prev,
        startTime: newStartTime,
      };
    });
  };

  // 🆕 종료 시간 변경 처리 (시작 시간보다 빠르지 않도록)
  const handleEndTimeChange = (newEndTime: string) => {
    setGroupModalData((prev) => {
      const currentStartTime = prev.startTime;

      // 종료 시간이 시작 시간보다 빠르면 경고만 표시하고 자동 조정하지 않음
      if (
        newEndTime &&
        currentStartTime &&
        !validateTimeRange(currentStartTime, newEndTime)
      ) {
        // 경고 메시지 표시 (선택사항)
        console.warn(
          "종료 시간이 시작 시간보다 빠릅니다. 시간을 확인해주세요."
        );
      }

      return {
        ...prev,
        endTime: newEndTime,
      };
    });
  };

  // 🆕 드래그 앤 드롭 처리
  const handleDrop = (
    weekday: number,
    time: string,
    enrollmentId: string,
    yPosition?: number
  ) => {
    logger.debug("handleDrop 호출됨", {
      weekday,
      time,
      enrollmentId,
      yPosition,
    });

    // 🆕 학생 드래그 상태 리셋 (드롭 시)
    setIsStudentDragging(false);

    // 학생 ID인지 확인 (enrollment가 없는 경우)
    if (enrollmentId.startsWith("student:")) {
      const studentId = enrollmentId.replace("student:", "");
      logger.debug("학생 ID로 드롭됨", { studentId });

      // 학생 정보 찾기
      const student = students.find((s) => s.id === studentId);
      if (!student) {
        logger.warn("학생을 찾을 수 없음", { studentId });
        return;
      }

      logger.debug("그룹 수업 모달 데이터 설정 (학생 ID)", {
        studentId,
        weekday,
        startTime: time,
        endTime: getNextHour(time),
        yPosition: yPosition || 1,
      });

      // 🆕 그룹 수업 모달 열기 (과목은 선택되지 않은 상태)
      setGroupModalData({
        studentIds: [studentId],
        subjectId: "", // 과목은 선택되지 않은 상태
        weekday,
        startTime: time,
        endTime: getNextHour(time),
        yPosition: yPosition || 1, // 🆕 yPosition 추가
      });

      logger.debug("showGroupModal을 true로 설정");
      setShowGroupModal(true);

      // 디버깅을 위한 상태 확인
      setTimeout(() => {
        logger.debug("모달 상태 확인", {
          showGroupModal: true,
          groupModalData: {
            studentIds: [studentId],
            subjectId: "",
            weekday,
            startTime: time,
            endTime: getNextHour(time),
          },
        });
      }, 100);

      return;
    }

    // 기존 enrollment 처리
    const enrollment = enrollments.find((e) => e.id === enrollmentId);
    logger.debug("찾은 enrollment", { enrollment });

    if (!enrollment) {
      logger.warn("enrollment를 찾을 수 없음", { enrollmentId });
      return;
    }

    logger.debug("그룹 수업 모달 데이터 설정", {
      studentId: enrollment.studentId,
      subjectId: enrollment.subjectId,
      weekday,
      startTime: time,
      endTime: getNextHour(time),
      yPosition: yPosition || 1,
    });

    // 🆕 그룹 수업 모달 열기 (과목은 선택되지 않은 상태)
    setGroupModalData({
      studentIds: [enrollment.studentId], // 배열로 변경
      subjectId: "", // 과목은 선택되지 않은 상태로 초기화
      weekday,
      startTime: time,
      endTime: getNextHour(time),
      yPosition: yPosition || 1, // 🆕 yPosition 추가
    });

    logger.debug("showGroupModal을 true로 설정");
    setShowGroupModal(true);

    // 🆕 드래그 상태 강제 해제
    setTimeout(() => {
      // 모든 드래그 이벤트 강제 종료
      const dragEndEvent = new DragEvent("dragend", {
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(dragEndEvent);

      // 마우스 업 이벤트 강제 발생
      const mouseUpEvent = new MouseEvent("mouseup", {
        bubbles: true,
        cancelable: true,
        clientX: 0,
        clientY: 0,
      });
      document.dispatchEvent(mouseUpEvent);

      logger.debug("드래그 상태 강제 해제 완료");
    }, 100);

    logger.debug("handleDrop 완료");
  };

  // 🆕 세션 드롭 핸들러 (드래그 앤 드롭으로 세션 이동)
  const handleSessionDrop = async (
    sessionId: string,
    weekday: number,
    time: string,
    yPosition: number
  ) => {
    logger.debug("Schedule 페이지 세션 드롭 처리", {
      sessionId,
      weekday,
      time,
      yPosition,
    });

    try {
      // 세션 위치 업데이트
      logger.debug("updateSessionPosition 호출 시작", { sessionId });
      await updateSessionPosition(sessionId, weekday, time, yPosition);
      logger.debug("세션 위치 업데이트 완료", { sessionId });
    } catch (error) {
      logger.error("세션 위치 업데이트 실패", { sessionId }, error as Error);
      alert("세션 이동에 실패했습니다.");
    }
  };

  // 🆕 빈 공간 클릭 처리
  const handleEmptySpaceClick = (
    weekday: number,
    time: string,
    yPosition?: number
  ) => {
    logger.debug("빈 공간 클릭됨", { weekday, time, yPosition });
    openGroupModal(weekday, time, yPosition);
  };

  // 🆕 세션 클릭 처리
  const handleSessionClick = (session: Session) => {
    logger.debug("세션 클릭됨", {
      sessionId: session.id,
      startsAt: session.startsAt,
      endsAt: session.endsAt,
      enrollmentIds: session.enrollmentIds,
    });

    setEditModalData(session);
    setEditModalTimeData({
      startTime: session.startsAt,
      endTime: session.endsAt,
    });
    // 🆕 임시 과목 ID 초기화
    const firstEnrollment = enrollments.find(
      (e) => e.id === session.enrollmentIds?.[0]
    );
    setTempSubjectId(firstEnrollment?.subjectId || "");
    setTempEnrollments([]); // 🆕 임시 enrollment 초기화
    setShowEditModal(true);

    logger.debug("편집 모달 열림", {
      editModalData: session,
      editModalTimeData: {
        startTime: session.startsAt,
        endTime: session.endsAt,
      },
      tempSubjectId: firstEnrollment?.subjectId || "",
    });
  };

  // 🆕 PDF 다운로드 처리
  const timeTableRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // 🆕 학생 드래그 상태 관리
  const [isStudentDragging, setIsStudentDragging] = useState(false);

  // 드래그 시작 처리
  const handleDragStart = (e: React.DragEvent, student: Student) => {
    logger.debug("학생 드래그 시작", { studentName: student.name });

    // 🆕 학생 드래그 상태 설정
    setIsStudentDragging(true);

    // 해당 학생의 첫 번째 enrollment ID를 찾아서 전달
    const studentEnrollment = enrollments.find(
      (enrollment) => enrollment.studentId === student.id
    );
    if (studentEnrollment) {
      logger.debug("드래그 시작 - enrollment ID 전달", {
        enrollmentId: studentEnrollment.id,
      });
      e.dataTransfer.setData("text/plain", studentEnrollment.id);
    } else {
      logger.debug("드래그 시작 - 학생 ID 전달 (enrollment 없음)", {
        studentId: student.id,
      });
      // enrollment가 없으면 학생 ID를 직접 전달
      e.dataTransfer.setData("text/plain", `student:${student.id}`);
    }
    e.dataTransfer.effectAllowed = "copy"; // 🆕 이미 "copy"로 설정되어 있음

    // 🆕 학생 패널의 드래그 상태 리셋 (학생 드래그 시 패널 드래그 방지)
    studentPanelState.resetDragState();
  };

  // 🆕 드래그 종료 처리
  const handleDragEnd = (e: React.DragEvent) => {
    logger.debug("학생 드래그 종료", { dropEffect: e.dataTransfer.dropEffect });

    // 🆕 학생 드래그 상태 리셋
    setIsStudentDragging(false);

    // 🆕 학생 패널의 드래그 상태 리셋 (드래그 종료 시 패널 드래그 상태 정리)
    studentPanelState.resetDragState();
  };

  return (
    <div className="timetable-container" style={{ padding: 16 }}>
      <div className={styles.pageHeader}>
        <h2>주간 시간표</h2>
        {dataLoading && (
          <div style={{ color: "var(--color-blue-500)", fontSize: "14px" }}>
            {error
              ? "데이터 로드 중 오류가 발생했습니다."
              : "세션 데이터를 로드 중..."}
          </div>
        )}
        {error && (
          <div
            style={{
              color: "var(--color-red-500)",
              fontSize: "14px",
              backgroundColor: "var(--color-red-50)",
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1px solid var(--color-red-200)",
              marginTop: "8px",
            }}
          >
            ⚠️ {error}
            <br />
            <small style={{ color: "var(--color-gray-600)" }}>
              로컬 데이터로 계속 작업할 수 있습니다.
            </small>
          </div>
        )}
      </div>
      {selectedStudentId ? (
        <p style={{ color: "var(--color-gray-500)" }}>
          {students.find((s) => s.id === selectedStudentId)?.name} 학생의
          시간표입니다. 다른 학생을 선택하거나 선택 해제하여 전체 시간표를 볼 수
          있습니다.
        </p>
      ) : (
        <p style={{ color: "var(--color-gray-500)" }}>
          전체 학생의 시간표입니다. 수강생 리스트에서 학생을 선택하면 해당
          학생의 시간표만 볼 수 있습니다.
        </p>
      )}

      {/* PDF 다운로드 버튼 */}
      <PDFDownloadButton
        timeTableRef={timeTableRef}
        selectedStudent={students.find((s) => s.id === selectedStudentId)}
        isDownloading={isDownloading}
        onDownloadStart={() => setIsDownloading(true)}
        onDownloadEnd={() => setIsDownloading(false)}
      />

      {/* 🆕 시간표 그리드 */}
      <div ref={timeTableRef}>
        <TimeTableGrid
          sessions={displaySessions}
          subjects={subjects}
          enrollments={enrollments}
          students={students}
          onSessionClick={handleSessionClick}
          onDrop={handleDrop}
          onSessionDrop={handleSessionDrop} // 🆕 세션 드롭 핸들러 전달
          onEmptySpaceClick={handleEmptySpaceClick}
          selectedStudentId={selectedStudentId} // 🆕 선택된 학생 ID 전달
          isStudentDragging={isStudentDragging} // 🆕 학생 드래그 상태 전달
        />
      </div>

      {/* 🆕 학생 패널 */}
      <StudentPanel
        selectedStudentId={selectedStudentId}
        panelState={studentPanelState}
        onMouseDown={studentPanelState.handleMouseDown}
        onStudentClick={studentPanelState.handleStudentClick}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd} // 🆕 드래그 종료 핸들러 추가
        onSearchChange={studentPanelState.setSearchQuery}
      />

      {/* 그룹 수업 추가 모달 (분리) */}
      <GroupSessionModal
        isOpen={showGroupModal}
        groupModalData={groupModalData}
        setShowGroupModal={setShowGroupModal}
        removeStudent={removeStudent}
        studentInputValue={studentInputValue}
        setStudentInputValue={setStudentInputValue}
        handleStudentInputKeyDown={handleStudentInputKeyDown}
        addStudentFromInput={addStudentFromInput}
        filteredStudentsForModal={filteredStudentsForModal}
        addStudent={addStudent}
        subjects={subjects}
        students={students}
        weekdays={weekdays}
        handleStartTimeChange={handleStartTimeChange}
        handleEndTimeChange={handleEndTimeChange}
        groupTimeError={groupTimeError}
        addGroupSession={addGroupSession}
      />

      {/* 세션 편집 모달 (분리) */}
      <EditSessionModal
        isOpen={Boolean(showEditModal && editModalData)}
        selectedStudents={(() => {
          const allEnrollments = [...enrollments, ...tempEnrollments];
          const selected =
            editModalData?.enrollmentIds
                          ?.map((enrollmentId) => {
                const enrollment = allEnrollments.find((e) => e.id === enrollmentId);
                            if (!enrollment) return null;
                const student = students.find((s) => s.id === enrollment.studentId);
                return student ? { id: student.id, name: student.name } : null;
                          })
                          .filter(Boolean) || [];
          return selected as { id: string; name: string }[];
                    })()}
        onRemoveStudent={(studentId) => {
          const allEnrollments = [...enrollments, ...tempEnrollments];
          const updatedEnrollmentIds = editModalData?.enrollmentIds?.filter((id) => {
            const enrollment = allEnrollments.find((e) => e.id === id);
            return enrollment?.studentId !== studentId;
          });
          setTempEnrollments((prev) => prev.filter((e) => e.studentId !== studentId));
          setEditModalData((prev) => (prev ? { ...prev, enrollmentIds: updatedEnrollmentIds || [] } : null));
        }}
        editStudentInputValue={editStudentInputValue}
        onEditStudentInputChange={(value) => {
          logger.debug("학생 입력값 변경", { value });
          setEditStudentInputValue(value);
        }}
        onEditStudentInputKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          logger.debug("Enter 키로 학생 추가 시도");
                          handleEditStudentAdd();
                          setEditStudentInputValue("");
                        }
                      }}
        onAddStudentClick={handleEditStudentAddClick}
        editSearchResults={(() => {
          if (!editModalData) return [] as { id: string; name: string }[];
          return students
            .filter((student) =>
              student.name.toLowerCase().includes(editStudentInputValue.toLowerCase()) &&
              !editModalData.enrollmentIds?.some((enrollmentId) => {
                const enrollment = enrollments.find((e) => e.id === enrollmentId);
                                return enrollment?.studentId === student.id;
              })
            )
            .map((s) => ({ id: s.id, name: s.name }));
                      })()}
        onSelectSearchStudent={(studentId) => handleEditStudentAdd(studentId)}
        subjects={subjects.map((s) => ({ id: s.id, name: s.name }))}
        tempSubjectId={tempSubjectId}
        onSubjectChange={(subjectId) => setTempSubjectId(subjectId)}
        weekdays={weekdays}
        defaultWeekday={editModalData?.weekday ?? 0}
        startTime={editModalTimeData.startTime}
        endTime={editModalTimeData.endTime}
        onStartTimeChange={handleEditStartTimeChange}
        onEndTimeChange={handleEditEndTimeChange}
        timeError={editTimeError}
        onDelete={async () => {
          if (editModalData && confirm("정말로 이 수업을 삭제하시겠습니까?")) {
                      try {
                        await deleteSession(editModalData.id);
                        setShowEditModal(false);
                        logger.debug("세션 삭제 완료");
                      } catch (error) {
                        console.error("세션 삭제 실패:", error);
                        alert("세션 삭제에 실패했습니다.");
                      }
                    }
                  }}
        onCancel={() => {
                      setShowEditModal(false);
          setTempSubjectId("");
        }}
        onSave={async () => {
          if (!editModalData) return;
          const weekday = Number((document.getElementById("edit-modal-weekday") as HTMLSelectElement)?.value);
                      const startTime = editModalTimeData.startTime;
                      const endTime = editModalTimeData.endTime;
                      if (!startTime || !endTime) return;
                      if (!validateTimeRange(startTime, endTime)) {
            window.dispatchEvent(new CustomEvent("toast", { detail: { type: "error", message: "종료 시간은 시작 시간보다 늦어야 합니다." } }));
                        return;
                      }
          if (!validateDurationWithinLimit(startTime, endTime, 480)) {
            window.dispatchEvent(new CustomEvent("toast", { detail: { type: "error", message: "세션 시간은 최대 8시간까지 설정할 수 있습니다." } }));
            return;
          }
                      try {
                        if (tempEnrollments.length > 0) {
                          for (const tempEnrollment of tempEnrollments) {
                await addEnrollment(tempEnrollment.studentId, tempEnrollment.subjectId);
                          }
                        }
                        const updatedData = getClassPlannerData();
                        const allEnrollments = updatedData.enrollments;
                        const currentEnrollmentIds =
              editModalData.enrollmentIds?.filter((enrollmentId) => allEnrollments.some((e) => e.id === enrollmentId)) || [];
                        for (const tempEnrollment of tempEnrollments) {
                          const realEnrollment = allEnrollments.find(
                (e) => e.studentId === tempEnrollment.studentId && e.subjectId === tempEnrollment.subjectId
                          );
              if (realEnrollment && !currentEnrollmentIds.includes(realEnrollment.id)) {
                            currentEnrollmentIds.push(realEnrollment.id);
                          }
                        }
                        const currentStudentIds = currentEnrollmentIds
              .map((enrollmentId) => allEnrollments.find((e) => e.id === enrollmentId)?.studentId)
                          .filter(Boolean) as string[];
                        const currentSubjectId = tempSubjectId;
                        await updateSession(editModalData.id, {
              enrollmentIds: currentEnrollmentIds,
                          studentIds: currentStudentIds,
                          subjectId: currentSubjectId,
                          weekday,
                          startTime,
                          endTime,
                          room: editModalData.room,
                        });
                        setShowEditModal(false);
            setTempSubjectId("");
            setTempEnrollments([]);
                        logger.debug("세션 업데이트 완료");
                      } catch (error) {
                        console.error("세션 업데이트 실패:", error);
                        alert("세션 업데이트에 실패했습니다.");
                      }
                    }}
      />
    </div>
  );
}
