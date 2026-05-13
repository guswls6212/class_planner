"use client";

import { useDroppable } from "@dnd-kit/core";

interface Props {
  weekday: number;
  time: string;
  /**
   * 이 slot 에 drop 하면 lane (insertBeforeYPos) 앞에 새 lane 명시적 삽입.
   * 같은 시간 겹침 lane ≥ insertBeforeYPos 모두 +1 shift.
   *
   * Variant E (Edge Hover Slot) — omni-radar 2026-05-13 lane stack 사고 후속.
   */
  insertBeforeYPos: number;
  style?: React.CSSProperties;
}

export default function LaneInsertSlot({
  weekday,
  time,
  insertBeforeYPos,
  style,
}: Props) {
  const id = `${weekday}|${time}|insertBefore:${insertBeforeYPos}`;
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      aria-label={`lane ${insertBeforeYPos} 앞에 끼우기`}
      data-lane-insert-slot
      data-insert-before-ypos={insertBeforeYPos}
      style={style}
      className={
        isOver
          ? "rounded-md border-2 border-dashed border-amber-400/80 bg-amber-300/15 transition-all duration-150"
          : "transition-opacity duration-150"
      }
    >
      {isOver && (
        <div className="flex items-center justify-center h-full text-[10px] font-medium text-amber-300/90 select-none">
          여기에 끼우기
        </div>
      )}
    </div>
  );
}
