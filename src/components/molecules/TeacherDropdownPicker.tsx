"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { NAME_MAX_LENGTH } from "@/lib/validation/profileSchemas";
import {
  filterTeachersForPicker,
  type TeacherRoleLike,
} from "@/lib/teacherPickerFilter";
import { RoleBadge } from "@/components/atoms/RoleBadge";

export interface TeacherDropdownOption {
  id: string;
  name: string;
  color: string;
  role?: TeacherRoleLike;
  email?: string | null;
  phone?: string | null;
  subjectIds?: string[];
}

interface TeacherDropdownPickerProps {
  teachers: TeacherDropdownOption[];
  selectedTeacherId?: string | null;
  onSelect: (teacherId: string | null) => void;
  className?: string;
  canManage?: boolean;
  inputValue?: string;
  setInputValue?: (val: string) => void;
  onCreate?: () => Promise<boolean>;
  creating?: boolean;
  createError?: string;
  subjectId?: string;
  subjectName?: string;
}

export default function TeacherDropdownPicker({
  teachers,
  selectedTeacherId,
  onSelect,
  className,
  canManage,
  inputValue,
  setInputValue,
  onCreate,
  creating,
  createError,
  subjectId,
  subjectName,
}: TeacherDropdownPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expanding, setExpanding] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const visibleTeachers = useMemo(
    () => filterTeachersForPicker(teachers, selectedTeacherId ?? null),
    [teachers, selectedTeacherId],
  );

  const { primary, secondary, grouped } = useMemo(() => {
    if (!subjectId) {
      return { primary: visibleTeachers, secondary: [], grouped: false };
    }
    const primaryList = visibleTeachers.filter((t) =>
      (t.subjectIds ?? []).includes(subjectId),
    );
    const secondaryList = visibleTeachers.filter(
      (t) => !(t.subjectIds ?? []).includes(subjectId),
    );
    return { primary: primaryList, secondary: secondaryList, grouped: true };
  }, [visibleTeachers, subjectId]);

  const selected = visibleTeachers.find((t) => t.id === selectedTeacherId);

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

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen]);

  const showInlineCreate = Boolean(canManage && onCreate && setInputValue);

  const renderItem = (teacher: TeacherDropdownOption) => {
    const isActive = selectedTeacherId === teacher.id;
    return (
      <button
        key={teacher.id}
        type="button"
        onClick={() => {
          onSelect(isActive ? null : teacher.id);
          setIsOpen(false);
        }}
        data-testid={`teacher-dropdown-item-${teacher.id}`}
        aria-pressed={isActive}
        className={`w-full flex items-center gap-2 p-2 rounded transition-colors text-left ${
          isActive
            ? "bg-amber-500/15 ring-1 ring-amber-500/30"
            : "hover:bg-white/5"
        }`}
      >
        <span
          className="w-3 h-3 rounded-full shrink-0"
          style={{ backgroundColor: teacher.color }}
        />
        <span className="text-[12px] text-[var(--color-text-primary)]">
          {teacher.name}
        </span>
        <RoleBadge role={teacher.role} size="xs" className="ml-1" />
        {isActive && (
          <span className="ml-auto text-[10px] text-amber-300">✓</span>
        )}
      </button>
    );
  };

  if (visibleTeachers.length === 0 && !showInlineCreate) {
    return (
      <div className={`flex items-center gap-2 ${className ?? ""}`}>
        <span className="text-[12px] text-[var(--color-text-muted)]">
          강사 없음
        </span>
        <Link
          href="/teachers"
          target="_blank"
          className="text-[12px] text-[var(--color-accent)] hover:underline"
        >
          강사 등록 →
        </Link>
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
        data-testid="teacher-dropdown-trigger"
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)] hover:border-[var(--color-accent)] text-left transition-colors"
      >
        <span className="flex items-center gap-2 min-w-0">
          {selected ? (
            <>
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: selected.color }}
              />
              <span className="text-[12px] text-[var(--color-text-primary)] truncate">
                {selected.name}
              </span>
            </>
          ) : (
            <span className="text-[12px] text-[var(--color-text-muted)]">
              강사 선택
            </span>
          )}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-[var(--color-text-muted)] shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          data-testid="teacher-dropdown-panel"
          className="absolute z-50 mt-1 w-full max-h-72 overflow-auto rounded-md border border-amber-500/30 bg-zinc-900 shadow-lg p-2 space-y-1"
        >
          {grouped ? (
            <>
              <div>
                <p className="px-1 mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  {subjectName ? `${subjectName} 담당` : "이 과목 담당"}
                  <span className="ml-1.5 inline-flex items-center rounded-full bg-[rgba(245,158,11,0.18)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--amber-400,#fbbf24)]">
                    {primary.length}명
                  </span>
                </p>
                {primary.length === 0 ? (
                  <p className="px-1 text-[11px] text-[var(--color-text-muted)] py-1">
                    아직 담당 강사가 없어요.
                  </p>
                ) : (
                  primary.map(renderItem)
                )}
              </div>
              {secondary.length > 0 && (
                <div className="mt-2 pt-2 border-t border-white/5">
                  <p className="px-1 mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                    기타 강사
                  </p>
                  {secondary.map(renderItem)}
                </div>
              )}
            </>
          ) : (
            visibleTeachers.map(renderItem)
          )}

          {showInlineCreate && !expanding && (
            <button
              type="button"
              onClick={() => setExpanding(true)}
              data-testid="teacher-dropdown-add-new"
              className="w-full mt-1 flex items-center justify-center gap-1 text-[11px] text-[var(--color-accent)] py-1.5 border border-dashed border-[var(--color-accent)] rounded hover:bg-[var(--color-overlay-light)] transition-colors"
            >
              <Plus className="w-3 h-3" />새 강사 추가
            </button>
          )}

          {showInlineCreate && expanding && (
            <div className="mt-2 pt-2 border-t border-white/5 space-y-2">
              <input
                type="text"
                value={inputValue ?? ""}
                onChange={(e) => setInputValue?.(e.target.value)}
                placeholder="새 강사 이름"
                maxLength={NAME_MAX_LENGTH}
                data-testid="teacher-dropdown-new-input"
                className="w-full px-2 py-1.5 rounded border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[12px] text-[var(--color-text-primary)]"
                autoFocus
              />
              {createError && (
                <p className="text-[10px] text-semantic-danger">{createError}</p>
              )}
              <div className="flex items-center justify-end gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setExpanding(false);
                    setInputValue?.("");
                  }}
                  className="px-2 py-1 text-[11px] text-zinc-300 hover:bg-white/5 rounded"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (onCreate) {
                      const ok = await onCreate();
                      if (ok) setExpanding(false);
                    }
                  }}
                  disabled={creating || !(inputValue ?? "").trim()}
                  className="px-2 py-1 text-[11px] bg-amber-500 text-zinc-900 rounded font-medium disabled:opacity-50"
                  data-testid="teacher-dropdown-new-confirm"
                >
                  {creating ? "추가 중…" : "추가"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
