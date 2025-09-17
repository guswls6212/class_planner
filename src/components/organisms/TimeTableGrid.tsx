import { SESSION_CELL_HEIGHT } from "@/shared/constants/sessionConstants";
import React, { forwardRef, useCallback, useMemo, useState } from "react";
import { logger } from "../../lib/logger";
import type { Session, Subject } from "../../lib/planner";
import TimeTableRow from "../molecules/TimeTableRow";

// 🆕 드래그 상태 타입 정의 (간소화)
interface DragPreviewState {
  draggedSession: Session | null; // 현재 드래그 중인 세션 객체 (드래그 시작 시 설정)
  targetWeekday: number | null; // 드래그 대상 요일 (0=월요일, 1=화요일, ..., 6=일요일)
  targetTime: string | null; // 드래그 대상 시간 (예: "09:00", "10:30")
  targetYPosition: number | null; // 드래그 대상 Y축 위치 (픽셀 단위, 0부터 시작)
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
  isAnyDragging?: boolean; // 🆕 전역 드래그 상태 (학생 드래그와 세션 드래그 모두 포함)
  isStudentDragging?: boolean; // 🆕 학생 드래그 상태 추가
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
      isAnyDragging = false, // 🆕 전역 드래그 상태 추가
      isStudentDragging = false, // 🆕 학생 드래그 상태 추가
    },
    ref
  ) => {
    // 🆕 드래그 상태 관리 (간소화)
    const [dragPreview, setDragPreview] = useState<DragPreviewState>({
      draggedSession: null,
      targetWeekday: null,
      targetTime: null,
      targetYPosition: null,
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

    // 🚀 간단한 세션 Y축 위치 계산: 논리적 위치(1,2,3...)를 픽셀 위치로 변환
    const getSessionYPositions = useCallback(
      (weekday: number): Map<string, number> => {
        const daySessions = sessions?.get(weekday) || [];
        const sessionYPositions = new Map<string, number>();

        // 각 세션의 논리적 위치를 픽셀 위치로 변환
        daySessions.forEach((session) => {
          const logicalPosition = session.yPosition || 1; // 기본값: 1
          const pixelPosition = (logicalPosition - 1) * SESSION_CELL_HEIGHT;
          sessionYPositions.set(session.id, pixelPosition);
        });

        return sessionYPositions;
      },
      [sessions]
    );

    // 🚀 간단한 요일별 높이 계산: 데이터베이스의 maxYPosition 사용
    const getWeekdayHeight = useCallback(
      (weekday: number): number => {
        const daySessions = sessions?.get(weekday) || [];

        if (daySessions.length === 0) {
          return 49; // 기본 높이
        }

        // 데이터베이스에서 저장된 maxYPosition 찾기
        const maxYPosition = Math.max(
          ...daySessions.map((session) => session.yPosition || 1)
        );

        // 논리적 위치를 픽셀 높이로 변환
        const height = maxYPosition * SESSION_CELL_HEIGHT;

        return Math.max(49, height); // 최소 높이 49px 보장
      },
      [sessions]
    );

    // 요일별 높이를 useMemo로 최적화
    const weekdayHeights = useMemo(
      () => Array.from({ length: 7 }, (_, i) => getWeekdayHeight(i)),
      [getWeekdayHeight]
    );

    // 그리드 템플릿 행을 useMemo로 최적화
    const gridTemplateRows = useMemo(
      () => `40px ${weekdayHeights.map((h) => `${h}px`).join(" ")}`,
      [weekdayHeights]
    );

    // 🆕 그리드 템플릿 열을 30분 단위로 변경: 80px + 30개 × 100px (학생 이름 표시를 위해)
    const gridTemplateColumns = useMemo(
      () => `80px repeat(${timeCols}, 100px)`,
      [timeCols]
    );

    // 🆕 드래그 시작 핸들러 (간소화)
    const handleDragStart = useCallback((session: Session) => {
      setDragPreview({
        draggedSession: session,
        targetWeekday: null,
        targetTime: null,
        targetYPosition: null,
      });
    }, []);

    // 🆕 드래그 오버 핸들러 (간소화)
    const handleDragOver = useCallback(
      (weekday: number, time: string, yPosition: number) => {
        if (!dragPreview.draggedSession) return;

        setDragPreview((prev) => ({
          ...prev,
          targetWeekday: weekday,
          targetTime: time,
          targetYPosition: yPosition,
        }));
      },
      [dragPreview.draggedSession]
    );

    // 🆕 드래그 종료 핸들러 (간소화)
    const handleDragEnd = useCallback(() => {
      // DropZone에서 이미 드롭 처리를 했으므로 여기서는 상태만 초기화
      // 중복 호출 방지를 위해 onSessionDrop 호출 제거
      logger.info("🔄 TimeTableGrid 드래그 종료 - 상태 초기화만 수행");

      setDragPreview({
        draggedSession: null,
        targetWeekday: null,
        targetTime: null,
        targetYPosition: null,
      });
    }, []);

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
          return (
            <TimeTableRow
              key={weekday}
              weekday={weekday}
              height={weekdayHeights[weekday]}
              sessions={sessions}
              subjects={subjects}
              enrollments={enrollments}
              students={students}
              sessionYPositions={getSessionYPositions(weekday)}
              onSessionClick={onSessionClick}
              onDrop={onDrop}
              onSessionDrop={onSessionDrop} // 🆕 세션 드롭 핸들러 전달
              onEmptySpaceClick={onEmptySpaceClick}
              selectedStudentId={selectedStudentId}
              isAnyDragging={isAnyDragging || isStudentDragging} // 🆕 전역 드래그 상태 전달 (세션 드래그 + 학생 드래그)
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
