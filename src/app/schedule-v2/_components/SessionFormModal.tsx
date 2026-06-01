"use client";

/**
 * 수업 추가/편집 모달 (schedule-v2 Phase 1 — A/B 반응형).
 * 데스크톱 = 센터 다이얼로그 / 모바일 = 바텀시트 (useMediaQuery).
 * 검증된 molecule 재사용: TeacherDropdownPicker(강사색·select-only) · BottomSheet · useModalA11y.
 * - add: 학생/과목/강사/요일/시간 선택 → planSessionAdd
 * - edit: 학생·과목 읽기전용(변경은 삭제+재추가), 강사/요일/시간 수정 + 삭제 → planSessionUpdate / deleteSession
 * 학생/과목/강사는 기존 CRUD 페이지에서 만든 것을 선택만(인라인 생성 X → 단순).
 */

import { useState } from "react";
import { timeToMinutes, weekdays, type Student, type Subject, type Teacher } from "@/lib/planner";
import TeacherDropdownPicker, { type TeacherDropdownOption } from "@/components/molecules/TeacherDropdownPicker";
import { BottomSheet } from "@/components/molecules/BottomSheet";
import { useModalA11y } from "@/hooks/useModalA11y";
import { useMediaQuery } from "@/hooks/useMediaQuery";

export interface SessionFormInput {
  studentId: string;
  subjectId: string;
  teacherId: string | null;
  weekday: number;
  startTime: string;
  endTime: string;
}

export interface SessionFormInitial {
  studentId: string;
  studentName: string;
  subjectId: string;
  subjectName: string;
  teacherId: string | null;
  weekday: number;
  startTime: string;
  endTime: string;
}

/** 시작~종료(HH:MM)의 길이를 "N시간 M분"으로. 0 이하면 빈 문자열. */
export function formatDuration(start: string, end: string): string {
  const d = timeToMinutes(end) - timeToMinutes(start);
  if (d <= 0) return "";
  const h = Math.floor(d / 60);
  const m = d % 60;
  return [h > 0 ? `${h}시간` : "", m > 0 ? `${m}분` : ""].filter(Boolean).join(" ");
}

export default function SessionFormModal({
  mode,
  initial,
  students,
  subjects,
  teachers,
  onSubmit,
  onDelete,
  onClose,
}: {
  mode: "add" | "edit";
  initial?: SessionFormInitial;
  students: Student[];
  subjects: Subject[];
  teachers: Teacher[];
  onSubmit: (input: SessionFormInput) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const isEdit = mode === "edit";
  const [studentId, setStudentId] = useState(initial?.studentId ?? "");
  const [subjectId, setSubjectId] = useState(initial?.subjectId ?? "");
  const [teacherId, setTeacherId] = useState(initial?.teacherId ?? "");
  const [weekday, setWeekday] = useState(initial?.weekday ?? 0);
  const [startTime, setStartTime] = useState(initial?.startTime ?? "15:00");
  const [endTime, setEndTime] = useState(initial?.endTime ?? "16:00");
  const [error, setError] = useState("");

  // 반응형: 데스크톱 센터 / 모바일 바텀시트. 모바일은 BottomSheet 가 스크롤락·백드롭을
  // 담당하므로 useModalA11y 는 데스크톱에서만 활성(isOpen=!isMobile) → 이중 스크롤락 회피.
  const isMobile = useMediaQuery("(max-width: 640px)");
  const { containerRef } = useModalA11y({ isOpen: !isMobile, onClose });

  const teacherOptions: TeacherDropdownOption[] = teachers.map((t) => ({
    id: t.id,
    name: t.name,
    color: t.color,
  }));
  const durationText = formatDuration(startTime, endTime);
  const titleText = isEdit ? "수업 편집" : "수업 추가";

  const submit = () => {
    if (!isEdit && !studentId) return setError("학생을 선택하세요.");
    if (!isEdit && !subjectId) return setError("과목을 선택하세요.");
    if (timeToMinutes(endTime) <= timeToMinutes(startTime))
      return setError("종료 시간이 시작보다 늦어야 합니다.");
    onSubmit({
      studentId: isEdit ? initial?.studentId ?? "" : studentId,
      subjectId: isEdit ? initial?.subjectId ?? "" : subjectId,
      teacherId: teacherId || null,
      weekday,
      startTime,
      endTime,
    });
  };

  const fieldCls =
    "w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-2.5 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]";
  const labelCls = "mb-1 block text-[12px] font-medium text-[var(--color-text-secondary)]";

  const fields = (
    <div className="space-y-3">
      {isEdit ? (
        <div>
          <span className={labelCls}>학생 · 과목</span>
          <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-2.5 py-2 text-sm text-[var(--color-text-muted)]">
            {initial?.studentName} · {initial?.subjectName}
            <span className="ml-1 text-[11px]">(변경은 삭제 후 다시 추가)</span>
          </div>
        </div>
      ) : (
        <>
          <div>
            <label htmlFor="sfm-student" className={labelCls}>학생</label>
            <select id="sfm-student" className={fieldCls} value={studentId} onChange={(e) => setStudentId(e.target.value)}>
              <option value="">학생 선택…</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="sfm-subject" className={labelCls}>과목</label>
            <select id="sfm-subject" className={fieldCls} value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              <option value="">과목 선택…</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </>
      )}

      {/* 강사 — 색 picker (select-only, 인라인 생성 X) */}
      <div>
        <span className={labelCls}>강사 (선택)</span>
        <TeacherDropdownPicker
          teachers={teacherOptions}
          selectedTeacherId={teacherId || null}
          onSelect={(id) => setTeacherId(id ?? "")}
        />
      </div>

      {/* 요일 — segmented (월~일) */}
      <div>
        <span className={labelCls}>요일</span>
        <div className="flex gap-1">
          {weekdays.map((w, i) => {
            const on = weekday === i;
            return (
              <button
                key={w}
                type="button"
                onClick={() => setWeekday(i)}
                aria-pressed={on}
                aria-label={`${w}요일`}
                className={`h-9 flex-1 rounded-md text-[13px] font-semibold transition-colors ${
                  on
                    ? "bg-[var(--color-accent)] text-black"
                    : "border border-[var(--color-border)] bg-[var(--color-bg-primary)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                {w}
              </button>
            );
          })}
        </div>
      </div>

      {/* 시간 + duration echo */}
      <div>
        <span className={labelCls}>시간</span>
        <div className="flex items-center gap-2">
          <input aria-label="시작 시간" type="time" className={`${fieldCls} flex-1`} value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          <span className="text-[var(--color-text-muted)]">~</span>
          <input aria-label="종료 시간" type="time" className={`${fieldCls} flex-1`} value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        </div>
        {durationText && (
          <p className="mt-1 text-[12px] font-medium" style={{ color: "var(--color-accent)" }}>{durationText}</p>
        )}
      </div>

      {error && <p className="text-[12px] text-[var(--color-danger)]">{error}</p>}
    </div>
  );

  const footer = (
    <div className="mt-5 flex items-center justify-between gap-2">
      {isEdit && onDelete ? (
        <button type="button" onClick={onDelete} className="rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--color-danger)] hover:underline">삭제</button>
      ) : (
        <span />
      )}
      <div className="flex gap-2">
        <button type="button" onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">취소</button>
        <button type="button" onClick={submit} className="rounded-lg bg-[var(--color-accent)] px-4 py-1.5 text-sm font-semibold text-black hover:opacity-90">{isEdit ? "저장" : "추가"}</button>
      </div>
    </div>
  );

  // 모바일 — 바텀시트 (스크롤락·백드롭·드래그핸들 내장)
  if (isMobile) {
    return (
      <BottomSheet isOpen onClose={onClose} title={titleText} aria-labelledby="sfm-title">
        <div ref={containerRef}>
          {fields}
          {footer}
        </div>
      </BottomSheet>
    );
  }

  // 데스크톱 — 센터 다이얼로그 (백드롭 클릭 닫기 + focus trap/ESC via useModalA11y)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sfm-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-5 shadow-xl"
      >
        <h2 id="sfm-title" className="mb-4 text-lg font-bold text-[var(--color-text-primary)]">{titleText}</h2>
        {fields}
        {footer}
      </div>
    </div>
  );
}
