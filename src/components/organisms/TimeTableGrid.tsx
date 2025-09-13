import React, { forwardRef, useCallback, useMemo, useState } from "react";
import type { Session, Subject } from "../../lib/planner";
import { timeToMinutes } from "../../lib/planner";
import TimeTableRow from "../molecules/TimeTableRow";

// 🆕 드래그 미리보기 상태 타입 정의
interface DragPreviewState {
  draggedSession: Session | null;
  targetWeekday: number | null;
  targetTime: string | null;
  targetYPosition: number | null;
  previewPositions: Map<string, number>; // 세션 ID -> Y축 위치
  conflictSessions: Session[]; // 충돌하는 세션들
}

interface TimeTableGridProps {
  sessions: Map<number, Session[]>;
  subjects: Subject[];
  enrollments: Array<{ id: string; studentId: string; subjectId: string }>;
  students: Array<{ id: string; name: string }>;
  onSessionClick: (session: Session) => void;
  onDrop: (weekday: number, time: string, enrollmentId: string) => void;
  onSessionDrop?: (
    sessionId: string,
    weekday: number,
    time: string,
    yPosition: number
  ) => void; // 🆕 세션 드롭 핸들러
  onEmptySpaceClick: (weekday: number, time: string) => void;
  className?: string;
  style?: React.CSSProperties;
  ref?: React.Ref<HTMLDivElement>;
  selectedStudentId?: string; // 🆕 선택된 학생 ID 추가
}

const TimeTableGrid = forwardRef<HTMLDivElement, TimeTableGridProps>(
  (
    {
      sessions,
      subjects,
      enrollments,
      students,
      onSessionClick,
      onDrop,
      onSessionDrop, // 🆕 세션 드롭 핸들러
      onEmptySpaceClick,
      className = "",
      style = {},
      selectedStudentId, // 🆕 선택된 학생 ID 추가
    },
    ref
  ) => {
    // 🆕 드래그 미리보기 상태 관리
    const [dragPreview, setDragPreview] = useState<DragPreviewState>({
      draggedSession: null,
      targetWeekday: null,
      targetTime: null,
      targetYPosition: null,
      previewPositions: new Map(),
      conflictSessions: [],
    });

    // 🆕 30분 단위로 변경: 9:00 ~ 24:00 (30개 열)
    const timeSlots30Min = useMemo(() => {
      const slots: string[] = [];
      for (let hour = 9; hour < 24; hour++) {
        slots.push(`${hour.toString().padStart(2, "0")}:00`);
        slots.push(`${hour.toString().padStart(2, "0")}:30`);
      }
      return slots;
    }, []);

    const timeCols = timeSlots30Min.length; // 30개 열

    // 🆕 스마트 위치 계산 함수 (혼합 방식: 시간 + Y 좌표)
    const calculateSmartPosition = useCallback(
      (
        draggedSession: Session,
        targetWeekday: number,
        targetTime: string,
        targetYPosition: number,
        conflictResolution: "auto" = "auto" // 🆕 자동 충돌 해결만 지원
      ): {
        previewPositions: Map<string, number>;
        conflictSessions: Session[];
      } => {
        const daySessions = sessions?.get(targetWeekday) || [];
        const sessionHeight = 47;

        // 🆕 사용자가 드래그한 위치를 기반으로 yPosition 계산
        // targetYPosition은 드롭존 내에서의 상대적 위치 (0~47px)
        const finalYPosition =
          Math.round(targetYPosition / sessionHeight) * sessionHeight;

        // 겹침 판단 함수
        const sessionsOverlap = (a: Session, b: Session): boolean => {
          return (
            timeToMinutes(a.startsAt) < timeToMinutes(b.endsAt) &&
            timeToMinutes(b.startsAt) < timeToMinutes(a.endsAt)
          );
        };

        // 충돌하는 세션들 찾기
        const conflictSessions = daySessions.filter(
          (session) =>
            session.id !== draggedSession.id &&
            sessionsOverlap(draggedSession, session)
        );

        // 미리보기 위치 계산
        const previewPositions = new Map<string, number>();
        const occupiedPositions = new Map<number, Session[]>();

        // 기존 세션들의 위치 계산 (드래그된 세션 제외)
        const otherSessions = daySessions.filter(
          (s) => s.id !== draggedSession.id
        );
        const sortedSessions = [...otherSessions].sort(
          (a, b) => timeToMinutes(a.startsAt) - timeToMinutes(b.startsAt)
        );

        // 기존 세션들 배치
        for (const session of sortedSessions) {
          let targetY = 0;
          while (targetY <= 500) {
            const conflictingSessions = occupiedPositions.get(targetY) || [];
            const hasConflict = conflictingSessions.some((existingSession) =>
              sessionsOverlap(session, existingSession)
            );

            if (!hasConflict) break;
            targetY += sessionHeight;
          }

          if (!occupiedPositions.has(targetY)) {
            occupiedPositions.set(targetY, []);
          }
          occupiedPositions.get(targetY)!.push(session);
          previewPositions.set(session.id, targetY);
        }

        // 🆕 드래그된 세션을 사용자가 지정한 위치에 배치
        previewPositions.set(draggedSession.id, finalYPosition);

        // 🆕 충돌하는 세션들을 아래로 밀어내기
        for (const conflictSession of conflictSessions) {
          const currentY = previewPositions.get(conflictSession.id) || 0;

          // 충돌하는 세션을 드래그된 세션 아래로 이동
          const newY = finalYPosition + sessionHeight;
          previewPositions.set(conflictSession.id, newY);
        }

        return { previewPositions, conflictSessions };
      },
      [sessions, timeSlots30Min]
    );

    // 🚀 Phase 1: 개선된 세션 Y축 위치 계산 알고리즘 (필터링된 세션에 최적화)
    const getSessionYPositions = useCallback(
      (weekday: number): Map<string, number> => {
        // 현재 요일의 실제 세션들을 시작 시간 기준으로 정렬 (O(n log n))
        const daySessions = sessions?.get(weekday) || [];
        const sortedSessions = [...daySessions].sort(
          (a, b) => timeToMinutes(a.startsAt) - timeToMinutes(b.startsAt)
        );

        if (sortedSessions.length === 0) {
          return new Map();
        }

        // 겹침 판단 함수: 일부라도 겹치면 겹치는 것으로 판단
        const sessionsOverlap = (a: Session, b: Session): boolean => {
          return (
            timeToMinutes(a.startsAt) < timeToMinutes(b.endsAt) &&
            timeToMinutes(b.startsAt) < timeToMinutes(a.endsAt)
          );
        };

        // 각 세션의 Y축 위치를 계산
        const sessionYPositions = new Map<string, number>();
        const occupiedPositions = new Map<number, Session[]>(); // 🆕 각 Y축 위치별 세션 추적
        const sessionHeight = 47; // 세션 셀 높이
        const maxYPosition = 500; // 🆕 최대 Y축 위치 제한 (UI 깨짐 방지)

        for (let i = 0; i < sortedSessions.length; i++) {
          const currentSession = sortedSessions[i];

          // 🆕 사용자가 설정한 yPosition이 있으면 우선 사용
          let targetYPosition = currentSession.yPosition || 0;

          // 🆕 사용자 정의 yPosition이 없거나 겹치는 경우에만 자동 계산
          if (
            currentSession.yPosition === undefined ||
            currentSession.yPosition === null
          ) {
            targetYPosition = 0;
            while (targetYPosition <= maxYPosition) {
              const conflictingSessions =
                occupiedPositions.get(targetYPosition) || [];

              // 현재 Y축 위치에서 겹치는 세션이 있는지 확인
              const hasConflict = conflictingSessions.some((existingSession) =>
                sessionsOverlap(currentSession, existingSession)
              );

              if (!hasConflict) {
                // 겹치지 않으면 이 위치 사용
                break;
              }

              // 겹치면 다음 위치로 이동
              targetYPosition += sessionHeight;
            }

            // 최대 높이를 초과하면 첫 번째 위치에 강제 배치
            if (targetYPosition > maxYPosition) {
              targetYPosition = 0;
            }
          } else {
            // 🆕 사용자가 설정한 yPosition이 있어도 겹치는지 확인하고 조정
            const conflictingSessions =
              occupiedPositions.get(targetYPosition) || [];

            const hasConflict = conflictingSessions.some((existingSession) =>
              sessionsOverlap(currentSession, existingSession)
            );

            if (hasConflict) {
              // 겹치면 다음 위치로 이동
              while (targetYPosition <= maxYPosition) {
                const nextConflictingSessions =
                  occupiedPositions.get(targetYPosition) || [];

                const nextHasConflict = nextConflictingSessions.some(
                  (existingSession) =>
                    sessionsOverlap(currentSession, existingSession)
                );

                if (!nextHasConflict) {
                  break;
                }
                targetYPosition += sessionHeight;
              }

              // 최대 높이를 초과하면 첫 번째 위치에 강제 배치
              if (targetYPosition > maxYPosition) {
                targetYPosition = 0;
              }
            }
          }

          // 🆕 선택된 위치에 현재 세션 추가
          if (!occupiedPositions.has(targetYPosition)) {
            occupiedPositions.set(targetYPosition, []);
          }
          occupiedPositions.get(targetYPosition)!.push(currentSession);

          sessionYPositions.set(currentSession.id, targetYPosition);
        }

        return sessionYPositions;
      },
      [sessions]
    );

    // 🆕 요일별 높이 계산: 기본 47px + 겹침당 47px
    const getWeekdayHeight = useCallback(
      (weekday: number): number => {
        const sessionYPositions = getSessionYPositions(weekday);
        const daySessions = sessions?.get(weekday) || [];

        if (daySessions.length === 0) {
          return 49; // 🆕 기본 높이를 49px로 증가 (위아래 1px 여백을 위한 높이)
        }

        // 최대 yPosition을 찾아서 필요한 높이 계산
        let maxYPosition = 0;
        for (const yPos of sessionYPositions.values()) {
          maxYPosition = Math.max(maxYPosition, yPos);
        }

        // 🆕 기본 높이 49px + 최대 yPosition + 세션 셀 높이 47px
        const requiredHeight = Math.max(49, maxYPosition + 47);
        const finalHeight = Math.max(requiredHeight, 49);

        return finalHeight;
      },
      [sessions, getSessionYPositions]
    );

    // 요일별 높이를 useMemo로 최적화
    const weekdayHeights = useMemo(
      () => Array.from({ length: 7 }, (_, i) => getWeekdayHeight(i)),
      [getWeekdayHeight]
    );

    // 그리드 템플릿 행을 useMemo로 최적화
    const gridTemplateRows = useMemo(
      () => `40px ${weekdayHeights.join("px ")}px`,
      [weekdayHeights]
    );

    // 🆕 그리드 템플릿 열을 30분 단위로 변경: 80px + 30개 × 100px (학생 이름 표시를 위해)
    const gridTemplateColumns = useMemo(
      () => `80px repeat(${timeCols}, 100px)`,
      [timeCols]
    );

    // 🆕 드래그 시작 핸들러
    const handleDragStart = useCallback((session: Session) => {
      setDragPreview({
        draggedSession: session,
        targetWeekday: null,
        targetTime: null,
        targetYPosition: null,
        previewPositions: new Map(),
        conflictSessions: [],
      });
    }, []);

    // 🆕 드래그 오버 핸들러 (실시간 미리보기)
    const handleDragOver = useCallback(
      (weekday: number, time: string, yPosition: number) => {
        if (!dragPreview.draggedSession) return;

        // 🆕 스마트 위치 계산 (자동 충돌 해결)
        const { previewPositions, conflictSessions } = calculateSmartPosition(
          dragPreview.draggedSession,
          weekday,
          time,
          yPosition,
          "auto" // 🆕 자동 충돌 해결
        );

        setDragPreview((prev) => ({
          ...prev,
          targetWeekday: weekday,
          targetTime: time,
          targetYPosition: yPosition,
          previewPositions,
          conflictSessions,
        }));
      },
      [dragPreview.draggedSession, calculateSmartPosition]
    );

    // 🆕 드래그 종료 핸들러
    const handleDragEnd = useCallback(() => {
      // 🆕 드롭 완료 시 미리보기 상태를 실제 데이터에 적용
      if (
        dragPreview.draggedSession &&
        dragPreview.targetWeekday !== null &&
        dragPreview.targetTime &&
        dragPreview.targetYPosition !== null
      ) {
        // 🆕 세션 위치 업데이트 호출 (드래그된 세션 + 충돌하는 세션들)
        if (onSessionDrop) {
          // 드래그된 세션 업데이트
          const draggedFinalYPosition =
            dragPreview.previewPositions.get(dragPreview.draggedSession.id) ||
            0;

          onSessionDrop(
            dragPreview.draggedSession.id,
            dragPreview.targetWeekday,
            dragPreview.targetTime,
            draggedFinalYPosition
          );

          // 🆕 충돌하는 세션들도 함께 업데이트
          for (const conflictSession of dragPreview.conflictSessions) {
            const conflictFinalYPosition =
              dragPreview.previewPositions.get(conflictSession.id) || 0;

            onSessionDrop(
              conflictSession.id,
              conflictSession.weekday,
              conflictSession.startsAt, // 충돌 세션은 시간 변경 없이 위치만 변경
              conflictFinalYPosition
            );
          }
        }
      }

      setDragPreview({
        draggedSession: null,
        targetWeekday: null,
        targetTime: null,
        targetYPosition: null,
        previewPositions: new Map(),
        conflictSessions: [],
      });
    }, [dragPreview, onSessionDrop]);

    return (
      <div
        ref={ref}
        className={`time-table-grid ${className}`}
        data-testid="time-table-grid"
        style={{
          display: "grid",
          gridTemplateColumns,
          gridTemplateRows,
          backgroundColor: "var(--color-background)",
          border: "1px solid var(--color-border-grid)",
          borderRadius: "8px",
          overflow: "auto",
          ...style,
        }}
      >
        {/* 좌상단 빈칸 */}
        <div style={{ backgroundColor: "var(--color-background)" }} />

        {/* 🆕 시간 헤더 (X축 상단) - 30분 단위 */}
        {timeSlots30Min.map((timeString, index) => {
          const isLastTime = index === timeSlots30Min.length - 1;
          return (
            <div
              key={timeString}
              style={{
                backgroundColor: "var(--color-background)",
                padding: "4px", // 🆕 패딩을 줄여서 30분 단위에 맞춤
                textAlign: "center",
                fontSize: "11px", // 🆕 폰트 크기를 줄여서 30분 단위에 맞춤
                color: "var(--color-text-secondary)",
                border: "1px solid var(--color-border)",
                borderRight: isLastTime
                  ? "1px solid var(--color-border)"
                  : "1px solid var(--color-border-grid)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "40px",
                position: "sticky",
                top: 0,
                zIndex: 10,
              }}
            >
              {timeString}
            </div>
          );
        })}

        {/* 요일별 행 (Y축 왼쪽) */}
        {Array.from({ length: 7 }, (_, weekday) => {
          // 🆕 미리보기 상태가 있으면 미리보기 위치 사용, 없으면 기본 위치 사용
          const sessionYPositions =
            dragPreview.targetWeekday === weekday &&
            dragPreview.previewPositions.size > 0
              ? dragPreview.previewPositions
              : getSessionYPositions(weekday);

          return (
            <TimeTableRow
              key={weekday}
              weekday={weekday}
              height={weekdayHeights[weekday]}
              sessions={sessions}
              subjects={subjects}
              enrollments={enrollments}
              students={students}
              sessionYPositions={sessionYPositions}
              onSessionClick={onSessionClick}
              onDrop={onDrop}
              onSessionDrop={onSessionDrop} // 🆕 세션 드롭 핸들러 전달
              onEmptySpaceClick={onEmptySpaceClick}
              selectedStudentId={selectedStudentId}
              // 🆕 드래그 핸들러들 전달
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
              dragPreview={dragPreview}
            />
          );
        })}
      </div>
    );
  }
);

export { TimeTableGrid };
export default TimeTableGrid;
