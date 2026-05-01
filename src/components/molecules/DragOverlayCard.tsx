import React from "react";
import type { Session, Subject } from "@/lib/planner";

interface DragOverlayCardProps {
  session: Session;
  subjects: Subject[];
}

export default function DragOverlayCard({ session, subjects }: DragOverlayCardProps) {
  const subject = subjects.find((s) => s.id === session.subjectId);
  const color = subject?.color ?? "#888";

  return (
    <div
      className="rounded text-white text-[12px] font-semibold shadow-xl opacity-90 flex flex-col justify-center px-2 py-1 pointer-events-none w-[120px] min-h-[56px] bg-[var(--overlay-card-color)]"
      style={{ "--overlay-card-color": color } as React.CSSProperties}
    >
      <div className="truncate">{subject?.name ?? ""}</div>
      <div className="text-[10px] opacity-80">
        {session.startsAt}-{session.endsAt}
      </div>
    </div>
  );
}
