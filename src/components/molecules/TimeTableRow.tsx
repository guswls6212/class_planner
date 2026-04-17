import React from "react";
import type { Session, Subject, Teacher } from "../../lib/planner";
import { logger } from "../../lib/logger";
import type { ColorByMode } from "../../hooks/useColorBy";

import { SLOT_HEIGHT_PX } from "@/shared/constants/sessionConstants";
import TimeTableCell from "./TimeTableCell";
import SessionBlock from "./SessionBlock";
import {
  SessionOverflowPopover,
  type OverflowSessionItem,
} from "./SessionOverflowPopover";

// D-hybrid: columns with ≥4 yPositions show only the first 2 + "+N" pill
const OVERFLOW_THRESHOLD = 4;

// Drag preview state (same shape as TimeTableGrid)
interface DragPreviewState {
  draggedSession: Session | null;
  targetWeekday: number | null;
  targetTime: string | null;
  targetYPosition: number | null;
}

interface TimeTableRowProps {
  weekday: number;
  width: number; // 이 weekday column 전체 너비 (max lane 수 × laneWidth)
  sessions: Map<number, Session[]>;
  subjects: Subject[];
  enrollments: Array<{ id: string; studentId: string; subjectId: string }>;
  students: Array<{ id: string; name: string }>;
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

/**
 * TimeTableRow — weekday column (B2+).
 * 시간축이 세로(rows), 요일이 가로(cols).
 * yPosition(=overlap lane)은 column 내부에서 가로로 스택된다.
 * B3: D-hybrid — ≤3 lanes equal-split, ≥4 lanes cap at 2 + overflow pill.
 */
export const TimeTableRow: React.FC<TimeTableRowProps> = ({
  weekday,
  width,
  sessions,
  subjects,
  enrollments,
  students,
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
  const [openPillSlot, setOpenPillSlot] = React.useState<string | null>(null);

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

  // Raw max yPosition (including drag expansion)
  const rawMaxYPosition = React.useMemo(() => {
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

  const isDragging = React.useMemo(() => {
    return Boolean(dragPreview?.draggedSession);
  }, [dragPreview]);

  // D-hybrid: overflow only when not actively dragging
  const isOverflow = !isDragging && rawMaxYPosition >= OVERFLOW_THRESHOLD;

  // Effective lanes for column layout (cap at 2 when overflow)
  const effectiveLanes = isOverflow ? 2 : rawMaxYPosition;

  // 30-minute time slots (9:00 – 23:30)
  const timeSlots30Min = React.useMemo(() => {
    const slots: string[] = [];
    for (let hour = 9; hour < 24; hour++) {
      slots.push(`${hour.toString().padStart(2, "0")}:00`);
      slots.push(`${hour.toString().padStart(2, "0")}:30`);
    }
    return slots;
  }, []);

  // Lane width for horizontal overlap stacking within this weekday column
  const laneWidth = width / Math.max(1, effectiveLanes);
  const totalHeight = timeSlots30Min.length * SLOT_HEIGHT_PX;

  // Visible sessions (yPos ≤2 when overflow; all otherwise)
  const visibleSessions = React.useMemo(() => {
    return isOverflow
      ? weekdaySessions.filter((s) => (s.yPosition || 1) <= 2)
      : weekdaySessions;
  }, [weekdaySessions, isOverflow]);

  // Hidden sessions (yPos ≥3 when overflow; empty otherwise)
  const hiddenSessions = React.useMemo(() => {
    return isOverflow
      ? weekdaySessions.filter((s) => (s.yPosition || 1) >= 3)
      : [];
  }, [weekdaySessions, isOverflow]);

  // Compute per-session layout (top/height from time, left/width from lane)
  const laidOutSessions = React.useMemo(() => {
    return visibleSessions.map((session) => {
      const laneIdx = Math.max(0, (session.yPosition || 1) - 1);
      const startMin = timeToMinutes(session.startsAt);
      const endMin = timeToMinutes(session.endsAt);
      const timeIdx = Math.max(0, (startMin - 9 * 60) / 30);
      const durationSlots = Math.max(1, (endMin - startMin) / 30);
      return {
        session,
        left: Math.round(laneIdx * laneWidth),
        width: Math.round(laneWidth),
        top: Math.round(timeIdx * SLOT_HEIGHT_PX),
        height: Math.round(durationSlots * SLOT_HEIGHT_PX),
      };
    });
  }, [visibleSessions, timeToMinutes, laneWidth]);

  // Per-slot hidden sessions (for overflow pills)
  const slotHiddenSessions = React.useMemo(() => {
    if (!isOverflow) return [];
    return timeSlots30Min.map((slot) => {
      const slotMin = timeToMinutes(slot);
      return hiddenSessions.filter((s) => {
        const start = timeToMinutes(s.startsAt);
        const end = timeToMinutes(s.endsAt);
        return start <= slotMin && slotMin < end;
      });
    });
  }, [timeSlots30Min, hiddenSessions, isOverflow, timeToMinutes]);

  // Map hidden sessions to OverflowSessionItem for the popover
  const toOverflowItems = React.useCallback(
    (sessions: Session[]): OverflowSessionItem[] =>
      sessions.map((session) => {
        const firstEnrollment = enrollments.find((e) =>
          session.enrollmentIds?.includes(e.id)
        );
        const subject = firstEnrollment
          ? (subjects.find((s) => s.id === firstEnrollment.subjectId) ?? null)
          : null;
        const studentNames = (session.enrollmentIds || []).flatMap((eid) => {
          const enr = enrollments.find((e) => e.id === eid);
          const st = enr ? students.find((s) => s.id === enr.studentId) : null;
          return st ? [st.name] : [];
        });
        return { id: session.id, subject, studentNames };
      }),
    [enrollments, subjects, students]
  );

  return (
    <div
      className={`relative bg-[var(--color-bg-primary)] border-r border-[var(--color-border-grid)] ${className}`}
      data-testid={`time-table-column-${weekday}`}
      data-weekday={weekday}
      style={{ height: `${totalHeight}px`, width: `${width}px`, ...style }}
    >
      {/* Drop cells — timeSlots × effectiveLanes */}
      {timeSlots30Min.map((timeString, timeIndex) => {
        return Array.from({ length: effectiveLanes }, (_, laneIdx) => {
          const yPosition = laneIdx + 1;
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
                top: `${timeIndex * SLOT_HEIGHT_PX}px`,
                left: `${laneIdx * laneWidth}px`,
                width: `${laneWidth}px`,
                height: `${SLOT_HEIGHT_PX}px`,
                zIndex: isDragging ? 10 : 1,
              }}
            />
          );
        });
      })}

      {/* Session blocks (absolutely positioned, visible sessions only) */}
      {laidOutSessions.map(({ session, left, width: sWidth, top, height }) => (
        <SessionBlock
          key={session.id}
          session={session}
          subjects={(subjects || []).map((subject) => ({
            ...subject,
            color: subject.color || "#000000",
          }))}
          enrollments={enrollments}
          students={students}
          left={left}
          width={sWidth}
          yOffset={top}
          height={height}
          onClick={() => onSessionClick(session)}
          onDelete={
            onSessionDelete ? () => onSessionDelete(session) : undefined
          }
          onDragStart={(_e, s) => {
            if (onDragStart) {
              onDragStart(s);
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

      {/* Overflow pills — one per time slot where hidden sessions are active */}
      {isOverflow &&
        timeSlots30Min.map((timeString, timeIndex) => {
          const hidden = slotHiddenSessions[timeIndex] ?? [];
          if (hidden.length === 0) return null;
          return (
            <div
              key={`pill-${timeString}`}
              style={{
                position: "absolute",
                top: timeIndex * SLOT_HEIGHT_PX + 2,
                right: 2,
                height: SLOT_HEIGHT_PX - 4,
                width: 20,
                zIndex: 110,
              }}
              data-testid={`overflow-pill-wrapper-${timeString}`}
            >
              <button
                type="button"
                className="flex items-center justify-center w-full h-full text-[9px] font-bold text-white bg-[#27272A] rounded-sm hover:bg-[#3f3f46] transition-colors leading-none"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenPillSlot((prev) =>
                    prev === timeString ? null : timeString
                  );
                }}
                aria-label={`${hidden.length}개 세션 더 보기`}
                data-testid={`overflow-pill-${timeString}`}
              >
                +{hidden.length}
              </button>
              {openPillSlot === timeString && (
                <SessionOverflowPopover
                  title={`${timeString} 숨겨진 세션`}
                  items={toOverflowItems(hidden)}
                  onSelect={(id) => {
                    const session = hidden.find((s) => s.id === id);
                    if (session) onSessionClick(session);
                    setOpenPillSlot(null);
                  }}
                  onClose={() => setOpenPillSlot(null)}
                />
              )}
            </div>
          );
        })}
    </div>
  );
};

export default TimeTableRow;
