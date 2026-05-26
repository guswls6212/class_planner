"use client";

import { useMemo, useState } from "react";
import { filterTeachersForPicker, type TeacherRoleLike } from "@/lib/teacherPickerFilter";
import { TeacherChip } from "@/components/molecules/TeacherChip";
import { RoleBadge } from "@/components/atoms/RoleBadge";

interface TeacherFilterChipBarProps {
  teachers: {
    id: string;
    name: string;
    color: string;
    role?: TeacherRoleLike;
    email?: string | null;
    phone?: string | null;
  }[];
  selectedTeacherIds: string[];
  onToggleTeacher: (id: string) => void;
  onClearFilter: () => void;
  /** P3 — 활성 강사 + 검색 결과만 표시. default — 모든 강사 표시. */
  variant?: "default" | "active-only";
}

export default function TeacherFilterChipBar({
  teachers,
  selectedTeacherIds,
  onToggleTeacher,
  onClearFilter,
  variant = "default",
}: TeacherFilterChipBarProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const isActiveOnly = variant === "active-only";

  // ADR-015: admin/owner 강사는 chip bar 기본 제외, 단 selected는 보존(legacy filter 안정성).
  const visibleTeachers = useMemo(
    () => filterTeachersForPicker(teachers, selectedTeacherIds),
    [teachers, selectedTeacherIds],
  );
  // 동명이인 부제는 TeacherChip 내부 호버 툴팁이 담당 — 인라인 부제 더 이상 필요 없음.

  const displayedTeachers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (isActiveOnly) {
      return visibleTeachers.filter(
        (t) =>
          selectedTeacherIds.includes(t.id) ||
          (q && t.name.toLowerCase().includes(q)),
      );
    }
    return visibleTeachers.filter((t) =>
      q ? t.name.toLowerCase().includes(q) : true,
    );
  }, [visibleTeachers, selectedTeacherIds, searchQuery, isActiveOnly]);

  const hasFilter = selectedTeacherIds.length > 0;
  const hiddenCount = isActiveOnly
    ? visibleTeachers.length - displayedTeachers.length
    : 0;

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

      {displayedTeachers.map((teacher) => {
        const isSelected = selectedTeacherIds.includes(teacher.id);
        return (
          <TeacherChip
            key={teacher.id}
            teacher={teacher}
            selected={isSelected}
            onClick={() => onToggleTeacher(teacher.id)}
            contextTag={<RoleBadge role={teacher.role} size="xs" />}
          />
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
