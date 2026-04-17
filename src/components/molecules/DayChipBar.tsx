"use client";

import { weekdays } from "@/lib/planner";

interface DayChipBarProps {
  selectedWeekday: number; // 0=Mon
  onSelectWeekday: (weekday: number) => void;
  baseDate: Date;
}

export function DayChipBar({ selectedWeekday, onSelectWeekday, baseDate }: DayChipBarProps) {
  // Calculate the Monday of the week containing baseDate
  const monday = new Date(baseDate);
  const dayOfWeek = (monday.getDay() + 6) % 7;
  monday.setDate(monday.getDate() - dayOfWeek);

  return (
    <div className="flex gap-1 overflow-x-auto px-4 py-2 scrollbar-none border-b border-[var(--color-border)]">
      {weekdays.map((label, idx) => {
        const date = new Date(monday);
        date.setDate(monday.getDate() + idx);
        const isActive = idx === selectedWeekday;
        const isToday = date.toDateString() === new Date().toDateString();

        return (
          <button
            key={idx}
            onClick={() => onSelectWeekday(idx)}
            className={`flex flex-col items-center min-w-[44px] py-1.5 px-2 rounded-md transition-colors ${
              isActive
                ? "bg-accent text-white"
                : isToday
                ? "bg-[var(--color-overlay-light)] text-accent font-medium"
                : "text-[var(--color-text-muted)] hover:bg-[var(--color-overlay-light)]"
            }`}
          >
            <span className="text-[11px] font-medium">{label}</span>
            <span className="text-[10px]">{date.getDate()}</span>
          </button>
        );
      })}
    </div>
  );
}
