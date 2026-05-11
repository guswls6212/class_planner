"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { NAME_MAX_LENGTH } from "@/lib/validation/profileSchemas";
import { filterTeachersForPicker, isAdminRole, type TeacherRoleLike } from "@/lib/teacherPickerFilter";
import { TeacherChip } from "@/components/molecules/TeacherChip";

/**
 * Picker용 강사 데이터 (ADR-015). role/email/phone은 동명이인 부제 + admin 필터에 사용.
 * 호출부(`schedule/page.tsx` 등)는 본 타입 모양으로 projection 전달.
 */
export interface TeacherPickerOption {
  id: string;
  name: string;
  color: string;
  role?: TeacherRoleLike;
  email?: string | null;
  phone?: string | null;
  /** 담당 과목 ID 목록 — subjectId prop이 주어지면 그룹화 정렬에 사용. */
  subjectIds?: string[];
}

interface TeacherPillPickerProps {
  teachers: TeacherPickerOption[];
  selectedTeacherId?: string | null;
  onSelect: (teacherId: string | null) => void;
  className?: string;
  /** owner/admin 만 인라인 추가 가능. false 또는 onCreate/setInputValue 미제공이면 "＋ 새 강사" pill 숨김. */
  canManage?: boolean;
  inputValue?: string;
  setInputValue?: (val: string) => void;
  /** 성공 시 true 반환 — true 받으면 인라인 row 자동 닫힘. */
  onCreate?: () => Promise<boolean>;
  creating?: boolean;
  createError?: string;
  /**
   * 현재 수업의 과목 ID. 있으면 강사를 "이 과목 담당" / "기타" 두 그룹으로
   * 분리해 담당 강사를 우선 노출. 미설정 (또는 담당 0명) 시 단일 list 그대로.
   */
  subjectId?: string | null;
  /** 현재 과목 이름 — 그룹 라벨에 표시 ("고등수학 담당"). */
  subjectName?: string;
}

export default function TeacherPillPicker({
  teachers,
  selectedTeacherId,
  onSelect,
  className = "",
  canManage = false,
  inputValue = "",
  setInputValue,
  onCreate,
  creating = false,
  createError = "",
  subjectId = null,
  subjectName,
}: TeacherPillPickerProps) {
  const [expanding, setExpanding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const showInlineCreate = canManage && !!setInputValue && !!onCreate;

  useEffect(() => {
    if (expanding) inputRef.current?.focus();
  }, [expanding]);

  useEffect(() => {
    if (!expanding) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setExpanding(false);
        setInputValue?.("");
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [expanding, setInputValue]);

  const handleCreate = async () => {
    if (!onCreate) return;
    const trimmed = inputValue.trim();
    if (!trimmed || creating) return;
    const success = await onCreate();
    if (success) setExpanding(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // IME composing 가드 (UAT 2026-05-10): 한글 마지막 음절이 composing 중일 때 Enter
    // 누르면 그 음절이 한 번 더 input에 들어가 "김민철" → "김민철철" 회귀 발생.
    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleCreate();
    }
  };

  // ADR-015: admin/owner 강사는 picker에서 제외, 단 selectedTeacherId가 admin이면 예외 보존.
  const visibleTeachers = useMemo(
    () => filterTeachersForPicker(teachers, selectedTeacherId ?? null),
    [teachers, selectedTeacherId],
  );

  // 과목 기반 그룹화 — subjectId 있으면 항상 두 그룹으로 분리.
  // 담당 0명이어도 그룹 라벨 유지 — 사용자가 "이 과목 담당 강사 미설정" 인지
  // → 강사 페이지에서 담당 등록 유도. graceful fallback로 부담 X.
  const { primary, secondary, grouped } = useMemo(() => {
    if (!subjectId) {
      return { primary: visibleTeachers, secondary: [], grouped: false };
    }
    const primary = visibleTeachers.filter((t) =>
      (t.subjectIds ?? []).includes(subjectId),
    );
    const secondary = visibleTeachers.filter(
      (t) => !(t.subjectIds ?? []).includes(subjectId),
    );
    return { primary, secondary, grouped: true };
  }, [visibleTeachers, subjectId]);
  // 이메일/전화는 TeacherChip 내부 호버 툴팁이 담당 — 동명이인 인라인 부제 더 이상 필요 없음.

  if (visibleTeachers.length === 0 && !showInlineCreate) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className="text-[12px] text-[var(--color-text-muted)]">강사 없음</span>
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

  const renderChip = (teacher: TeacherPickerOption) => {
    const isActive = selectedTeacherId === teacher.id;
    const adminTag = isAdminRole(teacher.role) ? "관리자" : undefined;
    return (
      <TeacherChip
        key={teacher.id}
        teacher={teacher}
        selected={isActive}
        onClick={() => onSelect(isActive ? null : teacher.id)}
        contextTag={adminTag}
      />
    );
  };

  const inlineCreateBtn = showInlineCreate && !expanding ? (
    <button
      type="button"
      onClick={() => setExpanding(true)}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] border border-dashed border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-overlay-light)] transition-colors"
    >
      ＋ 새 강사
    </button>
  ) : null;

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {grouped ? (
        <>
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              {subjectName ? `${subjectName} 담당` : "이 과목 담당"}
              <span className="ml-1.5 inline-flex items-center rounded-full bg-[rgba(245,158,11,0.18)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--amber-400,#fbbf24)]">
                {primary.length}명
              </span>
            </p>
            {primary.length === 0 ? (
              <p className="text-[11px] text-[var(--color-text-muted)] py-1.5">
                아직 담당 강사가 없어요. <Link href="/teachers" target="_blank" className="text-[var(--color-accent)] hover:underline">강사 페이지</Link>에서 설정할 수 있어요.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">{primary.map(renderChip)}</div>
            )}
          </div>
          {secondary.length > 0 && (
            <div className="mt-1">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                기타 강사
              </p>
              <div className="flex flex-wrap gap-2">
                {secondary.map(renderChip)}
                {inlineCreateBtn}
              </div>
            </div>
          )}
          {secondary.length === 0 && inlineCreateBtn && (
            <div className="flex flex-wrap gap-2">{inlineCreateBtn}</div>
          )}
        </>
      ) : (
        <div className="flex flex-wrap gap-2">
          {primary.map(renderChip)}
          {inlineCreateBtn}
        </div>
      )}

      {showInlineCreate && expanding && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 rounded-xl border border-[var(--color-accent)] bg-[var(--color-bg-secondary)] px-2 py-1.5">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue?.(e.target.value.slice(0, NAME_MAX_LENGTH))}
              onKeyDown={handleKeyDown}
              placeholder="새 강사 이름"
              maxLength={NAME_MAX_LENGTH}
              className="flex-1 bg-transparent text-[13px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none px-2 py-1"
              disabled={creating}
            />
            <button
              type="button"
              onClick={handleCreate}
              disabled={!inputValue.trim() || creating}
              className="flex-shrink-0 rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed hover:enabled:opacity-90 transition-opacity"
            >
              {creating ? "생성 중..." : "생성"}
            </button>
            <button
              type="button"
              onClick={() => {
                setExpanding(false);
                setInputValue?.("");
              }}
              aria-label="닫기"
              className="flex-shrink-0 rounded-lg border border-[var(--color-border)] p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              <X size={14} strokeWidth={2} />
            </button>
          </div>
          {createError && (
            <p className="text-[11px] text-[var(--color-danger)] px-2" role="alert">
              {createError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
