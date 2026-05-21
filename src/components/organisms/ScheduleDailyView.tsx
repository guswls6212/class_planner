"use client";

import { useMemo, useRef } from "react";
import type { Session, Subject, Student, Enrollment, Teacher } from "@/lib/planner";
import type { ColorByMode } from "@/hooks/useColorBy";
import { SessionCard } from "@/components/molecules/SessionCard";
import { resolveSessionColor, sessionMatchesFilters } from "@/components/molecules/SessionBlock.utils";

type AttendanceStatus = "all-present" | "partial" | "absent" | "unmarked";

interface ScheduleDailyViewProps {
  sessions: Map<number, Session[]>;
  subjects: Subject[];
  students: Student[];
  enrollments: Enrollment[];
  teachers: Teacher[];
  selectedWeekday: number;
  colorBy: ColorByMode;
  // ADR-020 R5 Full Parity: 학생/과목/강사 모두 dim contrast 적용 (UAT 2026-05-21)
  selectedStudentIds?: string[];
  selectedSubjectIds?: string[];
  selectedTeacherIds?: string[];
  onSessionClick: (session: Session) => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onAttendanceClick?: (session: Session) => void;
  attendanceStatusMap?: Record<string, AttendanceStatus>;
}

export function ScheduleDailyView({
  sessions, subjects, students, enrollments, teachers,
  selectedWeekday, colorBy, selectedStudentIds, selectedSubjectIds, selectedTeacherIds, onSessionClick,
  onSwipeLeft, onSwipeRight, onAttendanceClick, attendanceStatusMap,
}: ScheduleDailyViewProps) {
  // ADR-020 R5 Full Parity: 활성 필터 type 어느 하나라도 있으면 매칭/비매칭 dim 적용.
  const isAnyFilterActive =
    (selectedStudentIds?.length ?? 0) > 0 ||
    (selectedSubjectIds?.length ?? 0) > 0 ||
    (selectedTeacherIds?.length ?? 0) > 0;
  const daySessions = useMemo(() => {
    const raw = sessions.get(selectedWeekday) ?? [];
    return [...raw].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  }, [sessions, selectedWeekday]);

  // Swipe gesture
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) onSwipeLeft?.();
      else onSwipeRight?.();
    }
  };

  const getSubjectForSession = (session: Session) => {
    const enrollment = enrollments.find((e) => session.enrollmentIds?.includes(e.id));
    return enrollment ? subjects.find((s) => s.id === enrollment.subjectId) : undefined;
  };

  const getStudentNames = (session: Session) => {
    const eIds = session.enrollmentIds ?? [];
    return eIds
      .flatMap((eid) => {
        const enrollment = enrollments.find((e) => e.id === eid);
        return enrollment ? (students.find((s) => s.id === enrollment.studentId)?.name ?? []) : [];
      })
      .join(", ");
  };

  const getTeacher = (session: Session) =>
    session.teacherId ? teachers.find((t) => t.id === session.teacherId) : undefined;

  return (
    <div
      className="flex flex-col flex-1 overflow-y-auto relative"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {daySessions.length === 0 ? (
        <div className="flex-1 flex items-center justify-center py-16 text-[var(--color-text-muted)] text-sm">
          수업이 없습니다
        </div>
      ) : (
        <div className="flex flex-col gap-2 px-4 py-3">
          {daySessions.map((session) => {
            const subject = getSubjectForSession(session);
            const teacher = getTeacher(session);
            const studentNames = getStudentNames(session);
            const attStatus = attendanceStatusMap?.[session.id] ?? "unmarked";
            const subLabelParts = [
              studentNames,
              teacher ? `${teacher.name} 선생님` : "",
            ].filter(Boolean);

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
              <SessionCard
                key={session.id}
                variant="row"
                subject={subject ?? null}
                studentNames={subLabelParts.length > 0 ? subLabelParts : undefined}
                timeRange={session.startsAt}
                overrideColor={resolvedColor}
                dimmed={isDimmed}
                highlighted={isHighlighted}
                onClick={() => onSessionClick(session)}
                onAttendanceClick={
                  onAttendanceClick ? () => onAttendanceClick(session) : undefined
                }
                attendanceStatus={attStatus}
                data-testid={`daily-session-${session.id}`}
              />
            );
          })}
        </div>
      )}

    </div>
  );
}
