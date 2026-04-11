"use client";

/**
 * SchedulePage
 *
 * 파일 구성 가이드 (읽기 순서 권장):
 * 1) Imports & Constants
 * 2) Public Component Entrypoint (SchedulePage)
 * 3) Container Component (SchedulePageContent)
 *    3-1) Data hooks & perf hooks
 *    3-2) Local UI states
 *    3-3) Core callbacks (addSession / updateSession)
 *    3-4) Collision helpers (isTimeOverlapping, findCollidingSessions, ...)
 *    3-5) DnD handlers & UI event handlers
 *    3-6) Modal wiring (GroupSessionModal / EditSessionModal)
 *    3-7) Render
 *
 * 주의: 본 리팩토링은 비기능적(가독성) 수정으로, 로직 변경 없음
 */

import { SESSION_CELL_HEIGHT } from "@/shared/constants/sessionConstants";
import type { JSX } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AuthGuard from "../../components/atoms/AuthGuard";
import { useDisplaySessions } from "../../hooks/useDisplaySessions";
import { useIntegratedDataLocal } from "../../hooks/useIntegratedDataLocal";
import { useLocal } from "../../hooks/useLocal";
import { useStudentManagementLocal } from "../../hooks/useStudentManagementLocal";
import { usePerformanceMonitoring } from "../../hooks/usePerformanceMonitoring";
import { useStudentPanel } from "../../hooks/useStudentPanel";
import { useTimeValidation } from "../../hooks/useTimeValidation";
import { getClassPlannerData } from "../../lib/localStorageCrud";
import { logger } from "../../lib/logger";
import type { Session, Student } from "../../lib/planner";
import { minutesToTime, timeToMinutes, weekdays } from "../../lib/planner";
import { repositionSessions as repositionSessionsUtil } from "../../lib/sessionCollisionUtils";
import type { GroupSessionData } from "../../types/scheduleTypes";
import { supabase } from "../../utils/supabaseClient";
import EditSessionModal from "./_components/EditSessionModal";
import GroupSessionModal from "./_components/GroupSessionModal";
import PdfDownloadSection from "./_components/PdfDownloadSection";
import ScheduleGridSection from "./_components/ScheduleGridSection";
import ScheduleHeader from "./_components/ScheduleHeader";
import StudentPanelSection from "./_components/StudentPanelSection";
import {
  DEFAULT_GROUP_SESSION_DATA,
  ERROR_MESSAGES,
  MAX_SESSION_DURATION_MINUTES,
} from "./_constants/scheduleConstants";
import { useEditModalState } from "./_hooks/useEditModalState";
import { useUiState } from "./_hooks/useUiState";
import { isTimeOverlapping } from "./_utils/collisionHelpers";
import {
  checkCollisionsAtYPositionImpl,
  findCollidingSessionsImpl,
} from "./_utils/collisionQueries";
import {
  buildHandleDrop,
  buildHandleSessionClick,
  buildHandleSessionDrop,
  buildOpenGroupModalHandler,
  onDragEndStudent,
  onDragStartStudent,
} from "./_utils/dndHelpers";
import {
  buildEditOnCancel,
  buildEditOnDelete,
  buildEditOnSave,
} from "./_utils/editSaveHandlers";
import {
  buildEditStudentAdd,
  buildEditStudentAddClick,
  buildEditStudentInputChange,
} from "./_utils/editStudentHandlers";
import {
  buildEditTimeChangeHandlers,
  buildGroupTimeChangeHandlers,
} from "./_utils/modalHandlers";
import {
  buildSelectedStudents,
  filterEditableStudents,
  removeStudentFromEnrollmentIds,
} from "./_utils/scheduleSelectors";
import {
  buildSessionSaveData,
  ensureEnrollmentIdsForSubject,
  extractStudentIds,
  processTempEnrollments,
} from "./_utils/sessionSaveUtils";

/**
 * 페이지 엔트리 컴포넌트
 * 인증 가드로 감싼 스케줄 페이지 컨테이너를 노출합니다.
 */
export default function SchedulePage(): JSX.Element {
  return (
    <AuthGuard requireAuth={true}>
      <SchedulePageContent />
    </AuthGuard>
  );
}

/**
 * 스케줄 페이지 컨테이너
 * 데이터 훅 바인딩, 콜백 정의, 모달/그리드/패널을 연결합니다.
 */
function SchedulePageContent(): JSX.Element {
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

  // ================================
  // 🧩 로컬 타입 (가독성 향상용)
  // ================================
  type SessionCreateInput = {
    subjectId: string;
    studentIds: string[];
    weekday: number;
    startTime: string;
    endTime: string;
    yPosition?: number;
    room?: string;
  };

  type SessionUpdateInput = {
    startTime?: string;
    endTime?: string;
    weekday?: number;
    room?: string;
    yPosition?: number;
    subjectId?: string;
    studentIds?: string[];
  };

  const [selectedStudentId, setSelectedStudentId] = useLocal<string>(
    "ui:selectedStudent",
    ""
  );

  // ================================
  // 🧩 핵심 콜백: 세션 추가
  // ================================
  /**
   * 세션을 추가하고, 생성된 enrollment와 함께 업데이트합니다.
   * 이후 충돌 재배치를 비동기 사이클에 수행합니다.
   */
  const addSession = useCallback(
    async (sessionData: SessionCreateInput) => {
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

  // ================================
  // 🧩 핵심 콜백: 세션 업데이트
  // ================================
  /**
   * 지정된 세션의 시간/속성을 갱신하고, 동일 요일 내에서 충돌 재배치를 수행합니다.
   */
  const updateSession = useCallback(
    async (sessionId: string, sessionData: SessionUpdateInput) => {
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
      const targetStartTime = (target?.startsAt ?? sessionData.startTime) || "";
      const targetEndTime = (target?.endsAt ?? sessionData.endTime) || "";
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

  // ================================
  // 🎯 드래그 앤 드롭 / 충돌 처리 섹션
  // ================================

  // 🆕 시간 충돌 감지: 유틸로 추출 (useCallback 불필요)

  // 🆕 특정 요일과 시간대에서 충돌하는 세션들 찾기
  const findCollidingSessions = useCallback(
    (
      weekday: number,
      startTime: string,
      endTime: string,
      excludeSessionId?: string
    ): Session[] =>
      findCollidingSessionsImpl(
        sessions,
        weekday,
        startTime,
        endTime,
        excludeSessionId
      ),
    [sessions]
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
      checkWithPriorityLevel1: boolean = false
    ): boolean =>
      checkCollisionsAtYPositionImpl(
        targetDaySessions as unknown as Map<number, any[]>,
        yPosition,
        targetStartTime,
        targetEndTime,
        checkWithPriorityLevel1
      ),
    []
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

  // ================================
  // 🎯 세션 위치 업데이트 섹션
  // ================================

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

  const {
    validateTimeRange,
    validateDurationWithinLimit,
    getNextHour,
    validateAndToastGroup,
    validateAndToastEdit,
  } = useTimeValidation();

  // 🆕 그룹 수업 모달 상태
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupModalData, setGroupModalData] = useState<GroupSessionData>({
    ...DEFAULT_GROUP_SESSION_DATA,
    yPosition: 1, // 🆕 기본값 1
  });
  const [groupTimeError, setGroupTimeError] = useState<string>(""); // 시간 입력 에러 메시지

  // 학생 생성 훅 (모달에서 신규 학생 추가 시 사용)
  const { addStudent: createStudent } = useStudentManagementLocal();

  // 🆕 학생 입력 관련 상태
  const [studentInputValue, setStudentInputValue] = useState("");
  const [studentCreating, setStudentCreating] = useState(false);
  const [studentCreateError, setStudentCreateError] = useState<string>("");

  // 🆕 모달용 학생 검색 결과
  const filteredStudentsForModal = useMemo(() => {
    if (!studentInputValue.trim()) return [];
    return students.filter((student) =>
      student.name.toLowerCase().includes(studentInputValue.toLowerCase())
    );
  }, [students, studentInputValue]);

  // 🆕 편집 모달 상태 훅 사용
  const {
    showEditModal,
    setShowEditModal,
    editModalData,
    setEditModalData,
    tempSubjectId,
    setTempSubjectId,
    tempEnrollments,
    setTempEnrollments,
    editStudentInputValue,
    setEditStudentInputValue,
    editModalTimeData,
    setEditModalTimeData,
    editTimeError,
    setEditTimeError,
  } = useEditModalState();

  // 🆕 수업 편집 모달 시간 변경 핸들러 (헬퍼 적용)
  const { handleEditStartTimeChange, handleEditEndTimeChange } = useMemo(
    () =>
      buildEditTimeChangeHandlers({
        validateTimeRange,
        validateDurationWithinLimit,
        maxMinutes: MAX_SESSION_DURATION_MINUTES,
        setEditModalTimeData,
        setEditTimeError,
        endBeforeStartMsg: ERROR_MESSAGES.END_TIME_BEFORE_START,
        tooLongMsg: ERROR_MESSAGES.SESSION_TOO_LONG,
      }),
    [
      validateTimeRange,
      validateDurationWithinLimit,
      MAX_SESSION_DURATION_MINUTES,
      setEditModalTimeData,
      setEditTimeError,
    ]
  );

  // 🆕 학생 입력값 상태 디버깅 및 최적화
  useEffect(() => {
    logger.debug("editStudentInputValue 상태 변경", { editStudentInputValue });
    logger.debug("버튼 활성화 조건", {
      isEnabled: !!editStudentInputValue.trim(),
    });
  }, [editStudentInputValue]);

  // (훅으로 대체됨)

  // ================================
  // 🎯 모달 제어 / 학생 관리 섹션
  // ================================

  // 🆕 학생 입력값 변경 핸들러 최적화
  const handleEditStudentInputChange = useMemo(
    () => buildEditStudentInputChange(setEditStudentInputValue),
    [setEditStudentInputValue]
  );

  // 🆕 학생 추가 핸들러 최적화
  const handleEditStudentAdd = useMemo(
    () =>
      buildEditStudentAdd({
        students,
        enrollments,
        editModalData,
        getEditStudentInputValue: () => editStudentInputValue,
        setEditStudentInputValue,
        setTempEnrollments,
        setEditModalData,
      }),
    [
      students,
      enrollments,
      editModalData,
      editStudentInputValue,
      setEditStudentInputValue,
    ]
  );

  // 🆕 학생 추가 핸들러 최적화
  const handleEditStudentAddClick = useMemo(
    () => buildEditStudentAddClick(handleEditStudentAdd),
    [handleEditStudentAdd]
  );

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
    setStudentCreateError("");
  };

  // 🆕 신규 학생 생성 함수 (B-1: 이름만, 성별 미설정)
  const handleCreateStudentFromInput = async () => {
    const trimmed = studentInputValue.trim();
    if (!trimmed) return;

    setStudentCreating(true);
    setStudentCreateError("");

    try {
      const success = await createStudent(trimmed);
      if (success) {
        // 생성 성공 후 localStorage에서 새 학생 ID 조회
        const data = getClassPlannerData();
        const newStudent = data.students.find(
          (s) => s.name.trim() === trimmed
        );
        if (newStudent) {
          addStudent(newStudent.id);
        }
      } else {
        setStudentCreateError("이미 존재하는 이름입니다.");
      }
    } catch {
      setStudentCreateError("학생 생성에 실패했습니다.");
    } finally {
      setStudentCreating(false);
    }
  };

  // 🆕 학생 제거 함수
  const removeStudent = (studentId: string) => {
    setGroupModalData((prev) => ({
      ...prev,
      studentIds: prev.studentIds.filter((id) => id !== studentId),
    }));
  };

  // 🆕 입력창에서 학생 추가 함수
  const addStudentFromInput = () => {
    const trimmedValue = studentInputValue.trim();
    if (!trimmedValue) return;

    // 정확한 이름으로 기존 학생 찾기
    const student = students.find(
      (s) => s.name.toLowerCase() === trimmedValue.toLowerCase()
    );
    if (student && !groupModalData.studentIds.includes(student.id)) {
      // 🆕 최대 14명 제한 확인
      if (groupModalData.studentIds.length >= 14) {
        alert("최대 14명까지 추가할 수 있습니다.");
        return;
      }
      addStudent(student.id);
    } else if (!student) {
      // 일치하는 학생 없으면 신규 생성 플로우로 위임
      handleCreateStudentFromInput();
    }
  };

  // 🆕 입력창 키보드 이벤트 처리
  const handleStudentInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addStudentFromInput();
      // 입력 초기화는 addStudent/handleCreateStudentFromInput 성공 시에만 수행
    }
  };

  // 🆕 입력값 변경 시 에러 초기화
  useEffect(() => {
    if (studentCreateError) {
      setStudentCreateError("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentInputValue]);

  // 🆕 그룹 수업 추가 함수
  const addGroupSession = async (data: GroupSessionData) => {
    logger.debug("addGroupSession 시작", { data });

    // 시간 유효성 검사 (그룹 모달용)
    if (
      !validateAndToastGroup(data.startTime, data.endTime, setGroupTimeError)
    ) {
      return;
    }
    setGroupTimeError("");
    logger.debug("시간 유효성 검사 통과");

    // 🆕 과목 선택 검증
    if (!data.subjectId) {
      logger.warn("과목 선택 검증 실패");
      alert(ERROR_MESSAGES.SUBJECT_NOT_SELECTED);
      return;
    }
    logger.debug("과목 선택 검증 통과");

    // 🆕 학생 선택 검증
    if (!data.studentIds || data.studentIds.length === 0) {
      logger.warn("학생 선택 검증 실패");
      alert(ERROR_MESSAGES.STUDENT_NOT_SELECTED);
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
  const openGroupModal = useMemo(
    () =>
      buildOpenGroupModalHandler(
        setGroupModalData,
        setShowGroupModal,
        getNextHour
      ),
    [setGroupModalData, setShowGroupModal, getNextHour]
  );

  // 🆕 그룹 모달 시간 변경 핸들러 (헬퍼 적용)
  const { handleStartTimeChange, handleEndTimeChange } = useMemo(
    () => buildGroupTimeChangeHandlers(validateTimeRange, setGroupModalData),
    [validateTimeRange, setGroupModalData]
  );

  // 🆕 UI 상태 훅
  const {
    isStudentDragging,
    setIsStudentDragging,
    gridVersion,
    setGridVersion,
  } = useUiState();

  // 🆕 드래그 앤 드롭 처리 (헬퍼 빌더로 교체)
  const handleDrop = useMemo(() => {
    // setIsStudentDragging 선언 이후에 클로저가 캡처되도록 지연 생성
    return buildHandleDrop({
      students,
      enrollments,
      setIsStudentDragging,
      setGroupModalData,
      setShowGroupModal,
      getNextHour,
    });
  }, [
    students,
    enrollments,
    setIsStudentDragging,
    setGroupModalData,
    setShowGroupModal,
    getNextHour,
  ]);

  // 🆕 세션 드롭 핸들러 (헬퍼 빌더 적용)
  const handleSessionDrop = useMemo(() => {
    return buildHandleSessionDrop({
      updateSessionPosition,
      // setGridVersion는 함수 식별자이므로 선언 위치와 무관하게 안전하게 참조 가능
      setGridVersion,
    });
  }, [updateSessionPosition]);

  // 🆕 빈 공간 클릭 처리
  const handleEmptySpaceClick = (
    weekday: number,
    time: string,
    yPosition?: number
  ) => {
    logger.debug("빈 공간 클릭됨", { weekday, time, yPosition });
    openGroupModal(weekday, time, yPosition);
  };

  // 🆕 세션 클릭 처리 (헬퍼 빌더 적용)
  const handleSessionClick = useMemo(
    () =>
      buildHandleSessionClick({
        enrollments,
        setEditModalData,
        setEditModalTimeData,
        setTempSubjectId,
        setTempEnrollments,
        setShowEditModal,
      }),
    [
      enrollments,
      setEditModalData,
      setEditModalTimeData,
      setTempSubjectId,
      setTempEnrollments,
      setShowEditModal,
    ]
  );

  // 🆕 PDF 다운로드 처리
  const timeTableRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // 🆕 학생 드래그 상태 관리 (중복 선언 제거)
  // (훅으로 대체됨)

  // 드래그 시작 처리
  const handleDragStart = (e: React.DragEvent, student: Student) =>
    onDragStartStudent(
      e,
      student,
      enrollments,
      setIsStudentDragging,
      studentPanelState.resetDragState
    );

  // 🆕 드래그 종료 처리
  const handleDragEnd = (e: React.DragEvent) =>
    onDragEndStudent(e, setIsStudentDragging, studentPanelState.resetDragState);

  return (
    <div className="timetable-container" style={{ padding: 16 }}>
      <ScheduleHeader
        dataLoading={dataLoading}
        error={error ?? undefined}
        selectedStudentName={
          selectedStudentId
            ? students.find((s) => s.id === selectedStudentId)?.name ??
              undefined
            : undefined
        }
      />

      {/* PDF 다운로드 버튼 */}
      <PdfDownloadSection
        timeTableRef={timeTableRef}
        selectedStudent={students.find((s) => s.id === selectedStudentId)}
        isDownloading={isDownloading}
        onDownloadStart={() => setIsDownloading(true)}
        onDownloadEnd={() => setIsDownloading(false)}
      />

      {/* 🆕 시간표 그리드 */}
      <ScheduleGridSection
        containerRef={timeTableRef}
        gridVersion={gridVersion}
        sessions={displaySessions}
        subjects={subjects}
        enrollments={enrollments}
        students={students}
        onSessionClick={handleSessionClick}
        onDrop={handleDrop}
        onSessionDrop={handleSessionDrop}
        onEmptySpaceClick={handleEmptySpaceClick}
        selectedStudentId={selectedStudentId}
        isStudentDragging={isStudentDragging}
      />

      {/* 🆕 학생 패널 */}
      <StudentPanelSection
        selectedStudentId={selectedStudentId}
        panelState={studentPanelState}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      />

      {/* 그룹 수업 추가 모달 (분리) */}
      <GroupSessionModal
        isOpen={showGroupModal}
        groupModalData={groupModalData}
        setGroupModalData={setGroupModalData}
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
        onCreateStudent={handleCreateStudentFromInput}
        studentCreating={studentCreating}
        studentCreateError={studentCreateError}
      />

      {/* 세션 편집 모달 (분리) */}
      <EditSessionModal
        isOpen={Boolean(showEditModal && editModalData)}
        selectedStudents={buildSelectedStudents(
          editModalData?.enrollmentIds,
          enrollments,
          tempEnrollments.map((t) => ({
            id: t.id,
            studentId: t.studentId,
            subjectId: t.subjectId,
          })),
          students
        )}
        onRemoveStudent={(studentId) => {
          const updatedEnrollmentIds = removeStudentFromEnrollmentIds(
            studentId,
            editModalData?.enrollmentIds,
            enrollments,
            tempEnrollments.map((t) => ({
              id: t.id,
              studentId: t.studentId,
              subjectId: t.subjectId,
            }))
          );
          setTempEnrollments((prev) =>
            prev.filter((e) => e.studentId !== studentId)
          );
          setEditModalData((prev) =>
            prev ? { ...prev, enrollmentIds: updatedEnrollmentIds } : null
          );
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
        editSearchResults={filterEditableStudents(
          editStudentInputValue,
          editModalData,
          enrollments,
          students
        )}
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
        onDelete={buildEditOnDelete({
          editModalData,
          deleteSession,
          setShowEditModal,
        })}
        onCancel={buildEditOnCancel({
          setShowEditModal,
          setTempSubjectId,
        })}
        onSave={buildEditOnSave({
          editModalData,
          editModalTimeData,
          tempSubjectId,
          tempEnrollments,
          enrollments,
          addEnrollment,
          getClassPlannerData,
          processTempEnrollments,
          ensureEnrollmentIdsForSubject,
          extractStudentIds,
          buildSessionSaveData,
          updateSession,
          validateAndToastEdit,
          setShowEditModal,
          setTempSubjectId,
          setTempEnrollments,
        })}
      />
    </div>
  );
}
