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
   *
   * NOTE: cell 은 hit-test droppable 만 담당. amber overlay ("여기 삽입") 의 시각
   * 렌더는 TimeTableRow 가 ghost 좌표 (laidOutSessions) 기반으로 그린다.
   * dnd-visual-feedback.md § 3 데이터 흐름 참조.
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
  // id 는 cell 좌표 + half 명시로 unique. parse 측에서 leftHalf→insertBefore:yPos,
  // rightHalf→insertBefore:yPos+1 매핑. 같은 insertBeforeYPos 가 인접 cell 두 곳
  // (이 cell 의 right half + 다음 cell 의 left half) 에서 같은 droppable id 로
  // 등록되면 dnd-kit collision detection 가 한 곳만 인식해 cursor 위치와 overlay
  // 표시 mismatch 회귀 (사용자 보고 2026-05-14: rightmost lane drop hint 가 다음
  // lane 으로 표시).
  const leftHalfDrop = useDroppable({
    id: `${weekday}|${time}|${yPosition}|leftHalf`,
    disabled: !insertMode,
  });
  const rightHalfDrop = useDroppable({
    id: `${weekday}|${time}|${yPosition}|rightHalf`,
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
              cursor 위치로 의도 분기. amber overlay 시각 렌더는 TimeTableRow 가
              ghost 좌표 (laidOutSessions) 기반으로 그린다 — 본 cell 은 hit-test 만. */}
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
        </>
      )}
    </div>
  );
}
