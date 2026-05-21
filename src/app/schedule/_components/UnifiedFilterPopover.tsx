"use client";

import {
  ChevronDown,
  Filter,
  PanelLeftOpen,
  Search,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { ColorByMode } from "../../../hooks/useColorBy";

interface FilterItem {
  id: string;
  name: string;
  color?: string;
}

export interface UnifiedFilterPopoverProps {
  /** cascading 적용된 narrowed list. 기존 selected + 매칭 session 의 entity 만 포함. */
  students: FilterItem[];
  /** cascading 이전 전체 수 — section header 의 "관련 N / 전체 M" badge 에 사용 */
  totalStudents: number;
  selectedStudentIds: string[];
  onToggleStudent: (id: string) => void;

  subjects: FilterItem[];
  totalSubjects: number;
  selectedSubjectIds: string[];
  onToggleSubject: (id: string) => void;

  teachers: FilterItem[];
  totalTeachers: number;
  selectedTeacherIds: string[];
  onToggleTeacher: (id: string) => void;

  onClearAll: () => void;
  onExpandToSidebar: () => void;
  /** 자동 colorBy 결정 결과 — popover 하단에 표시 */
  colorBy: ColorByMode;
}

const COLOR_LABEL: Record<ColorByMode, string> = {
  student: "학생",
  subject: "과목",
  teacher: "강사",
};

export default function UnifiedFilterPopover({
  students,
  totalStudents,
  selectedStudentIds,
  onToggleStudent,
  subjects,
  totalSubjects,
  selectedSubjectIds,
  onToggleSubject,
  teachers,
  totalTeachers,
  selectedTeacherIds,
  onToggleTeacher,
  onClearAll,
  onExpandToSidebar,
  colorBy,
}: UnifiedFilterPopoverProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const q = search.trim().toLowerCase();
  const matches = (name: string) => !q || name.toLowerCase().includes(q);
  const filteredStudents = useMemo(
    () => students.filter((s) => matches(s.name)),
    [students, q],
  );
  const filteredSubjects = useMemo(
    () => subjects.filter((s) => matches(s.name)),
    [subjects, q],
  );
  const filteredTeachers = useMemo(
    () => teachers.filter((t) => matches(t.name)),
    [teachers, q],
  );

  const totalSelected =
    selectedStudentIds.length +
    selectedSubjectIds.length +
    selectedTeacherIds.length;

  return (
    <div className="relative">
      <button
        type="button"
        data-testid="unified-filter-popover"
        onClick={() => setOpen((o) => !o)}
        className={`px-2 py-1 text-xs rounded-md inline-flex items-center gap-1 transition-colors ${
          totalSelected > 0
            ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)]"
            : "hover:bg-[var(--color-bg-primary)] text-[var(--color-text-secondary)]"
        }`}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Filter size={12} aria-hidden="true" />
        <span>필터</span>
        {totalSelected > 0 && (
          <span className="ml-0.5 px-1.5 rounded-full bg-[var(--color-accent)] text-white text-[9px] font-bold leading-tight">
            {totalSelected}
          </span>
        )}
        <ChevronDown size={10} aria-hidden="true" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-20"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-label="통합 필터"
            className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-30 w-[320px] max-h-[440px] flex flex-col rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] shadow-2xl"
          >
            <div className="p-2 border-b border-[var(--color-border)] relative">
              <Search
                size={13}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none"
                aria-hidden="true"
              />
              <input
                autoFocus
                type="text"
                placeholder="학생·과목·강사 검색"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg-secondary)] pl-7 pr-2 py-1 text-sm outline-none focus:border-[var(--color-accent)]"
              />
            </div>

            <div className="flex-1 overflow-y-auto">
              <FilterSection
                title="학생"
                count={students.length}
                total={totalStudents}
              >
                {filteredStudents.length === 0 ? (
                  <Empty />
                ) : (
                  filteredStudents.map((s) => (
                    <FilterRow
                      key={s.id}
                      label={s.name}
                      selected={selectedStudentIds.includes(s.id)}
                      onToggle={() => onToggleStudent(s.id)}
                    />
                  ))
                )}
              </FilterSection>

              <FilterSection
                title="과목"
                count={subjects.length}
                total={totalSubjects}
              >
                {filteredSubjects.length === 0 ? (
                  <Empty />
                ) : (
                  filteredSubjects.map((s) => (
                    <FilterRow
                      key={s.id}
                      label={s.name}
                      dot={s.color}
                      selected={selectedSubjectIds.includes(s.id)}
                      onToggle={() => onToggleSubject(s.id)}
                    />
                  ))
                )}
              </FilterSection>

              <FilterSection
                title="강사"
                count={teachers.length}
                total={totalTeachers}
              >
                {filteredTeachers.length === 0 ? (
                  <Empty />
                ) : (
                  filteredTeachers.map((t) => (
                    <FilterRow
                      key={t.id}
                      label={t.name}
                      dot={t.color}
                      selected={selectedTeacherIds.includes(t.id)}
                      onToggle={() => onToggleTeacher(t.id)}
                    />
                  ))
                )}
              </FilterSection>
            </div>

            <div className="p-2 border-t border-[var(--color-border)] flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onExpandToSidebar();
                }}
                className="inline-flex items-center gap-1 text-[var(--color-accent)] hover:underline"
              >
                <PanelLeftOpen size={11} aria-hidden="true" />
                사이드바로 펼치기
              </button>
              <span className="text-[10px] text-[var(--color-text-muted)]">
                색상 모드:{" "}
                <span className="text-[var(--color-text-primary)] font-medium">
                  {COLOR_LABEL[colorBy]}
                </span>
              </span>
              {totalSelected > 0 && (
                <button
                  type="button"
                  onClick={onClearAll}
                  className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                >
                  전체 해제
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function FilterSection({
  title,
  count,
  total,
  badge,
  children,
}: {
  title: string;
  /** cascading 적용된 visible 개수 — count < total 이면 narrowing 활성. */
  count?: number;
  /** cascading 이전 전체 개수 — Variant C "관련 N / 전체 M" 표시. */
  total?: number;
  badge?: string;
  children: React.ReactNode;
}) {
  // ADR-020 보강 (Variant C): cascading narrowing 시 "관련 N / 전체 M" 인지 표시.
  const isNarrowed = count !== undefined && total !== undefined && count < total;
  return (
    <div className="border-b border-[var(--color-border)] last:border-b-0">
      <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] flex items-center gap-1.5">
        <span>{title}</span>
        {count !== undefined && total !== undefined ? (
          isNarrowed ? (
            <span className="normal-case tracking-normal font-medium">
              <span className="text-amber-400">{count}</span>
              <span className="text-[var(--color-text-muted)]"> / {total}</span>
            </span>
          ) : (
            <span className="normal-case tracking-normal font-medium text-[var(--color-text-muted)]">
              ({total})
            </span>
          )
        ) : null}
        {badge && (
          <span className="text-[8px] px-1 py-px rounded bg-amber-500/15 text-amber-400 normal-case tracking-normal font-medium">
            {badge}
          </span>
        )}
      </div>
      <ul className="px-1.5 pb-1.5 space-y-0.5">{children}</ul>
    </div>
  );
}

function FilterRow({
  label,
  dot,
  selected,
  onToggle,
}: {
  label: string;
  dot?: string;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <li>
      <button
        onClick={onToggle}
        aria-pressed={selected}
        className={`w-full text-left px-2 py-1 rounded text-sm flex items-center gap-2 transition-colors ${
          selected
            ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)] font-medium"
            : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]"
        }`}
      >
        <span
          className={`w-3.5 h-3.5 rounded border-[1.5px] inline-flex items-center justify-center flex-shrink-0 ${
            selected
              ? "bg-[var(--color-accent)] border-[var(--color-accent)]"
              : "border-[var(--color-border)]"
          }`}
        >
          {selected && <span className="block text-[8px] text-white">✓</span>}
        </span>
        {dot && (
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: dot }}
            aria-hidden="true"
          />
        )}
        <span className="truncate">{label}</span>
      </button>
    </li>
  );
}

function Empty() {
  return (
    <li className="px-2 py-2 text-center text-xs text-[var(--color-text-muted)]">
      없음
    </li>
  );
}
