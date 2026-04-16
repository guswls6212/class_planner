import React from "react";
import type { Session, Subject, Teacher } from "../../lib/planner";
import { logger } from "../../lib/logger";
import type { ColorByMode } from "../../hooks/useColorBy";

import { SESSION_CELL_HEIGHT } from "@/shared/constants/sessionConstants";
import DropZone from "./DropZone";
import SessionBlock from "./SessionBlock";

// 🆕 드래그 상태 타입 (TimeTableGrid와 동일, 간소화)
interface DragPreviewState {
  draggedSession: Session | null;
  targetWeekday: number | null;
  targetTime: string | null;
  targetYPosition: number | null;
}

interface TimeTableRowProps {
  weekday: number;
  height: number;
  sessions: Map<number, Session[]>;
  subjects: Subject[];
  enrollments: Array<{ id: string; studentId: string; subjectId: string }>;
  students: Array<{ id: string; name: string }>;
  sessionYPositions: Map<string, number>;
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
  selectedStudentId?: string; // 🆕 선택된 학생 ID 추가
  isAnyDragging?: boolean; // 🆕 전역 드래그 상태 (학생 드래그와 세션 드래그 모두 포함)
  teachers?: Teacher[];
  colorBy?: ColorByMode;
  isMobile?: boolean;
  // 🆕 드래그 핸들러들
  onDragStart?: (session: Session) => void;
  onDragOver?: (weekday: number, time: string, yPosition: number) => void;
  onDragEnd?: () => void;
  dragPreview?: DragPreviewState;
}

export const TimeTableRow: React.FC<TimeTableRowProps> = ({
  weekday,
  height,
  sessions,
  subjects,
  enrollments,
  students,
  sessionYPositions,
  onSessionClick,
  onDrop,
  onSessionDrop, // 🆕 세션 드롭 핸들러
  onEmptySpaceClick,
  className = "",
  style = {},
  selectedStudentId, // 🆕 선택된 학생 ID 추가
  isAnyDragging = false, // 🆕 전역 드래그 상태 추가
  teachers = [],
  colorBy = "subject",
  isMobile = false,
  // 🆕 드래그 핸들러들
  onDragStart,
  onDragOver,
  onDragEnd,
  dragPreview,
}) => {
  // 🆕 시간을 분으로 변환하는 헬퍼 함수
  const timeToMinutes = React.useCallback((time: string): number => {
    if (!time || typeof time !== "string") {
      logger.warn("Invalid time format", { time });
      return 0;
    }
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  }, []);

  // 🆕 요일별 세션을 useMemo로 최적화
  const weekdaySessions = React.useMemo(() => {
    return sessions?.get(weekday) || [];
  }, [sessions, weekday]);

  // 🆕 해당 요일의 최대 yPosition 계산
  const maxYPosition = React.useMemo(() => {
    // 드래그 중일 때는 더 많은 드롭존을 표시하기 위해 최대값을 증가
    if (dragPreview?.draggedSession) {
      const maxPos = Math.max(
        ...weekdaySessions.map((s) => s.yPosition || 1),
        1
      );
      // Infinity나 NaN 체크
      if (!isFinite(maxPos) || isNaN(maxPos)) {
        return 5; // 기본값 반환
      }
      return Math.max(5, maxPos); // 최소 5개 드롭존 보장
    }
    const maxPos = Math.max(...weekdaySessions.map((s) => s.yPosition || 1), 1);
    // Infinity나 NaN 체크
    if (!isFinite(maxPos) || isNaN(maxPos)) {
      return 1; // 기본값 반환
    }
    return maxPos;
  }, [weekdaySessions, dragPreview?.draggedSession]);

  // 🆕 드래그 중인지 여부 확인 (시간 범위와 겹치는지도 확인)
  const isDragging = React.useMemo(() => {
    if (!dragPreview?.draggedSession) {
      return false;
    }

    const draggedSession = dragPreview.draggedSession;
    const draggedStartMinutes = timeToMinutes(draggedSession.startsAt);
    const draggedEndMinutes = timeToMinutes(draggedSession.endsAt);

    return true; // 드래그 중이면 true, 시간 범위 체크는 DropZone에서 처리
  }, [dragPreview, weekday, maxYPosition, timeToMinutes]);

  // 🆕 시간대별로 세션을 그룹화 (그룹 수업 고려)
  const sessionsByTime = React.useMemo(() => {
    const timeMap = new Map<string, Session[]>();

    weekdaySessions.forEach((session) => {
      const timeKey = `${session.startsAt}-${session.endsAt}`;
      if (!timeMap.has(timeKey)) {
        timeMap.set(timeKey, []);
      }
      timeMap.get(timeKey)!.push(session);
    });

    return timeMap;
  }, [weekdaySessions]);

  // 🆕 30분 단위 시간 슬롯 생성
  const timeSlots30Min = React.useMemo(() => {
    const slots: string[] = [];
    for (let hour = 9; hour < 24; hour++) {
      slots.push(`${hour.toString().padStart(2, "0")}:00`);
      slots.push(`${hour.toString().padStart(2, "0")}:30`);
    }
    return slots;
  }, []);

  // 모바일 여부에 따른 열 너비 (30분 단위)
  const colWidth = isMobile ? 64 : 100;

  // 🆕 시간대별로 겹치는 세션들을 병합하여 표시
  const mergedSessions = React.useMemo(() => {
    const merged: Array<{
      session: Session;
      yPosition: number;
      left: number;
      width: number;
      yOffset: number;
    }> = [];

    sessionsByTime.forEach((sessionsInTime, timeKey) => {
      const [startTime] = timeKey.split("-");
      const timeSlot = timeToMinutes(startTime);

      // 정확한 시간 기반 위치 계산 (소수점 제거)
      const timeIndex = (timeSlot - 9 * 60) / 30;
      const left = Math.round(timeIndex * colWidth);

      // 🆕 같은 시간대의 모든 세션을 개별적으로 표시
      sessionsInTime.forEach((session) => {
        const yPosition = sessionYPositions.get(session.id) || 0;

        // 세션셀 너비를 실제 시간 길이에 맞게 계산 (소수점 제거)
        const sessionDuration =
          timeToMinutes(session.endsAt) - timeToMinutes(session.startsAt);
        const timeBasedWidth = Math.round((sessionDuration / 30) * colWidth);

        // 최소 너비 보장
        const minWidth = isMobile ? 52 : 80;
        const width = Math.max(timeBasedWidth, minWidth);

        merged.push({
          session: session,
          yPosition,
          left,
          width,
          yOffset: yPosition,
        });
      });
    });

    return merged;
  }, [sessionsByTime, sessionYPositions, timeToMinutes, colWidth, isMobile]);

  return (
    <div
      className={`time-table-row ${className}`}
      style={{
        display: "contents", // 🆕 다시 contents로 변경 (부모 그리드에 직접 참여)
        ...style,
      }}
    >
      {/* 요일 라벨 (Y축 왼쪽) - 스크롤 시 좌측 고정 */}
      <div
        className="shadow-sm"
        style={{
          // 완전 불투명 배경으로 세션 셀과의 겹침 제거
          backgroundColor: "var(--color-bg-primary)", // 테마별 배경색 사용
          padding: "12px 8px",
          textAlign: "center",
          fontWeight: "bold",
          fontSize: "14px",
          color: "var(--color-text)",
          border: "1px solid var(--color-border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: `${height}px`,
          position: "sticky",
          left: 0,
          zIndex: 999, // 세션(zIndex: 100+yOffset)보다 높게, 레이아웃 상위(1000)보다 낮게
          gridColumn: "1", // 🆕 첫 번째 열에 명시적으로 배치
        }}
      >
        {["월", "화", "수", "목", "금", "토", "일"][weekday]}
      </div>

      {/* 요일별 세션 컨테이너 (X축 전체) */}
      <div
        style={{
          position: "relative",
          backgroundColor: "var(--color-bg-primary)",
          height: `${height}px`,
          border: "1px solid var(--color-border-grid)",
          gridColumn: "2 / -1", // 🆕 첫 번째 열(요일 라벨)을 제외한 모든 열 차지
        }}
      >
        {/* 🆕 드롭 존들 - 30분 단위 × maxYPosition 개의 개별 DropZone */}
        {timeSlots30Min.map((timeString, timeIndex) => {
          return Array.from({ length: maxYPosition }, (_, yIndex) => {
            const yPosition = yIndex + 1;
            const top = yIndex * SESSION_CELL_HEIGHT;

            return (
              <DropZone
                key={`${timeString}-${yPosition}`}
                weekday={weekday}
                time={timeString}
                yPosition={yPosition} // 🆕 yPosition 정보 추가
                onDrop={onDrop}
                onSessionDrop={onSessionDrop} // 🆕 세션 드롭 핸들러 전달
                onEmptySpaceClick={onEmptySpaceClick}
                onDragOver={onDragOver} // 🆕 드래그 오버 핸들러 전달
                draggedSessionTimeRange={
                  dragPreview?.draggedSession
                    ? {
                        startsAt: dragPreview.draggedSession.startsAt,
                        endsAt: dragPreview.draggedSession.endsAt,
                      }
                    : null
                } // 🆕 드래그 중인 세션의 시간 범위 전달
                isAnyDragging={isAnyDragging} // 🆕 전역 드래그 상태 전달
                isDragging={isDragging} // 🆕 드래그 상태 전달
                dragPreview={dragPreview} // 🆕 드래그 프리뷰 정보 전달
                style={{
                  position: "absolute",
                  top: `${top}px`,
                  left: `${timeIndex * colWidth}px`,
                  width: `${colWidth}px`,
                  height: `${SESSION_CELL_HEIGHT}px`,
                  zIndex: isDragging ? 10 : 1,
                }}
              />
            );
          });
        })}

        {/* 세션 블록들 */}
        {mergedSessions.map((session) => (
          <SessionBlock
            key={session.session.id}
            session={session.session}
            subjects={(subjects || []).map((subject) => ({
              ...subject,
              color: subject.color || "#000000", // 기본 색상 제공
            }))}
            enrollments={enrollments}
            students={students}
            yPosition={session.yPosition}
            left={session.left}
            width={session.width}
            yOffset={session.yOffset}
            onClick={() => onSessionClick(session.session)}
            onDragStart={(e, session) => {
              if (onDragStart) {
                onDragStart(session);
              }
            }}
            onDragEnd={(e) => {
              if (onDragEnd) {
                onDragEnd();
              }
            }}
            selectedStudentId={selectedStudentId}
            teachers={teachers}
            colorBy={colorBy}
            isMobile={isMobile}
            // 🆕 드래그 상태 전달
            isDragging={dragPreview?.draggedSession !== null}
            draggedSessionId={dragPreview?.draggedSession?.id}
            isAnyDragging={isAnyDragging} // 🆕 전역 드래그 상태 전달
          />
        ))}
      </div>
    </div>
  );
};

export default TimeTableRow;
