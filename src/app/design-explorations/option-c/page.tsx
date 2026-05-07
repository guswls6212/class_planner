"use client";

import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  FileText,
  Filter,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  MOCK_STUDENTS,
  MOCK_SUBJECTS,
  MOCK_TEACHERS,
  PROTOTYPE_DATE_LABEL,
} from "../_mock/data";
import MockGrid from "../_mock/MockGrid";

type AutoColorBy = "student" | "subject" | "teacher";

export default function OptionC() {
  const [selectedStudents, setSelectedStudents] = useState<string[]>(["s1"]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);
  const [scrolled, setScrolled] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // 자동 colorBy: 단일 type 활성 시 그 type, 혼합/없음 시 subject (default)
  const colorBy: AutoColorBy = useMemo(() => {
    const hasStudent = selectedStudents.length > 0;
    const hasTeacher = selectedTeachers.length > 0;
    const hasSubject = selectedSubjects.length > 0;
    if (hasStudent && !hasTeacher && !hasSubject) return "student";
    if (hasTeacher && !hasStudent && !hasSubject) return "teacher";
    return "subject";
  }, [selectedStudents, selectedSubjects, selectedTeachers]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => setScrolled(el.scrollTop > 20);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const totalFilters =
    selectedStudents.length + selectedSubjects.length + selectedTeachers.length;

  const toggle =
    (setter: React.Dispatch<React.SetStateAction<string[]>>) =>
    (id: string) =>
      setter((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
      );

  const matches = (name: string) => !search || name.includes(search);
  const filteredStudents = MOCK_STUDENTS.filter((s) => matches(s.name));
  const filteredSubjects = MOCK_SUBJECTS.filter((s) => matches(s.name));
  const filteredTeachers = MOCK_TEACHERS.filter((t) => matches(t.name));

  return (
    <main className="flex flex-col h-screen overflow-hidden bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] relative">
      <header
        className={`shrink-0 border-b transition-all duration-300 ${
          scrolled
            ? "py-1.5 border-[var(--color-border)]/40"
            : "py-3 border-[var(--color-border)]"
        }`}
      >
        <div className="px-6 flex items-center justify-between gap-4">
          <div className="flex items-baseline gap-3 min-w-0">
            <Link
              href="/design-explorations"
              className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-accent)]"
            >
              ←
            </Link>
            <h1
              className={`font-bold tracking-tight transition-all duration-200 ${
                scrolled ? "text-base" : "text-2xl"
              }`}
            >
              주간 시간표
            </h1>
            {!scrolled && (
              <span className="text-xs text-[var(--color-text-muted)] hidden md:inline">
                {PROTOTYPE_DATE_LABEL}
              </span>
            )}
            <span className="text-[10px] text-[var(--color-accent)] uppercase tracking-wider">
              Option C
            </span>
            {scrolled && totalFilters > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-accent)]/15 text-[var(--color-accent)]">
                필터 {totalFilters}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              className="px-2.5 py-1 text-xs rounded-md border border-[var(--color-border)] hover:border-[var(--color-accent)] inline-flex items-center gap-1"
              title="템플릿"
            >
              <FileText size={11} />
              {!scrolled && <span>템플릿</span>}
            </button>
            <button
              className="px-2.5 py-1 text-xs rounded-md border border-[var(--color-border)] hover:border-[var(--color-accent)] inline-flex items-center gap-1"
              title="PDF 다운로드"
            >
              <Download size={11} />
              {!scrolled && <span>PDF</span>}
            </button>
          </div>
        </div>
      </header>

      <div ref={containerRef} className="flex-1 overflow-auto">
        <MockGrid selectedStudents={selectedStudents} />
        <div className="h-24" />
      </div>

      <div
        role="toolbar"
        aria-label="시간표 컨트롤"
        className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-[var(--color-bg-secondary)]/95 backdrop-blur-md shadow-2xl border border-[var(--color-border)]"
      >
        <button
          className="px-2 py-1 rounded-md hover:bg-[var(--color-bg-primary)] inline-flex items-center"
          aria-label="이전 주"
        >
          <ChevronLeft size={13} />
        </button>
        <span className="text-xs font-medium px-2 select-none">5/4 - 10</span>
        <button
          className="px-2 py-1 rounded-md hover:bg-[var(--color-bg-primary)] inline-flex items-center"
          aria-label="다음 주"
        >
          <ChevronRight size={13} />
        </button>
        <span className="w-px h-4 bg-[var(--color-border)] mx-1" />
        <button className="px-2 py-1 text-xs rounded-md hover:bg-[var(--color-bg-primary)]">
          오늘
        </button>
        <span className="w-px h-4 bg-[var(--color-border)] mx-1" />

        <div className="relative">
          <button
            onClick={() => setFilterOpen((o) => !o)}
            className={`px-2 py-1 text-xs rounded-md inline-flex items-center gap-1 transition-colors ${
              totalFilters > 0
                ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)]"
                : "hover:bg-[var(--color-bg-primary)]"
            }`}
            aria-haspopup="dialog"
            aria-expanded={filterOpen}
          >
            <Filter size={12} />
            <span>필터</span>
            {totalFilters > 0 && (
              <span className="ml-0.5 px-1.5 rounded-full bg-[var(--color-accent)] text-white text-[9px] font-bold leading-tight">
                {totalFilters}
              </span>
            )}
            <ChevronDown size={10} />
          </button>
          {filterOpen && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={() => setFilterOpen(false)}
                aria-hidden="true"
              />
              <div
                role="dialog"
                aria-label="필터"
                className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-30 w-[320px] max-h-[440px] flex flex-col rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] shadow-2xl"
              >
                <div className="p-2 border-b border-[var(--color-border)] relative">
                  <Search
                    size={13}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none"
                  />
                  <input
                    autoFocus
                    type="text"
                    placeholder="검색"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg-secondary)] pl-7 pr-2 py-1 text-sm outline-none focus:border-[var(--color-accent)]"
                  />
                </div>
                <div className="flex-1 overflow-y-auto">
                  <FilterSection title={`학생 (${MOCK_STUDENTS.length})`}>
                    {filteredStudents.map((s) => (
                      <FilterRow
                        key={s.id}
                        label={s.name}
                        selected={selectedStudents.includes(s.id)}
                        onToggle={() => toggle(setSelectedStudents)(s.id)}
                      />
                    ))}
                  </FilterSection>
                  <FilterSection
                    title={`과목 (${MOCK_SUBJECTS.length})`}
                    badge="placeholder"
                  >
                    {filteredSubjects.map((s) => (
                      <FilterRow
                        key={s.id}
                        label={s.name}
                        dot={s.color}
                        selected={selectedSubjects.includes(s.id)}
                        onToggle={() => toggle(setSelectedSubjects)(s.id)}
                      />
                    ))}
                  </FilterSection>
                  <FilterSection title={`강사 (${MOCK_TEACHERS.length})`}>
                    {filteredTeachers.map((t) => (
                      <FilterRow
                        key={t.id}
                        label={t.name}
                        dot={t.color}
                        selected={selectedTeachers.includes(t.id)}
                        onToggle={() => toggle(setSelectedTeachers)(t.id)}
                      />
                    ))}
                  </FilterSection>
                </div>
                <div className="p-2 border-t border-[var(--color-border)] flex justify-between items-center text-xs">
                  <span className="text-[var(--color-text-muted)]">
                    색상 모드: <span className="text-[var(--color-text-primary)] font-medium">{colorBy}</span>
                  </span>
                  {totalFilters > 0 && (
                    <button
                      onClick={() => {
                        setSelectedStudents([]);
                        setSelectedSubjects([]);
                        setSelectedTeachers([]);
                      }}
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

        <span className="w-px h-4 bg-[var(--color-border)] mx-1" />
        <button className="px-2 py-1 text-xs rounded-md hover:bg-[var(--color-bg-primary)] inline-flex items-center gap-1">
          <Clock size={12} />
          <span>9-23</span>
        </button>
        <span className="w-px h-4 bg-[var(--color-border)] mx-1" />
        <button className="px-2 py-1 text-xs rounded-md hover:bg-[var(--color-bg-primary)]">
          일
        </button>
        <button className="px-2 py-1 text-xs rounded-md bg-[var(--color-accent)] text-white">
          주
        </button>
        <button className="px-2 py-1 text-xs rounded-md hover:bg-[var(--color-bg-primary)]">
          월
        </button>
      </div>
    </main>
  );
}

function FilterSection({
  title,
  badge,
  children,
}: {
  title: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-[var(--color-border)] last:border-b-0">
      <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] flex items-center gap-1.5">
        {title}
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
