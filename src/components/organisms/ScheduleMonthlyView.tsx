import React, { useMemo } from "react";
import MonthDayCell from "../molecules/MonthDayCell";
import type { Enrollment, Session, Subject } from "../../lib/planner";

interface ScheduleMonthlyViewProps {
  sessions: Map<number, Session[]>;
  subjects: Subject[];
  enrollments: Enrollment[];
  currentDate: Date;
  goToNextMonth: () => void;
  goToPrevMonth: () => void;
  goToToday: () => void;
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
  currentDate,
  goToNextMonth,
  goToPrevMonth,
  goToToday,
  onDayClick,
}: ScheduleMonthlyViewProps) {
  const monthLabel = `${currentDate.getFullYear()}년 ${currentDate.getMonth() + 1}월`;
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
    <div data-surface="surface" className="flex flex-col gap-2">
      {/* Month navigation */}
      <div className="flex items-center justify-between px-1">
        <button
          type="button"
          aria-label="이전 달"
          className="rounded p-1 text-[--color-text-secondary] hover:bg-[--color-bg-secondary]"
          onClick={goToPrevMonth}
        >
          ‹
        </button>
        <span className="text-base font-semibold text-[--color-text-primary]">
          {monthLabel}
        </span>
        <button
          type="button"
          aria-label="다음 달"
          className="rounded p-1 text-[--color-text-secondary] hover:bg-[--color-bg-secondary]"
          onClick={goToNextMonth}
        >
          ›
        </button>
        <button
          type="button"
          aria-label="오늘"
          className="ml-2 rounded border border-[--color-border] px-2 py-0.5 text-xs text-[--color-text-secondary] hover:bg-[--color-bg-secondary]"
          onClick={goToToday}
        >
          오늘
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="py-1 text-xs font-medium text-[--color-text-muted]"
          >
            {label}
          </div>
        ))}

        {/* Day cells */}
        {calendarDays.map((date, idx) => {
          const weekday = (date.getDay() + 6) % 7; // Mon=0
          const daySessions = sessions.get(weekday) ?? [];
          return (
            <MonthDayCell
              key={idx}
              date={date}
              sessions={daySessions}
              subjects={subjects}
              enrollments={enrollments}
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
