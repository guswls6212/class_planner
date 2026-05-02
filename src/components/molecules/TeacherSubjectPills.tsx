"use client";

import type { Subject } from "@/lib/planner";

export interface TeacherSubjectPillsProps {
  subjects: Subject[];
  assignedSubjectIds: string[];
  canManage: boolean;
  onAdd: (subjectId: string) => void;
  onRemove: (subjectId: string) => void;
}

export function TeacherSubjectPills({
  subjects,
  assignedSubjectIds,
  canManage,
  onAdd,
  onRemove,
}: TeacherSubjectPillsProps) {
  if (subjects.length === 0) {
    return <p className="text-[11px] text-[var(--color-text-muted)]">과목을 먼저 등록해주세요.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {subjects.map((subject) => {
        const isAssigned = assignedSubjectIds.includes(subject.id);
        return (
          <button
            key={subject.id}
            type="button"
            onClick={() => {
              if (!canManage) return;
              isAssigned ? onRemove(subject.id) : onAdd(subject.id);
            }}
            disabled={!canManage}
            aria-pressed={isAssigned}
            className={[
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] transition-all",
              !canManage ? "cursor-default" : "",
              isAssigned
                ? "border border-[var(--color-accent)] text-[var(--color-text-primary)] font-medium"
                : "border border-[var(--color-border)] text-[var(--color-text-secondary)]" + (canManage ? " hover:border-[var(--color-accent)]" : ""),
            ].join(" ")}
            style={isAssigned ? { background: "rgba(167,139,250,0.12)" } : { background: "var(--color-bg-secondary)" }}
          >
            <span className="w-[5px] h-[5px] rounded-full" style={{ backgroundColor: subject.color ?? "#6366f1" }} />
            {subject.name}
          </button>
        );
      })}
    </div>
  );
}
