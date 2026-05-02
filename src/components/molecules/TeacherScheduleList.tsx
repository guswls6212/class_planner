"use client";

import type { Session, Enrollment, Subject } from "@/lib/planner";

const WEEKDAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

export interface TeacherScheduleListProps {
  sessions: Session[];
  enrollments: Enrollment[];
  subjects: Subject[];
  fallbackColor: string;
}

export function TeacherScheduleList({
  sessions,
  enrollments,
  subjects,
  fallbackColor,
}: TeacherScheduleListProps) {
  if (sessions.length === 0) {
    return <p className="text-[11px] text-[var(--color-text-muted)]">담당 수업이 없습니다.</p>;
  }

  return (
    <ul className="flex flex-col gap-1.5">
      {sessions
        .slice()
        .sort((a, b) => a.weekday - b.weekday || (a.startsAt ?? "").localeCompare(b.startsAt ?? ""))
        .map((session) => {
          const subjectId = session.enrollmentIds
            ?.map((eid) => enrollments.find((e) => e.id === eid)?.subjectId)
            .find(Boolean);
          const subject = subjects.find((s) => s.id === subjectId);
          return (
            <li
              key={session.id}
              className="flex items-center gap-2 text-sm text-[var(--color-text-primary)]"
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: subject?.color ?? fallbackColor }}
              />
              <span>{subject?.name ?? "미분류"}</span>
              <span className="text-[var(--color-text-muted)]">
                {WEEKDAY_LABELS[session.weekday]} {session.startsAt}–{session.endsAt}
              </span>
            </li>
          );
        })}
    </ul>
  );
}
