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
      className="relative"
    >
      {/* 상시 hint — drag 중 lane 경계 위치 인지. drag 안 할 땐 mount 안 됨. */}
      <div
        className={
          isOver
            ? "absolute inset-y-0 left-1/2 -translate-x-1/2 w-[4px] rounded bg-amber-400 shadow-[0_0_8px_2px_rgba(251,191,36,0.6)] transition-all duration-100"
            : "absolute inset-y-0 left-1/2 -translate-x-1/2 w-[4px] rounded bg-amber-400/70 transition-all duration-100"
        }
      />
      {/* isOver 시 강조 overlay — pointer-events-none 으로 hit area 비침범. */}
      {isOver && (
        <div className="absolute -inset-x-14 inset-y-0 rounded-md border-2 border-dashed border-amber-400/90 bg-amber-300/25 flex items-center justify-center pointer-events-none">
          <span className="text-[11px] font-bold text-amber-200 select-none whitespace-nowrap">
            여기 끼우기
          </span>
        </div>
      )}
    </div>
  );
}
