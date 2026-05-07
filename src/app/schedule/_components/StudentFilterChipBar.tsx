"use client";

import { useMemo, useState } from "react";
import type { DragEvent } from "react";

interface StudentFilterChipBarProps {
  students: { id: string; name: string }[];
  selectedStudentIds: string[];
  onToggleStudent: (id: string) => void;
  onClearFilter: () => void;
  onDragStart: (e: DragEvent<HTMLButtonElement>, student: { id: string; name: string }) => void;
  onDragEnd: (e: DragEvent<HTMLButtonElement>) => void;
  /** P3 — 활성 학생 + 검색 결과만 표시. default — 모든 학생 표시. */
  variant?: "default" | "active-only";
}

export default function StudentFilterChipBar({
  students,
  selectedStudentIds,
  onToggleStudent,
  onClearFilter,
  onDragStart,
  onDragEnd,
  variant = "default",
}: StudentFilterChipBarProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const isActiveOnly = variant === "active-only";

  const displayedStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (isActiveOnly) {
      return students.filter(
        (s) =>
          selectedStudentIds.includes(s.id) ||
          (q && s.name.toLowerCase().includes(q)),
      );
    }
    return students.filter((s) =>
      q ? s.name.toLowerCase().includes(q) : true,
    );
  }, [students, selectedStudentIds, searchQuery, isActiveOnly]);

  const hasFilter = selectedStudentIds.length > 0;
  const hiddenCount = isActiveOnly
    ? students.length - displayedStudents.length
    : 0;

  return (
    <div
      data-testid="student-filter-chip-bar"
      className="flex items-center gap-2 flex-wrap py-2 border-b border-[var(--color-border)] mb-3"
    >
      <button
        type="button"
        aria-label="학생 검색"
        onClick={() => setSearchOpen((v) => !v)}
        className="flex items-center justify-center w-7 h-7 rounded-full border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors text-sm"
      >
        🔍
      </button>

      {searchOpen && (
        <input
          type="text"
          placeholder="학생 이름 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          autoFocus
          className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-2 py-1 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)] w-36"
        />
      )}

      {displayedStudents.map((student) => {
        const isSelected = selectedStudentIds.includes(student.id);
        return (
          <button
            key={student.id}
            type="button"
            draggable
            onDragStart={(e) => onDragStart(e, student)}
            onDragEnd={onDragEnd}
            onClick={() => onToggleStudent(student.id)}
            aria-pressed={isSelected}
            className={`px-2.5 py-1 rounded-full text-sm transition-colors cursor-grab active:cursor-grabbing ${
              isSelected
                ? "bg-accent text-white font-medium shadow-sm"
                : "border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            }`}
          >
            {student.name}
          </button>
        );
      })}

      {isActiveOnly && hiddenCount > 0 && !searchQuery.trim() && (
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="px-2.5 py-1 rounded-full text-xs text-[var(--color-text-muted)] border border-dashed border-[var(--color-border)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-accent)] transition-colors"
          aria-label={`${hiddenCount}명 더 — 검색으로 추가`}
        >
          + {hiddenCount}명 (검색)
        </button>
      )}

      {hasFilter && (
        <button
          type="button"
          onClick={onClearFilter}
          className="ml-auto px-2.5 py-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          전체 해제
        </button>
      )}
    </div>
  );
}
