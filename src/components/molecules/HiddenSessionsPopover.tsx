import React, { useEffect, useRef } from "react";
import { useDraggable } from "@dnd-kit/core";
import type { Session, Subject } from "../../lib/planner";

interface HiddenSessionsPopoverProps {
  hiddenSessions: Session[];
  subjects: Subject[];
  enrollments: Array<{ id: string; studentId: string; subjectId: string }>;
  students: Array<{ id: string; name: string }>;
  anchorTop: number;
  onClose: () => void;
  onExpandAll: () => void;
}

function DraggableSessionCard({
  session,
  subjects,
  enrollments,
  students,
}: {
  session: Session;
  subjects: Subject[];
  enrollments: Array<{ id: string; studentId: string; subjectId: string }>;
  students: Array<{ id: string; name: string }>;
}) {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: session.id,
    data: { session },
  });

  const subject = subjects.find((s) => s.id === session.subjectId);
  const studentNames = (session.enrollmentIds ?? [])
    .map((eid) => {
      const enr = enrollments.find((e) => e.id === eid);
      return students.find((s) => s.id === enr?.studentId)?.name;
    })
    .filter(Boolean) as string[];

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      data-testid={`overflow-popover-session-${session.id}`}
      className="flex items-start gap-1.5 px-3 py-1.5 cursor-grab hover:bg-[var(--color-bg-hover)] active:cursor-grabbing"
      style={{ userSelect: "none" }}
      onClick={(e) => e.stopPropagation()}
    >
      <span
        className="mt-[3px] shrink-0 rounded-full"
        style={{ width: 8, height: 8, background: subject?.color ?? "#888" }}
      />
      <div className="min-w-0">
        <div className="text-[10px] font-semibold text-[var(--color-text-primary)] truncate leading-tight">
          {subject?.name ?? ""}
        </div>
        <div className="text-[9px] text-[var(--color-text-secondary)] leading-tight">
          {session.startsAt}–{session.endsAt}
        </div>
        {studentNames.length > 0 && (
          <div className="text-[9px] text-[var(--color-text-secondary)] truncate leading-tight">
            {studentNames.join(", ")}
          </div>
        )}
      </div>
    </div>
  );
}

export const HiddenSessionsPopover: React.FC<HiddenSessionsPopoverProps> = ({
  hiddenSessions,
  subjects,
  enrollments,
  students,
  anchorTop,
  onClose,
  onExpandAll,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  // Click-outside → close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <>
      {/* Backdrop — full-page catch for click-outside (below popover) */}
      <div
        data-testid="overflow-popover-backdrop"
        className="fixed inset-0"
        style={{ zIndex: 119 }}
        onClick={onClose}
      />

      {/* Popover card */}
      <div
        ref={popoverRef}
        data-testid="overflow-popover"
        className="absolute right-0 min-w-[130px] rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] shadow-lg"
        style={{ top: anchorTop, zIndex: 120, padding: "6px 0" }}
      >
        {hiddenSessions.map((session) => (
          <DraggableSessionCard
            key={session.id}
            session={session}
            subjects={subjects}
            enrollments={enrollments}
            students={students}
          />
        ))}

        <hr className="my-1 border-[var(--color-border)]" />

        <button
          type="button"
          data-testid="overflow-popover-expand-btn"
          className="w-full px-3 py-1.5 text-left text-[10px] font-medium text-[var(--color-accent)] hover:bg-[var(--color-bg-hover)] cursor-pointer"
          onClick={onExpandAll}
        >
          모두 펼치기
        </button>
      </div>
    </>
  );
};

export default HiddenSessionsPopover;
