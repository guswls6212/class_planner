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
  /**
   * drag 중일 때 true — cell 을 left/right half 두 `insertBefore` droppable 로
   * 분할 (Variant E). cursor 가 cell 의 어느 절반 위에 있든 자동으로 가까운 lane
   * boundary insert 의도로 매핑된다 — 사용자가 "이 lane 앞/뒤로 끼우기" 의도를
   * 가운데 hover 만으로도 표현 가능.
   *
   * left half  → `weekday|time|insertBefore:${yPosition}`
   * right half → `weekday|time|insertBefore:${yPosition + 1}`
   *
   * 평소 (false) 엔 기존 lane occupy droppable (`weekday|time|yPosition`) 사용 —
   * 빈 시간대 empty space click + enrollment HTML5 drop 도 그대로 동작.
   *
   * Cmd/Ctrl 복사 drag 시엔 호출부에서 false 유지 — 복사 의도는 lane reorder 와
   * 무관 (T10b 회귀 가드).
   */
  insertMode?: boolean;
}

/**
 * TimeTableCell — dnd-kit drop zone for session drag + HTML5 drop for enrollment.
 * One cell = one (time, yPosition) slot within a weekday column.
 *
 * Session drops: handled by DndContext.onDragEnd (id format: "weekday|time|yPosition"
 * 또는 insertMode 일 때 "weekday|time|insertBefore:N").
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
  insertMode = false,
}: TimeTableCellProps) {
  // 일반 lane occupy droppable — drag 안 할 때 (또는 복사 drag) 만 활성.
  const laneDrop = useDroppable({
    id: `${weekday}|${time}|${yPosition}`,
    disabled: insertMode,
  });
  // insertMode 시 left/right half 분할 — cell 가운데 hover 만으로도 가까운 boundary insert.
  const leftHalfDrop = useDroppable({
    id: `${weekday}|${time}|insertBefore:${yPosition}`,
    disabled: !insertMode,
  });
  const rightHalfDrop = useDroppable({
    id: `${weekday}|${time}|insertBefore:${yPosition + 1}`,
    disabled: !insertMode,
  });

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
    if (isReadOnly || insertMode) return;
    onEmptySpaceClick(weekday, time);
  };

  return (
    <div
      ref={insertMode ? undefined : laneDrop.setNodeRef}
      style={{ ...style, cursor: "pointer", pointerEvents: "auto" as const, position: style?.position ?? "absolute" }}
      data-testid={`time-table-cell-${weekday}-${time}`}
      data-drop-zone="true"
      data-weekday={weekday}
      data-time={time}
      data-y-position={yPosition}
      draggable={false}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      {insertMode && (
        <>
          {/* left half — insertBefore:yPosition (이 lane 앞으로) */}
          <div
            ref={leftHalfDrop.setNodeRef}
            data-insert-half="left"
            style={{ position: "absolute", inset: 0, right: "50%" }}
          >
            {leftHalfDrop.isOver && (
              <div className="absolute inset-y-0 -left-3 right-1 rounded-md border-2 border-dashed border-amber-400/90 bg-amber-300/25 flex items-center justify-center pointer-events-none">
                <span className="text-[11px] font-bold text-amber-200 select-none whitespace-nowrap">
                  여기 끼우기
                </span>
              </div>
            )}
          </div>
          {/* right half — insertBefore:yPosition+1 (이 lane 뒤로) */}
          <div
            ref={rightHalfDrop.setNodeRef}
            data-insert-half="right"
            style={{ position: "absolute", inset: 0, left: "50%" }}
          >
            {rightHalfDrop.isOver && (
              <div className="absolute inset-y-0 left-1 -right-3 rounded-md border-2 border-dashed border-amber-400/90 bg-amber-300/25 flex items-center justify-center pointer-events-none">
                <span className="text-[11px] font-bold text-amber-200 select-none whitespace-nowrap">
                  여기 끼우기
                </span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
