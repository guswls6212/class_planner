import React from "react";
import { Copy } from "lucide-react";
import type { Session, Subject } from "@/lib/planner";

interface DragOverlayCardProps {
  session: Session;
  subjects: Subject[];
  /** Ctrl/Meta + drag로 복사 모드면 + 아이콘 + "복사" 라벨 + opacity 강조 */
  isCopy?: boolean;
  /** 다중 선택된 경우 함께 처리되는 sessions 수 (>=2일 때 stack 효과 + 카운트 표기) */
  selectionCount?: number;
}

export default function DragOverlayCard({
  session,
  subjects,
  isCopy = false,
  selectionCount = 1,
}: DragOverlayCardProps) {
  const subject = subjects.find((s) => s.id === session.subjectId);
  const color = subject?.color ?? "#888";
  const isMulti = selectionCount > 1;

  return (
    <div className="relative pointer-events-none w-[120px]" data-testid="drag-overlay-card" data-copy={isCopy ? "true" : undefined}>
      {/* Stack 효과 — 다중 선택 시 뒤쪽에 카드 그림자 2장 */}
      {isMulti && (
        <>
          <div
            aria-hidden="true"
            className="absolute inset-0 rounded shadow-xl opacity-50 translate-x-1.5 translate-y-1.5 bg-[var(--overlay-card-color)]"
            style={{ "--overlay-card-color": color } as React.CSSProperties}
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 rounded shadow-xl opacity-70 translate-x-0.5 translate-y-0.5 bg-[var(--overlay-card-color)]"
            style={{ "--overlay-card-color": color } as React.CSSProperties}
          />
        </>
      )}
      <div
        className={[
          "relative rounded text-white text-[12px] font-semibold shadow-xl flex flex-col justify-center px-2 py-1 min-h-[56px] bg-[var(--overlay-card-color)]",
          isCopy ? "opacity-80 ring-2 ring-amber-300" : "opacity-90",
        ].join(" ")}
        style={{ "--overlay-card-color": color } as React.CSSProperties}
      >
        {isCopy && (
          <span
            aria-label="복사 모드"
            className="absolute -top-1 -right-1 z-[2] inline-flex h-5 items-center gap-0.5 rounded-full bg-amber-400 px-1.5 text-[9px] font-bold text-amber-950 shadow"
          >
            <Copy size={9} strokeWidth={2.5} /> 복사
          </span>
        )}
        {isMulti && (
          <span
            aria-label={`${selectionCount}개 함께 이동`}
            className="absolute -top-1 -left-1 z-[2] inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white px-1.5 text-[10px] font-bold text-gray-900 shadow"
          >
            {selectionCount}
          </span>
        )}
        <div className="truncate">{subject?.name ?? ""}</div>
        <div className="text-[10px] opacity-80">
          {session.startsAt}-{session.endsAt}
        </div>
      </div>
    </div>
  );
}
