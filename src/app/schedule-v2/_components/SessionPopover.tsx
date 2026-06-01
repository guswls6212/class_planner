"use client";

/**
 * C — 그리드 셀 인라인 팝오버 (schedule-v2 mockup 변형 C).
 * 블록 클릭 → 그 자리에 작은 팝오버로 빠른 편집(강사색·시간) + 저장/삭제. 풀 모달 대신.
 * 학생·과목·요일은 맥락 고정(읽기). 강사/시간만. editSession/deleteSession 재사용(P1 데이터 경로).
 */

import { useEffect, useState } from "react";
import { timeToMinutes, weekdays, type Teacher } from "@/lib/planner";
import type { SessionFormInitial, SessionFormInput } from "./SessionFormModal";

const POPOVER_W = 232;
const POPOVER_H_EST = 220; // 강사 이름 칩(줄바꿈) 고려
const MARGIN = 8;

/** anchor(블록 DOMRect) 아래에 배치, 화면 넘치면 위/안쪽으로 clamp. */
function place(anchor: DOMRect): { left: number; top: number } {
  if (typeof window === "undefined") return { left: MARGIN, top: MARGIN };
  let left = Math.min(anchor.left, window.innerWidth - POPOVER_W - MARGIN);
  left = Math.max(MARGIN, left);
  let top = anchor.bottom + 6;
  if (top + POPOVER_H_EST > window.innerHeight) {
    top = Math.max(MARGIN, anchor.top - POPOVER_H_EST - 6);
  }
  return { left, top };
}

export default function SessionPopover({
  initial,
  anchor,
  teachers,
  onSave,
  onDelete,
  onClose,
}: {
  initial: SessionFormInitial;
  anchor: DOMRect;
  teachers: Teacher[];
  onSave: (input: SessionFormInput) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [teacherId, setTeacherId] = useState(initial.teacherId ?? "");
  const [startTime, setStartTime] = useState(initial.startTime);
  const [endTime, setEndTime] = useState(initial.endTime);
  const [error, setError] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const pos = place(anchor);

  const save = () => {
    if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
      return setError("종료가 시작보다 늦어야 해요.");
    }
    onSave({
      studentId: initial.studentId,
      subjectId: initial.subjectId,
      teacherId: teacherId || null,
      weekday: initial.weekday,
      startTime,
      endTime,
    });
  };

  const timeCls =
    "rounded border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-1.5 py-1 text-[12px] tabular-nums text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]";

  return (
    <>
      {/* backdrop — 클릭 시 닫힘 */}
      <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="수업 빠른 편집"
        onClick={(e) => e.stopPropagation()}
        style={{ left: pos.left, top: pos.top, width: POPOVER_W }}
        className="fixed z-50 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3 shadow-xl"
      >
        {/* 맥락 헤더 (읽기) */}
        <div className="mb-2 flex items-center gap-1.5 text-[12px]">
          <span className="font-bold text-[var(--color-text-primary)]">{initial.studentName}</span>
          <span className="text-[var(--color-text-muted)]">· {weekdays[initial.weekday]} · {initial.subjectName}</span>
        </div>

        {/* 강사 — 이름 칩(색 dot + 이름). 색만으론 누군지 모르니 이름 노출 (V1, 2026-06-01 픽) */}
        <div className="mb-2">
          <div className="mb-1 text-[10px] text-[var(--color-text-muted)]">강사</div>
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => setTeacherId("")}
              aria-label="강사 없음"
              aria-pressed={teacherId === ""}
              className={`rounded-full border px-2 py-0.5 text-[11px] transition ${teacherId === "" ? "border-[var(--color-accent)] text-[var(--color-text-primary)]" : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"}`}
            >
              없음
            </button>
            {teachers.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTeacherId(t.id)}
                aria-label={t.name}
                aria-pressed={teacherId === t.id}
                className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition ${teacherId === t.id ? "border-[var(--color-accent)] text-[var(--color-text-primary)]" : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]"}`}
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                {t.name}
              </button>
            ))}
          </div>
        </div>

        {/* 시간 */}
        <div className="mb-2">
          <div className="mb-1 text-[10px] text-[var(--color-text-muted)]">시간</div>
          <div className="flex items-center gap-1.5">
            <input aria-label="시작 시간" type="time" className={timeCls} value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            <span className="text-[var(--color-text-muted)]">~</span>
            <input aria-label="종료 시간" type="time" className={timeCls} value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </div>
        </div>

        {error && <p className="mb-1 text-[11px] text-[var(--color-danger)]">{error}</p>}

        <div className="mt-1 flex items-center justify-between border-t border-[var(--color-border)] pt-2">
          <button type="button" onClick={onDelete} className="text-[12px] font-medium text-[var(--color-danger)] hover:underline">삭제</button>
          <div className="flex gap-1.5">
            <button type="button" onClick={onClose} className="rounded-md px-2 py-1 text-[12px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">취소</button>
            <button type="button" onClick={save} className="rounded-md bg-[var(--color-accent)] px-3 py-1 text-[12px] font-semibold text-black hover:opacity-90">저장</button>
          </div>
        </div>
      </div>
    </>
  );
}
