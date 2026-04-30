import React, { useMemo } from "react";
import MonthDayCell from "../molecules/MonthDayCell";
import type { Enrollment, Session, Student, Subject, Teacher } from "../../lib/planner";
import { getWeekStartDate } from "../../lib/weekStart";
import type { ColorByMode } from "@/hooks/useColorBy";

interface ScheduleMonthlyViewProps {
  sessions: Session[];
  subjects: Subject[];
  enrollments: Enrollment[];
  students?: Student[];
  teachers?: Teacher[];
  colorBy?: ColorByMode;
  selectedStudentIds?: string[];
  currentDate: Date;
  onDayClick: (date: Date) => void;
}

const WEEKDAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

function buildCalendarDays(currentDate: Date): Date[] {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstOfMonth = new Date(year, month, 1);
  // Mon-based: 0=Mon, 6=Sun; JS getDay(): 0=Sun, 1=Mon, ..., 6=Sat
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7; // 0=Mon offset

  const lastOfMonth = new Date(year, month + 1, 0);
  const totalCells =
    Math.ceil((firstWeekday + lastOfMonth.getDate()) / 7) * 7;

  const days: Date[] = [];
  for (let i = 0; i < totalCells; i++) {
    const d = new Date(year, month, 1 - firstWeekday + i);
    days.push(d);
  }
  return days;
}

export default function ScheduleMonthlyView({
  sessions,
  subjects,
  enrollments,
  students = [],
  teachers = [],
  colorBy = "subject",
  selectedStudentIds,
  currentDate,
  onDayClick,
}: ScheduleMonthlyViewProps) {
  const today = useMemo(() => new Date(), []);

  const calendarDays = useMemo(() => buildCalendarDays(currentDate), [currentDate]);

  const currentMonth = currentDate.getMonth();

  function isSameDay(a: Date, b: Date) {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="py-1 text-xs font-medium text-[var(--color-text-muted)]"
          >
            {label}
          </div>
        ))}

        {/* Day cells */}
        {calendarDays.map((date, idx) => {
          const weekday = (date.getDay() + 6) % 7; // Mon=0
          const weekStart = getWeekStartDate(date);
          const daySessions = sessions.filter(
            (s) => s.weekday === weekday && s.weekStartDate === weekStart
          );
          return (
            <MonthDayCell
              key={idx}
              date={date}
              sessions={daySessions}
              subjects={subjects}
              enrollments={enrollments}
              students={students}
              teachers={teachers}
              colorBy={colorBy}
              selectedStudentIds={selectedStudentIds}
              isToday={isSameDay(date, today)}
              isCurrentMonth={date.getMonth() === currentMonth}
              onDayClick={onDayClick}
            />
          );
        })}
      </div>
    </div>
  );
}
