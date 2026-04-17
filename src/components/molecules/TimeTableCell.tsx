"use client";
import React, { useEffect, useState } from "react";
import { logger } from "../../lib/logger";
import { SESSION_CELL_HEIGHT } from "@/shared/constants/sessionConstants";

import type { Session } from "../../lib/planner";

interface DragPreviewState {
  draggedSession: Session | null;
  targetWeekday: number | null;
  targetTime: string | null;
  targetYPosition: number | null;
}

interface TimeTableCellProps {
  weekday: number;
  time: string;
  yPosition?: number; // logical y-position (1-based) for this cell row — default 1
  onDrop: (weekday: number, time: string, enrollmentId: string) => void;
  onSessionDrop?: (sessionId: string, weekday: number, time: string, yPosition: number) => void;
  onEmptySpaceClick: (weekday: number, time: string) => void;
  onDragOver?: (weekday: number, time: string, yPosition: number) => void;
  style?: React.CSSProperties;
  // drag state
  isAnyDragging?: boolean;
  isDragging?: boolean;
  dragPreview?: DragPreviewState | null;
  isReadOnly?: boolean;
}

/**
 * TimeTableCell — absorbs DropZone drag handling logic.
 * Replaces the standalone DropZone component.
 * One cell = one (time, yPosition) slot within a weekday column.
 */
export default function TimeTableCell({
  weekday,
  time,
  yPosition = 1,
  onDrop,
  onSessionDrop,
  onEmptySpaceClick,
  onDragOver,
  style,
  isAnyDragging = false,
  isDragging = false,
  dragPreview = null,
  isReadOnly = false,
}: TimeTableCellProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  // Reset drag-over state when global drag ends
  useEffect(() => {
    if (!isAnyDragging) {
      setIsDragOver(false);
    }
  }, [isAnyDragging]);

  const handleDragEnter = (e: React.DragEvent) => {
    logger.debug("TimeTableCell handleDragEnter", { weekday, time, yPosition });
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
    if (e.dataTransfer) {
      if (e.dataTransfer.effectAllowed === "move") {
        e.dataTransfer.dropEffect = "move";
      } else {
        e.dataTransfer.dropEffect = "copy";
      }
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
    if (e.dataTransfer) {
      if (e.dataTransfer.effectAllowed === "move") {
        e.dataTransfer.dropEffect = "move";
      } else {
        e.dataTransfer.dropEffect = "copy";
      }
    }
    if (onDragOver) {
      const pixelYPosition = (yPosition - 1) * SESSION_CELL_HEIGHT;
      onDragOver(weekday, time, pixelYPosition);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    logger.debug("TimeTableCell handleDrop", { weekday, time, yPosition });
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (isReadOnly) return;

    const data = e.dataTransfer?.getData("text/plain");
    logger.debug("TimeTableCell 드롭 데이터", { data });

    if (e.dataTransfer && typeof e.dataTransfer.clearData === "function") {
      e.dataTransfer.clearData();
    }

    if (data) {
      if (data.startsWith("session:")) {
        // Session drag: "session:{sessionId}"
        const sessionId = data.replace("session:", "");
        logger.debug("세션 드롭 처리", { sessionId });
        const pixelYPosition = (yPosition - 1) * SESSION_CELL_HEIGHT;
        if (onSessionDrop) {
          onSessionDrop(sessionId, weekday, time, pixelYPosition);
        }
      } else {
        // Enrollment drag
        logger.debug("enrollment 드롭 처리", { data });
        if (onDrop) {
          onDrop(weekday, time, data);
        }
      }
    } else {
      logger.debug("TimeTableCell: 드롭 데이터가 없음");
    }

    try {
      (document.activeElement as HTMLElement)?.blur?.();
    } catch {
      // ignore
    }
  };

  const handleClick = () => {
    if (isReadOnly) return;
    if (onEmptySpaceClick) {
      onEmptySpaceClick(weekday, time);
    }
  };

  const showBorder = isDragOver;

  const styles: React.CSSProperties = {
    ...style,
    border: showBorder
      ? "2px dashed var(--color-primary)"
      : "1px dashed transparent",
    backgroundColor: showBorder
      ? "var(--color-primary-light)"
      : style?.backgroundColor || "transparent",
    cursor: "pointer",
    pointerEvents: "auto" as const,
    ...(isDragging &&
      !showBorder && {
        backgroundColor: "var(--color-bg-secondary)",
      }),
  };

  return (
    <div
      style={styles}
      data-testid={`time-table-cell-${weekday}-${time}`}
      data-drop-zone="true"
      data-weekday={weekday}
      data-time={time}
      data-y-position={yPosition}
      draggable={false}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
    />
  );
}
