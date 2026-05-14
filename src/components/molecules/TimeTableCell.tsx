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
  /**
   * 이 cell 의 (timeIndex, yPosition) 에 차지된 SessionBlock 의 top px (TimeTableRow
   * absolute 기준). overlay 가 cell 30분 slot 이 아닌 SessionBlock 전체 크기로
   * 펼쳐지도록 — 사용자 보고 "수업블록 크기만큼 dashed".
   */
  occupiedSessionTop?: number;
  occupiedSessionHeight?: number;
  /** 이 cell 의 absolute top (TimeTableRow 기준) — overlay 의 cell-relative offset 계산. */
  cellTop?: number;
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
  occupiedSessionTop,
  occupiedSessionHeight,
  cellTop,
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
          {/* hit area — left half (this lane 앞으로) / right half (this lane 뒤로).
              cursor 위치로 의도 분기. overlay 와 분리해 한쪽 isOver 면 cell 전체에
              overlay 노출 + 해당 boundary 강조선만 다르게. */}
          <div
            ref={leftHalfDrop.setNodeRef}
            data-insert-half="left"
            style={{ position: "absolute", inset: 0, right: "50%" }}
          />
          <div
            ref={rightHalfDrop.setNodeRef}
            data-insert-half="right"
            style={{ position: "absolute", inset: 0, left: "50%" }}
          />
          {/* overlay — cell 30분 slot 이 아닌 SessionBlock 전체 크기로 펼침.
              사용자 요청 (2026-05-14): 수업블록 크기만큼 dashed. 점유된 session
              정보 (occupiedSessionTop/Height) 가 있으면 그 size, 없으면 (빈 시간대)
              cell 자체 크기. boundary 강조선으로 left/right 의도 시각 분리. */}
          {(leftHalfDrop.isOver || rightHalfDrop.isOver) && (
            <div
              style={
                occupiedSessionTop != null &&
                occupiedSessionHeight != null &&
                cellTop != null
                  ? {
                      position: "absolute",
                      top: `${occupiedSessionTop - cellTop}px`,
                      left: 0,
                      right: 0,
                      height: `${occupiedSessionHeight}px`,
                      zIndex: 4,
                    }
                  : { position: "absolute", inset: 0, zIndex: 4 }
              }
              className="rounded-md border-2 border-dashed border-amber-400/90 bg-amber-300/25 flex items-center justify-center pointer-events-none"
            >
              <span className="text-[12px] font-bold text-amber-200 select-none whitespace-nowrap">
                여기 삽입
              </span>
              {leftHalfDrop.isOver && (
                <div className="absolute inset-y-0 left-0 w-1 bg-amber-400 rounded-l-md shadow-[0_0_8px_2px_rgba(251,191,36,0.6)]" />
              )}
              {rightHalfDrop.isOver && (
                <div className="absolute inset-y-0 right-0 w-1 bg-amber-400 rounded-r-md shadow-[0_0_8px_2px_rgba(251,191,36,0.6)]" />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
