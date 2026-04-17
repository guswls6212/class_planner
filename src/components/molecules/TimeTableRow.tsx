import React from "react";
import type { Session, Subject, Teacher } from "../../lib/planner";
import { logger } from "../../lib/logger";
import type { ColorByMode } from "../../hooks/useColorBy";

import { SESSION_CELL_HEIGHT } from "@/shared/constants/sessionConstants";
import TimeTableCell from "./TimeTableCell";
import SessionBlock from "./SessionBlock";

// Drag preview state (same shape as TimeTableGrid)
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
  onSessionDelete?: (session: Session) => void;
  onDrop: (weekday: number, time: string, enrollmentId: string) => void;
  onSessionDrop?: (
    sessionId: string,
    weekday: number,
    time: string,
    yPosition: number
  ) => void;
  onEmptySpaceClick: (weekday: number, time: string) => void;
  className?: string;
  style?: React.CSSProperties;
  selectedStudentIds?: string[];
  isAnyDragging?: boolean;
  teachers?: Teacher[];
  colorBy?: ColorByMode;
  isMobile?: boolean;
  // Drag handlers
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
  onSessionDelete,
  onDrop,
  onSessionDrop,
  onEmptySpaceClick,
  className = "",
  style = {},
  selectedStudentIds,
  isAnyDragging = false,
  teachers = [],
  colorBy = "subject",
  isMobile = false,
  onDragStart,
  onDragOver,
  onDragEnd,
  dragPreview,
}) => {
  // Convert time string to minutes helper
  const timeToMinutes = React.useCallback((time: string): number => {
    if (!time || typeof time !== "string") {
      logger.warn("Invalid time format", { time });
      return 0;
    }
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  }, []);

  // Sessions for this weekday
  const weekdaySessions = React.useMemo(() => {
    return sessions?.get(weekday) || [];
  }, [sessions, weekday]);

  // Max y-position for determining how many cell rows to render
  const maxYPosition = React.useMemo(() => {
    if (dragPreview?.draggedSession) {
      const maxPos = Math.max(
        ...weekdaySessions.map((s) => s.yPosition || 1),
        1
      );
      if (!isFinite(maxPos) || isNaN(maxPos)) return 5;
      return Math.max(5, maxPos);
    }
    const maxPos = Math.max(...weekdaySessions.map((s) => s.yPosition || 1), 1);
    if (!isFinite(maxPos) || isNaN(maxPos)) return 1;
    return maxPos;
  }, [weekdaySessions, dragPreview?.draggedSession]);

  // Whether any session is being dragged
  const isDragging = React.useMemo(() => {
    return Boolean(dragPreview?.draggedSession);
  }, [dragPreview]);

  // Group sessions by time key for rendering
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

  // 30-minute time slots (9:00 – 23:30)
  const timeSlots30Min = React.useMemo(() => {
    const slots: string[] = [];
    for (let hour = 9; hour < 24; hour++) {
      slots.push(`${hour.toString().padStart(2, "0")}:00`);
      slots.push(`${hour.toString().padStart(2, "0")}:30`);
    }
    return slots;
  }, []);

  // Column width based on mobile
  const colWidth = isMobile ? 64 : 100;

  // Compute absolute-positioned session blocks
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
      const timeIndex = (timeSlot - 9 * 60) / 30;
      const left = Math.round(timeIndex * colWidth);

      sessionsInTime.forEach((session) => {
        const yPosition = sessionYPositions.get(session.id) || 0;
        const sessionDuration =
          timeToMinutes(session.endsAt) - timeToMinutes(session.startsAt);
        const timeBasedWidth = Math.round((sessionDuration / 30) * colWidth);
        const minWidth = isMobile ? 52 : 80;
        const width = Math.max(timeBasedWidth, minWidth);

        merged.push({
          session,
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
      className={`time-table-row contents ${className}`}
      style={style}
    >
      {/* Weekday label — sticky left */}
      <div
        className="shadow-sm flex items-center justify-center px-2 py-3 text-center font-bold text-sm border border-[var(--color-border)] bg-[var(--color-bg-primary)] sticky left-0 z-[999] [grid-column:1] text-[var(--color-text)]"
        style={{ height: `${height}px` }}
      >
        {["월", "화", "수", "목", "금", "토", "일"][weekday]}
      </div>

      {/* Session container — full width */}
      <div
        className="relative bg-[var(--color-bg-primary)] border border-[var(--color-border-grid)] [grid-column:2_/_-1]"
        style={{ height: `${height}px` }}
      >
        {/* Drop cells — 30min slots × maxYPosition rows — using TimeTableCell */}
        {timeSlots30Min.map((timeString, timeIndex) => {
          return Array.from({ length: maxYPosition }, (_, yIndex) => {
            const yPosition = yIndex + 1;
            const top = yIndex * SESSION_CELL_HEIGHT;

            return (
              <TimeTableCell
                key={`${timeString}-${yPosition}`}
                weekday={weekday}
                time={timeString}
                yPosition={yPosition}
                onDrop={onDrop}
                onSessionDrop={onSessionDrop}
                onEmptySpaceClick={onEmptySpaceClick}
                onDragOver={onDragOver}
                isAnyDragging={isAnyDragging}
                isDragging={isDragging}
                dragPreview={dragPreview}
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

        {/* Session blocks (absolutely positioned) */}
        {mergedSessions.map((session) => (
          <SessionBlock
            key={session.session.id}
            session={session.session}
            subjects={(subjects || []).map((subject) => ({
              ...subject,
              color: subject.color || "#000000",
            }))}
            enrollments={enrollments}
            students={students}
            left={session.left}
            width={session.width}
            yOffset={session.yOffset}
            onClick={() => onSessionClick(session.session)}
            onDelete={onSessionDelete ? () => onSessionDelete(session.session) : undefined}
            onDragStart={(e, session) => {
              if (onDragStart) {
                onDragStart(session);
              }
            }}
            onDragEnd={() => {
              if (onDragEnd) {
                onDragEnd();
              }
            }}
            selectedStudentIds={selectedStudentIds}
            teachers={teachers}
            colorBy={colorBy}
            isMobile={isMobile}
            isDragging={dragPreview?.draggedSession !== null}
            draggedSessionId={dragPreview?.draggedSession?.id}
            isAnyDragging={isAnyDragging}
          />
        ))}
      </div>
    </div>
  );
};

export default TimeTableRow;
