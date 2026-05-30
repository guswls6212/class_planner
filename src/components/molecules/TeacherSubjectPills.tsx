"use client";

import type { Subject } from "@/lib/planner";
import { EmptyState } from "@/components/atoms/EmptyState";

export interface TeacherSubjectPillsProps {
  subjects: Subject[];
  assignedSubjectIds: string[];
  canManage: boolean;
  /**
   * - "view" (default): 담당 과목만 표시, 클릭 비활성 (display-only)
   * - "edit": 전체 과목 표시, 클릭으로 toggle (add/remove 호출)
   * 편집 의도 명시 — 평소 화면에서 실수 클릭 방지.
   */
  mode?: "view" | "edit";
  onAdd: (subjectId: string) => void;
  onRemove: (subjectId: string) => void;
}

export function TeacherSubjectPills({
  subjects,
  assignedSubjectIds,
  canManage,
  mode = "view",
  onAdd,
  onRemove,
}: TeacherSubjectPillsProps) {
  if (subjects.length === 0) {
    return <EmptyState>과목을 먼저 등록해주세요.</EmptyState>;
  }

  const isEdit = mode === "edit" && canManage;
  // view 모드는 assigned 만, edit 모드는 전체 — 사용자 결정 PR #348 (2026-05-11).
  const visibleSubjects = isEdit
    ? subjects
    : subjects.filter((s) => assignedSubjectIds.includes(s.id));

  if (!isEdit && visibleSubjects.length === 0) {
    return (
      <EmptyState data-testid="teacher-subjects-empty">
        등록된 담당 과목이 없습니다. 편집 버튼을 눌러 추가해주세요.
      </EmptyState>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {visibleSubjects.map((subject) => {
        const isAssigned = assignedSubjectIds.includes(subject.id);
        const interactive = isEdit;
        return (
          <button
            key={subject.id}
            type="button"
            onClick={() => {
              if (!interactive) return;
              if (isAssigned) onRemove(subject.id);
              else onAdd(subject.id);
            }}
            disabled={!interactive}
            aria-pressed={isAssigned}
            className={[
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] transition-all",
              !interactive ? "cursor-default" : "",
              isAssigned
                ? "border border-[var(--color-accent)] text-[var(--color-text-primary)] font-medium"
                : "border border-[var(--color-border)] text-[var(--color-text-secondary)]" +
                  (interactive ? " hover:border-[var(--color-accent)]" : ""),
            ].join(" ")}
            style={
              isAssigned
                ? { background: "rgba(167,139,250,0.12)" }
                : { background: "var(--color-bg-secondary)" }
            }
          >
            <span
              className="w-[5px] h-[5px] rounded-full"
              style={{ backgroundColor: subject.color ?? "#6366f1" }}
            />
            {subject.name}
          </button>
        );
      })}
    </div>
  );
}
