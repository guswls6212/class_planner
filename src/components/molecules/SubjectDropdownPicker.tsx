"use client";

/**
 * SubjectDropdownPicker — 과목 선택 dropdown.
 *
 * 사용자 명시 (2026-05-28): 강사 dropdown 과 동일 디자인으로 통일.
 * 기존: native <select> — 시각 OS-dependent + dot 표시 X + 통일 X.
 * 변경: 강사 dropdown 패턴 (color dot + 이름 + truncate + scrollIntoView).
 *
 * 책임: 과목 list 표시 + 선택 트리거 + dropdown panel 자연 스크롤.
 * non-goal: 과목 CRUD (caller 책임), 강사/학생 list.
 */

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export interface SubjectDropdownOption {
  id: string;
  name: string;
  color?: string;
}

interface SubjectDropdownPickerProps {
  subjects: SubjectDropdownOption[];
  selectedSubjectId: string | null;
  onSelect: (subjectId: string) => void;
  /** 빈 list 시 표시. default "과목 없음" */
  emptyLabel?: string;
  /** 미선택 placeholder. default "과목 선택" */
  placeholder?: string;
  className?: string;
}

const DEFAULT_COLOR = "#6366f1";

export default function SubjectDropdownPicker({
  subjects,
  selectedSubjectId,
  onSelect,
  emptyLabel = "과목 없음",
  placeholder = "과목 선택",
  className,
}: SubjectDropdownPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownPanelRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  const selected = subjects.find((s) => s.id === selectedSubjectId);

  // outside click → close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  // Escape → close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen]);

  // dropdown 펼침 시 modal scroll container 가 panel 까지 자연 스크롤 (TeacherDropdownPicker 와 동일).
  useEffect(() => {
    if (!isOpen) return;
    const id = window.requestAnimationFrame(() => {
      dropdownPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
    return () => window.cancelAnimationFrame(id);
  }, [isOpen]);

  if (subjects.length === 0) {
    return (
      <div className={`flex items-center gap-2 ${className ?? ""}`}>
        <span className="text-[12px] text-[var(--color-text-muted)]">{emptyLabel}</span>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        data-testid="subject-dropdown-trigger"
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)] hover:border-[var(--color-accent)] text-left transition-colors min-w-0"
      >
        {selected ? (
          <span className="flex items-center gap-2 min-w-0 flex-1">
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: selected.color ?? DEFAULT_COLOR }}
            />
            <span className="text-[13px] text-[var(--color-text-primary)] truncate">
              {selected.name}
            </span>
          </span>
        ) : (
          <span className="text-[13px] text-[var(--color-text-muted)]">{placeholder}</span>
        )}
        <ChevronDown size={14} className="text-[var(--color-text-muted)] flex-shrink-0" />
      </button>

      {isOpen && (
        <div
          ref={dropdownPanelRef}
          role="listbox"
          aria-label="과목 선택"
          data-testid="subject-dropdown-panel"
          /* TeacherDropdownPicker 와 동일 styling — border-amber-500/30 + bg-zinc-900 + shadow-lg + p-2 + space-y-1 (2026-05-28 디자인 통일) */
          className="absolute z-50 mt-1 w-full max-h-72 overflow-auto rounded-md border border-amber-500/30 bg-zinc-900 shadow-lg p-2 space-y-1"
        >
          {subjects.map((s) => {
            const isActive = selectedSubjectId === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  onSelect(s.id);
                  setIsOpen(false);
                }}
                data-testid={`subject-dropdown-item-${s.id}`}
                aria-pressed={isActive}
                title={s.name}
                className={`w-full flex items-center gap-2 p-2 rounded transition-colors text-left min-w-0 ${
                  isActive
                    ? "bg-amber-500/15 ring-1 ring-amber-500/30"
                    : "hover:bg-white/5"
                }`}
              >
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: s.color ?? DEFAULT_COLOR }}
                />
                {/* 긴 이름 truncate — title 속성 hover tooltip */}
                <span className="text-[12px] text-[var(--color-text-primary)] truncate flex-1 min-w-0">
                  {s.name}
                </span>
                {isActive && (
                  <span className="text-[10px] text-amber-300 flex-shrink-0">✓</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
