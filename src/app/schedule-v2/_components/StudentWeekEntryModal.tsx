"use client";

/**
 * D — 학생-주 일괄 입력 (schedule-v2 mockup 변형 D, killer value).
 * 학생 1명을 고르면 그 학생의 한 주(enrolled 과목 × 요일)를 한 화면에서 채움 →
 * 채운 빈 셀마다 세션 1개씩 생성(bulk). "학생별 1회 입력 → 방그리드/학부모뷰 자동" 흐름.
 *
 * v1 스코프: 빈 셀 입력 → 생성(create)만. 기존 세션이 있는 셀은 회색 표시(편집은 블록 클릭 = A/B 모달).
 * 종료시간은 시작 + 기본 60분(공부방 빠른 입력 — 이후 개별 조정). 강사는 미지정(블록에서 색 지정).
 */

import { useEffect, useMemo, useState } from "react";
import {
  timeToMinutes,
  weekdays,
  type Enrollment,
  type Session,
  type Student,
  type Subject,
} from "@/lib/planner";
import { useModalA11y } from "@/hooks/useModalA11y";
import type { SessionFormInput } from "./SessionFormModal";

/** 입력 매트릭스 요일(월~금) — 공부방은 평일 중심. 토/일은 블록/모달로 개별 추가. */
const ENTRY_DAYS = [0, 1, 2, 3, 4];
const DEFAULT_DURATION_MIN = 60;

const minutesToTime = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

export default function StudentWeekEntryModal({
  students,
  subjects,
  enrollments,
  sessions,
  onClose,
  onBulkCreate,
}: {
  students: Student[];
  subjects: Subject[];
  enrollments: Enrollment[];
  sessions: Session[];
  onClose: () => void;
  onBulkCreate: (inputs: SessionFormInput[]) => void;
}) {
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [cells, setCells] = useState<Record<string, string>>({});
  const { containerRef } = useModalA11y({ isOpen: true, onClose });

  // 학생 변경 시 입력 셀 초기화 (다른 학생 입력 잔존 방지).
  useEffect(() => {
    setCells({});
  }, [studentId]);

  const myEnrollments = useMemo(
    () => enrollments.filter((e) => e.studentId === studentId),
    [enrollments, studentId],
  );

  const mySubjects = useMemo(() => {
    const ids = new Set(myEnrollments.map((e) => e.subjectId));
    return subjects.filter((s) => ids.has(s.id));
  }, [subjects, myEnrollments]);

  // 기존 세션: `${subjectId}-${weekday}` → "HH:MM"(시작). 기존 셀은 회색·읽기전용.
  const existing = useMemo(() => {
    const map = new Map<string, string>();
    const enrSubjById = new Map(myEnrollments.map((e) => [e.id, e.subjectId]));
    for (const sess of sessions) {
      if (sess.weekday === undefined || sess.weekday === null || !sess.startsAt) continue;
      for (const eid of sess.enrollmentIds ?? []) {
        const subjId = enrSubjById.get(eid);
        if (subjId) map.set(`${subjId}-${sess.weekday}`, sess.startsAt);
      }
    }
    return map;
  }, [sessions, myEnrollments]);

  const filledCount = Object.values(cells).filter((v) => v && v.length > 0).length;

  const save = () => {
    const inputs: SessionFormInput[] = [];
    for (const subj of mySubjects) {
      for (const wd of ENTRY_DAYS) {
        const key = `${subj.id}-${wd}`;
        if (existing.has(key)) continue; // 기존은 편집(A/B 모달)으로 — 여기선 생성만
        const start = cells[key];
        if (!start) continue;
        inputs.push({
          studentId,
          subjectId: subj.id,
          teacherId: null,
          weekday: wd,
          startTime: start,
          endTime: minutesToTime(timeToMinutes(start) + DEFAULT_DURATION_MIN),
        });
      }
    }
    if (inputs.length > 0) onBulkCreate(inputs);
    onClose();
  };

  const studentName = students.find((s) => s.id === studentId)?.name ?? "";
  const cellCls =
    "w-full rounded border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-1 py-1 text-center text-[12px] tabular-nums text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="swe-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-5 shadow-xl"
      >
        <h2 id="swe-title" className="mb-1 text-lg font-bold text-[var(--color-text-primary)]">학생별 일괄 입력</h2>
        <p className="mb-4 text-[12px] text-[var(--color-text-muted)]">
          학생을 고르고 한 주를 한 번에 채우세요. 빈 칸에 시작 시간만 — 길이는 기본 60분(이후 블록에서 조정).
        </p>

        {/* 학생 picker */}
        <div className="mb-3">
          <label htmlFor="swe-student" className="mb-1 block text-[12px] font-medium text-[var(--color-text-secondary)]">학생</label>
          <select
            id="swe-student"
            className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-2.5 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
          >
            {students.length === 0 && <option value="">학생 없음</option>}
            {students.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* 과목 × 요일 매트릭스 */}
        {mySubjects.length === 0 ? (
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-6 text-center text-[13px] text-[var(--color-text-muted)]">
            이 학생의 과목이 없어요. 먼저 <b className="text-[var(--color-text-secondary)]">＋ 수업 추가</b>로 과목을 한 번 등록하면 여기서 일괄 입력할 수 있어요.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-[var(--color-border)]">
            <table className="w-full border-collapse text-center text-[12px]">
              <thead>
                <tr className="bg-[var(--color-bg-primary)] text-[var(--color-text-muted)]">
                  <th className="px-2 py-1.5 text-left font-medium">과목</th>
                  {ENTRY_DAYS.map((wd) => (
                    <th key={wd} className="px-1 py-1.5 font-medium">{weekdays[wd]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mySubjects.map((subj) => (
                  <tr key={subj.id} className="border-t border-[var(--color-border)]">
                    <td className="px-2 py-1 text-left">
                      <span className="flex items-center gap-1.5 text-[12px] font-semibold text-[var(--color-text-secondary)]">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: subj.color ?? "#6b7280" }} />
                        {subj.name}
                      </span>
                    </td>
                    {ENTRY_DAYS.map((wd) => {
                      const key = `${subj.id}-${wd}`;
                      const prev = existing.get(key);
                      return (
                        <td key={wd} className="p-0.5">
                          {prev ? (
                            <div className="rounded bg-[var(--color-bg-tertiary)] px-1 py-1 text-center text-[11px] tabular-nums text-[var(--color-text-muted)]" title="기존 수업 — 편집은 블록 클릭">
                              {prev}
                            </div>
                          ) : (
                            <input
                              type="time"
                              aria-label={`${subj.name} ${weekdays[wd]}요일 시작 시간`}
                              className={cellCls}
                              value={cells[key] ?? ""}
                              onChange={(e) => setCells((c) => ({ ...c, [key]: e.target.value }))}
                            />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">취소</button>
          <button
            type="button"
            onClick={save}
            disabled={filledCount === 0}
            className="rounded-lg bg-[var(--color-accent)] px-4 py-1.5 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-40"
          >
            {studentName ? `${studentName} 한 주 저장` : "저장"}{filledCount > 0 ? ` (${filledCount})` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
