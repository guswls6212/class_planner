"use client";

/**
 * 수업 추가/편집 모달 (schedule-v2 Phase 1) — 친구 모델(학생 1명/블록)용 간단 폼.
 * - add: 학생/과목/강사/요일/시간 선택 → planSessionAdd
 * - edit: 학생·과목은 읽기전용(변경은 삭제+재추가), 강사/요일/시간 수정 + 삭제 → planSessionUpdate / deleteSession
 * 학생/과목/강사는 기존 CRUD 페이지에서 만든 것을 선택만(인라인 생성 X).
 * mount = 표시 (page 에서 조건부 렌더 → 매 open 마다 fresh state).
 */

import { useState } from "react";
import { timeToMinutes, weekdays, type Student, type Subject, type Teacher } from "@/lib/planner";

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

  const submit = () => {
    if (!isEdit && !studentId) return setError("학생을 선택하세요.");
    if (!isEdit && !subjectId) return setError("과목을 선택하세요.");
    if (timeToMinutes(endTime) <= timeToMinutes(startTime)) return setError("종료 시간이 시작보다 늦어야 합니다.");
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div role="dialog" aria-modal="true" aria-label={isEdit ? "수업 편집" : "수업 추가"} className="w-full max-w-sm rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-5 shadow-xl">
        <h2 className="mb-4 text-lg font-bold text-[var(--color-text-primary)]">{isEdit ? "수업 편집" : "수업 추가"}</h2>
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
          <div>
            <label htmlFor="sfm-teacher" className={labelCls}>강사 (선택)</label>
            <select id="sfm-teacher" className={fieldCls} value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
              <option value="">없음</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <div className="w-24">
              <label htmlFor="sfm-weekday" className={labelCls}>요일</label>
              <select id="sfm-weekday" className={fieldCls} value={weekday} onChange={(e) => setWeekday(Number(e.target.value))}>
                {weekdays.map((w, i) => (
                  <option key={i} value={i}>{w}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label htmlFor="sfm-start" className={labelCls}>시작</label>
              <input id="sfm-start" type="time" className={fieldCls} value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="flex-1">
              <label htmlFor="sfm-end" className={labelCls}>종료</label>
              <input id="sfm-end" type="time" className={fieldCls} value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>
          {error && <p className="text-[12px] text-[var(--color-danger)]">{error}</p>}
        </div>
        <div className="mt-5 flex items-center justify-between gap-2">
          {isEdit && onDelete ? (
            <button onClick={onDelete} className="rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--color-danger)] hover:underline">삭제</button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">취소</button>
            <button onClick={submit} className="rounded-lg bg-[var(--color-accent)] px-4 py-1.5 text-sm font-semibold text-black hover:opacity-90">{isEdit ? "저장" : "추가"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
