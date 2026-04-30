"use client";

import { useState } from "react";

interface TeacherFilterChipBarProps {
  teachers: { id: string; name: string; color: string }[];
  selectedTeacherIds: string[];
  onToggleTeacher: (id: string) => void;
  onClearFilter: () => void;
}

export default function TeacherFilterChipBar({
  teachers,
  selectedTeacherIds,
  onToggleTeacher,
  onClearFilter,
}: TeacherFilterChipBarProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const visibleTeachers = teachers.filter((t) =>
    searchQuery.trim()
      ? t.name.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  );

  const hasFilter = selectedTeacherIds.length > 0;

  return (
    <div
      data-testid="teacher-filter-chip-bar"
      className="flex items-center gap-2 flex-wrap py-2 border-b border-[var(--color-border)] mb-3"
    >
      <button
        type="button"
        aria-label="강사 검색"
        onClick={() => setSearchOpen((v) => !v)}
        className="flex items-center justify-center w-7 h-7 rounded-full border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors text-sm"
      >
        🔍
      </button>

      {searchOpen && (
        <input
          type="text"
          placeholder="강사 이름 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          autoFocus
          className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-2 py-1 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)] w-36"
        />
      )}

      {visibleTeachers.map((teacher) => {
        const isSelected = selectedTeacherIds.includes(teacher.id);
        return (
          <button
            key={teacher.id}
            type="button"
            onClick={() => onToggleTeacher(teacher.id)}
            aria-pressed={isSelected}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm transition-colors ${
              isSelected
                ? "bg-accent text-white font-medium shadow-sm"
                : "border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            }`}
          >
            <span
              className="w-[5px] h-[5px] rounded-full flex-shrink-0"
              style={{ backgroundColor: teacher.color }}
            />
            {teacher.name}
          </button>
        );
      })}

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
