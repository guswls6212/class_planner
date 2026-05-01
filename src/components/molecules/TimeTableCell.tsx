"use client";
import React from "react";
import { useDroppable } from "@dnd-kit/core";

interface TimeTableCellProps {
  weekday: number;
  time: string;
  yPosition?: number;
  onDrop: (weekday: number, time: string, enrollmentId: string) => void;
  onEmptySpaceClick: (weekday: number, time: string) => void;
  style?: React.CSSProperties;
  isReadOnly?: boolean;
}

/**
 * TimeTableCell — dnd-kit drop zone for session drag + HTML5 drop for enrollment.
 * One cell = one (time, yPosition) slot within a weekday column.
 *
 * Session drops: handled by DndContext.onDragEnd (id format: "weekday:time:yPosition").
 * Enrollment drops: handled here via HTML5 onDrop (student chip drag).
 */
export default function TimeTableCell({
  weekday,
  time,
  yPosition = 1,
  onDrop,
  onEmptySpaceClick,
  style,
  isReadOnly = false,
}: TimeTableCellProps) {
  // dnd-kit drop zone. id format: "weekday:time:yPosition" (parsed in DndContext.onDragEnd)
  const { setNodeRef } = useDroppable({ id: `${weekday}:${time}:${yPosition}` });

  // HTML5 drop kept for enrollment (student chip) drag only
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isReadOnly) return;
    const data = e.dataTransfer?.getData("text/plain");
    // session: prefix is handled by DndContext.onDragEnd — ignore here
    if (!data || data.startsWith("session:")) return;
    if (e.dataTransfer && typeof e.dataTransfer.clearData === "function") {
      e.dataTransfer.clearData();
    }
    onDrop(weekday, time, data);
  };

  // Required so browser accepts HTML5 enrollment drops
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleClick = () => {
    if (isReadOnly) return;
    onEmptySpaceClick(weekday, time);
  };

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, cursor: "pointer", pointerEvents: "auto" as const }}
      data-testid={`time-table-cell-${weekday}-${time}`}
      data-drop-zone="true"
      data-weekday={weekday}
      data-time={time}
      data-y-position={yPosition}
      draggable={false}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
    />
  );
}
