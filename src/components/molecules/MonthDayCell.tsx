import React from "react";
import type { Enrollment, Session, Student, Subject, Teacher } from "../../lib/planner";
import { SessionCard } from "./SessionCard";
import { resolveSessionColor, sessionMatchesFilters } from "./SessionBlock.utils";
import type { ColorByMode } from "@/hooks/useColorBy";

interface MonthDayCellProps {
  date: Date;
  sessions: Session[];
  subjects: Subject[];
  enrollments: Enrollment[];
  students?: Student[];
  teachers?: Teacher[];
  colorBy?: ColorByMode;
  // ADR-020 R5 Full Parity: 학생/과목/강사 모두 dim contrast 적용 (UAT 2026-05-21)
  selectedStudentIds?: string[];
  selectedSubjectIds?: string[];
  selectedTeacherIds?: string[];
  isToday: boolean;
  isCurrentMonth: boolean;
  onDayClick: (date: Date) => void;
}

const MAX_VISIBLE_CHIPS = 3;

export default function MonthDayCell({
  date,
  sessions,
  subjects,
  enrollments,
  students = [],
  teachers = [],
  colorBy = "subject",
  selectedStudentIds,
  selectedSubjectIds,
  selectedTeacherIds,
  isToday,
  isCurrentMonth,
  onDayClick,
}: MonthDayCellProps) {
  // ADR-020 R5 Full Parity: 활성 필터 type 어느 하나라도 있으면 매칭/비매칭 dim 적용.
  const isAnyFilterActive =
    (selectedStudentIds?.length ?? 0) > 0 ||
    (selectedSubjectIds?.length ?? 0) > 0 ||
    (selectedTeacherIds?.length ?? 0) > 0;
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));
  const enrollmentMap = new Map(enrollments.map((e) => [e.id, e]));

  // ADR-020 D2 Full Parity (UAT 2026-05-21): 매칭 sessions 를 visible 우선 배치.
  // 그렇지 않으면 4+ overflow 시 매칭 session 이 +N 안에 hidden → "매칭 0" 처럼 인지.
  const sortedSessions = isAnyFilterActive
    ? [...sessions].sort((a, b) => {
        const aMatch = sessionMatchesFilters(
          a,
          enrollments,
          selectedStudentIds ?? [],
          selectedSubjectIds ?? [],
          selectedTeacherIds ?? [],
        );
        const bMatch = sessionMatchesFilters(
          b,
          enrollments,
          selectedStudentIds ?? [],
          selectedSubjectIds ?? [],
          selectedTeacherIds ?? [],
        );
        if (aMatch === bMatch) return 0;
        return aMatch ? -1 : 1;
      })
    : sessions;
  const visibleSessions = sortedSessions.slice(0, MAX_VISIBLE_CHIPS);
  const overflow = sortedSessions.length - MAX_VISIBLE_CHIPS;

  function getSessionSubject(session: Session) {
    const firstEnrollmentId = session.enrollmentIds?.[0];
    if (!firstEnrollmentId) return undefined;
    const enrollment = enrollmentMap.get(firstEnrollmentId);
    if (!enrollment) return undefined;
    return subjectMap.get(enrollment.subjectId);
  }

  return (
    <button
      type="button"
      className="flex h-full min-h-[80px] w-full flex-col items-start gap-0.5 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-1 text-left transition-colors hover:bg-[var(--color-bg-secondary)]"
      onClick={() => onDayClick(date)}
    >
      {/* Date number */}
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
          isToday
            ? "bg-[var(--color-primary)] text-white"
            : isCurrentMonth
              ? "text-[var(--color-text-primary)]"
              : "text-[var(--color-text-muted)]"
        }`}
        {...(isToday ? { "data-today": "" } : {})}
        {...(!isCurrentMonth ? { "data-outside-month": "" } : {})}
      >
        {date.getDate()}
      </span>

      {/* Session chips */}
      {visibleSessions.length > 0 && (
        <ul className="flex w-full flex-col gap-0.5">
          {visibleSessions.map((session) => {
            const subj = getSessionSubject(session);
            const resolvedColor = resolveSessionColor(
              session,
              colorBy,
              enrollments,
              subjects,
              students,
              teachers,
              selectedStudentIds
            );
            // ADR-020 R5: 활성 필터의 AND 결합 매칭 — 비매칭 dim, 매칭 highlight.
            const matches = isAnyFilterActive
              ? sessionMatchesFilters(
                  session,
                  enrollments,
                  selectedStudentIds ?? [],
                  selectedSubjectIds ?? [],
                  selectedTeacherIds ?? [],
                )
              : true;
            const isDimmed = isAnyFilterActive && !matches;
            const isHighlighted = isAnyFilterActive && matches;
            return (
              <li key={session.id} className="w-full">
                <SessionCard
                  variant="chip"
                  subject={subj ?? null}
                  overrideColor={resolvedColor}
                  dimmed={isDimmed}
                  highlighted={isHighlighted}
                />
              </li>
            );
          })}
        </ul>
      )}

      {/* Overflow badge */}
      {overflow > 0 && (
        <span className="text-[10px] text-[var(--color-text-muted)]">+{overflow}</span>
      )}
    </button>
  );
}
