"use client";

import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { GradeBadge } from "@/components/atoms/GradeBadge";

interface SidebarStudent {
  id: string;
  name: string;
  grade?: string | null;
}
interface SidebarSubject {
  id: string;
  name: string;
  color?: string;
}
interface SidebarTeacher {
  id: string;
  name: string;
  color: string;
}

export interface PrimarySidebarProps {
  isOpen: boolean;
  onClose: () => void;

  /** cascading 적용된 narrowed list. */
  students: SidebarStudent[];
  /** cascading 이전 전체 수 — section header 의 "관련 N / 전체 M" badge 에 사용 */
  totalStudents: number;
  selectedStudentIds: string[];
  onToggleStudent: (id: string) => void;

  subjects: SidebarSubject[];
  totalSubjects: number;
  selectedSubjectIds: string[];
  onToggleSubject: (id: string) => void;

  teachers: SidebarTeacher[];
  totalTeachers: number;
  selectedTeacherIds: string[];
  onToggleTeacher: (id: string) => void;
}

type SectionKey = "student" | "subject" | "teacher";

export default function PrimarySidebar({
  isOpen,
  onClose,
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
}: PrimarySidebarProps) {
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Record<SectionKey, boolean>>({
    student: false,
    subject: false,
    teacher: false,
  });

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

  if (!isOpen) return null;

  const toggleSection = (key: SectionKey) =>
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <aside
      data-testid="primary-sidebar"
      className="shrink-0 w-[200px] border-r border-[var(--color-border)] flex flex-col bg-[var(--color-bg-primary)]"
    >
      <div className="px-3 py-2.5 border-b border-[var(--color-border)] flex items-center justify-between">
        <span className="text-[11px] font-semibold tracking-wider text-[var(--color-text-muted)] uppercase">
          필터
        </span>
        <button
          onClick={onClose}
          className="w-6 h-6 inline-flex items-center justify-center rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)]"
          aria-label="사이드바 닫기"
        >
          <X size={14} />
        </button>
      </div>

      <div className="px-3 py-2 border-b border-[var(--color-border)] relative">
        <Search
          size={13}
          className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none"
        />
        <input
          type="text"
          placeholder="검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)] pl-7 pr-2 py-1 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        <Section
          title="학생"
          count={students.length}
          total={totalStudents}
          selectedCount={selectedStudentIds.length}
          collapsed={collapsed.student}
          onToggleCollapse={() => toggleSection("student")}
          onClearAll={
            selectedStudentIds.length > 0
              ? () => selectedStudentIds.forEach(onToggleStudent)
              : undefined
          }
        >
          {filteredStudents.map((s) => (
            <StudentRow
              key={s.id}
              label={s.name}
              grade={s.grade ?? undefined}
              studentId={s.id}
              selected={selectedStudentIds.includes(s.id)}
              onToggle={() => onToggleStudent(s.id)}
            />
          ))}
        </Section>

        <Section
          title="과목"
          count={subjects.length}
          total={totalSubjects}
          selectedCount={selectedSubjectIds.length}
          collapsed={collapsed.subject}
          onToggleCollapse={() => toggleSection("subject")}
          onClearAll={
            selectedSubjectIds.length > 0
              ? () => selectedSubjectIds.forEach(onToggleSubject)
              : undefined
          }
        >
          {filteredSubjects.map((s) => (
            <Row
              key={s.id}
              label={s.name}
              dot={s.color}
              selected={selectedSubjectIds.includes(s.id)}
              onToggle={() => onToggleSubject(s.id)}
            />
          ))}
        </Section>

        <Section
          title="강사"
          count={teachers.length}
          total={totalTeachers}
          selectedCount={selectedTeacherIds.length}
          collapsed={collapsed.teacher}
          onToggleCollapse={() => toggleSection("teacher")}
          onClearAll={
            selectedTeacherIds.length > 0
              ? () => selectedTeacherIds.forEach(onToggleTeacher)
              : undefined
          }
        >
          {filteredTeachers.map((t) => (
            <Row
              key={t.id}
              label={t.name}
              dot={t.color}
              selected={selectedTeacherIds.includes(t.id)}
              onToggle={() => onToggleTeacher(t.id)}
            />
          ))}
        </Section>
      </div>
    </aside>
  );
}

interface SectionProps {
  title: string;
  /** cascading 적용된 visible 개수 */
  count: number;
  /** cascading 이전 전체 개수 — count < total 이면 narrowing 활성 (Variant C 표시) */
  total: number;
  selectedCount: number;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onClearAll?: () => void;
  badge?: string;
  children: React.ReactNode;
}

function Section({
  title,
  count,
  total,
  selectedCount,
  collapsed,
  onToggleCollapse,
  onClearAll,
  badge,
  children,
}: SectionProps) {
  // ADR-020 보강 (Variant C): cascading narrowing 시 "관련 N / 전체 M" 인지 표시.
  const isNarrowed = count < total;
  return (
    <div className="border-b border-[var(--color-border)] last:border-b-0">
      <button
        onClick={onToggleCollapse}
        className="w-full px-3 py-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] hover:bg-[var(--color-bg-secondary)] transition-colors"
        aria-expanded={!collapsed}
      >
        <span className="flex items-center gap-1.5">
          {collapsed ? (
            <ChevronRight size={12} />
          ) : (
            <ChevronLeft size={12} className="rotate-[-90deg]" />
          )}
          <span>{title}</span>
          {isNarrowed ? (
            <span className="normal-case tracking-normal">
              <span className="text-amber-400 font-medium">{count}</span>
              <span className="text-[var(--color-text-muted)]"> / {total}</span>
            </span>
          ) : (
            <span className="normal-case tracking-normal">({total})</span>
          )}
          {badge && (
            <span className="text-[8px] px-1 rounded bg-amber-500/15 text-amber-400 normal-case tracking-normal">
              {badge}
            </span>
          )}
        </span>
        {selectedCount > 0 && !collapsed && onClearAll && (
          <span
            role="button"
            onClick={(e) => {
              e.stopPropagation();
              onClearAll();
            }}
            className="text-[10px] text-[var(--color-accent)] hover:underline normal-case tracking-normal cursor-pointer"
          >
            {selectedCount} 해제
          </span>
        )}
        {selectedCount > 0 && !onClearAll && (
          <span className="text-[10px] text-[var(--color-accent)] normal-case tracking-normal">
            {selectedCount} 선택
          </span>
        )}
      </button>
      {!collapsed && <ul className="pb-1.5 px-1.5 space-y-0.5">{children}</ul>}
    </div>
  );
}

interface RowProps {
  label: string;
  dot?: string;
  selected: boolean;
  onToggle: () => void;
}

function Row({ label, dot, selected, onToggle }: RowProps) {
  return (
    <li>
      <button
        onClick={onToggle}
        className={`w-full text-left px-2 py-1 rounded text-sm flex items-center gap-2 transition-colors ${
          selected
            ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)] font-medium"
            : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]"
        }`}
        aria-pressed={selected}
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

interface StudentRowProps {
  label: string;
  grade?: string;
  studentId: string;
  selected: boolean;
  onToggle: () => void;
}

/**
 * 학생 전용 row — 학년 배지 + 이름. 사이드바 폭이 좁아 호버 툴팁은 보류
 * (StudentFilterChipBar / 모달 칩과 달리 사이드바는 폭 200px 컴팩트 영역).
 */
function StudentRow({ label, grade, studentId, selected, onToggle }: StudentRowProps) {
  return (
    <li>
      <button
        onClick={onToggle}
        className={`w-full text-left px-2 py-1 rounded text-sm flex items-center gap-2 transition-colors ${
          selected
            ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)] font-medium"
            : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]"
        }`}
        aria-pressed={selected}
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
        <GradeBadge grade={grade} testIdSuffix={studentId} />
        <span className="truncate">{label}</span>
      </button>
    </li>
  );
}
