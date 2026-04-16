"use client";

import { useMemo, useRef } from "react";
import { Plus } from "lucide-react";
import type { Session, Subject, Student, Enrollment, Teacher } from "@/lib/planner";
import type { ColorByMode } from "@/hooks/useColorBy";

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

const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  "all-present": "✓",
  partial: "△",
  absent: "✗",
  unmarked: "•",
};

const ATTENDANCE_STATUS_COLORS: Record<AttendanceStatus, string> = {
  "all-present": "bg-green-500",
  partial: "bg-yellow-400",
  absent: "bg-red-400",
  unmarked: "bg-[var(--color-text-muted)]",
};

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
            const accentColor = subject?.color ?? "var(--color-primary)";
            const teacher = getTeacher(session);
            const attStatus = attendanceStatusMap?.[session.id] ?? "unmarked";
            return (
              <div
                key={session.id}
                className="flex gap-3 p-3 rounded-lg bg-[var(--color-bg-secondary)] transition-all w-full"
                style={{ borderLeft: `3px solid ${accentColor}` }}
              >
                <button
                  onClick={() => onSessionClick(session)}
                  className="flex gap-3 flex-1 text-left min-w-0 active:scale-[0.98] hover:opacity-80"
                >
                  <div className="text-[11px] text-[var(--color-text-muted)] w-10 flex-shrink-0 pt-0.5">
                    {session.startsAt}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-medium text-[var(--color-text-primary)]">
                        {subject?.name ?? "과목 없음"}
                      </span>
                      <span className="text-[10px] text-[var(--color-text-muted)] flex-shrink-0">
                        {session.startsAt}–{session.endsAt}
                      </span>
                    </div>
                    {getStudentNames(session) && (
                      <p className="text-xs text-[var(--color-text-muted)] truncate mt-0.5">
                        {getStudentNames(session)}
                      </p>
                    )}
                    {teacher && (
                      <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                        {teacher.name} 선생님
                      </p>
                    )}
                  </div>
                </button>
                {onAttendanceClick && (
                  <button
                    aria-label="출석 체크"
                    onClick={() => onAttendanceClick(session)}
                    className="flex-shrink-0 flex flex-col items-center justify-center gap-0.5 ml-1"
                    title="출석 체크"
                  >
                    <span
                      className={[
                        "w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center",
                        ATTENDANCE_STATUS_COLORS[attStatus],
                      ].join(" ")}
                    >
                      {ATTENDANCE_STATUS_LABELS[attStatus]}
                    </span>
                    <span className="text-[9px] text-[var(--color-text-muted)]">출석</span>
                  </button>
                )}
              </div>
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
