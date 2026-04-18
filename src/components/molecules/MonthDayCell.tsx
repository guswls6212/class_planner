import React from "react";
import type { Enrollment, Session, Subject } from "../../lib/planner";
import { SessionCard } from "./SessionCard";

interface MonthDayCellProps {
  date: Date;
  sessions: Session[];
  subjects: Subject[];
  enrollments: Enrollment[];
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
  isToday,
  isCurrentMonth,
  onDayClick,
}: MonthDayCellProps) {
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));
  const enrollmentMap = new Map(enrollments.map((e) => [e.id, e]));
  const visibleSessions = sessions.slice(0, MAX_VISIBLE_CHIPS);
  const overflow = sessions.length - MAX_VISIBLE_CHIPS;

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
            return (
              <li key={session.id} className="w-full">
                <SessionCard variant="chip" subject={subj ?? null} />
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
