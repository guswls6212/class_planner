"use client";

import { useMemo, useRef } from "react";
import { Plus } from "lucide-react";
import type { Session, Subject, Student, Enrollment, Teacher } from "@/lib/planner";
import type { ColorByMode } from "@/hooks/useColorBy";
import { SessionCard } from "@/components/molecules/SessionCard";

type AttendanceStatus = "all-present" | "partial" | "absent" | "unmarked";

interface ScheduleDailyViewProps {
  sessions: Map<number, Session[]>;
  subjects: Subject[];
  students: Student[];
  enrollments: Enrollment[];
  teachers: Teacher[];
  selectedWeekday: number;
  colorBy: ColorByMode;
  onSessionClick: (session: Session) => void;
  onAddSession: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onAttendanceClick?: (session: Session) => void;
  attendanceStatusMap?: Record<string, AttendanceStatus>;
}

export function ScheduleDailyView({
  sessions, subjects, students, enrollments, teachers,
  selectedWeekday, colorBy, onSessionClick, onAddSession,
  onSwipeLeft, onSwipeRight, onAttendanceClick, attendanceStatusMap,
}: ScheduleDailyViewProps) {
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
            return (
              <SessionCard
                key={session.id}
                variant="row"
                subject={subject ?? null}
                studentNames={subLabelParts.length > 0 ? subLabelParts : undefined}
                timeRange={session.startsAt}
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

      {/* FAB */}
      <button
        onClick={onAddSession}
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 w-14 h-14 bg-accent text-white rounded-full shadow-lg flex items-center justify-center z-40 transition-colors hover:opacity-90 active:opacity-80"
        aria-label="수업 추가"
      >
        <Plus size={24} strokeWidth={2} />
      </button>
    </div>
  );
}
