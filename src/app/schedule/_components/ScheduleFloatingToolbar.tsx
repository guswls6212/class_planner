"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ColorByMode } from "../../../hooks/useColorBy";
import type { ScheduleViewMode } from "../../../hooks/useScheduleView";
import type { TimeRange } from "../../../hooks/useTimeRange";
import TimeRangeSelector from "./TimeRangeSelector";
import UnifiedFilterPopover from "./UnifiedFilterPopover";

interface FilterItem {
  id: string;
  name: string;
  color?: string;
}

export interface ScheduleFloatingToolbarProps {
  // Date navigation
  dateLabel: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  prevAriaLabel?: string;
  nextAriaLabel?: string;

  // Filter (학생 + 과목 + 강사 통합)
  students: FilterItem[];
  selectedStudentIds: string[];
  onToggleStudent: (id: string) => void;
  subjects: FilterItem[];
  selectedSubjectIds: string[];
  onToggleSubject: (id: string) => void;
  teachers: FilterItem[];
  selectedTeacherIds: string[];
  onToggleTeacher: (id: string) => void;
  onClearAllFilters: () => void;
  onExpandToSidebar: () => void;
  colorBy: ColorByMode;

  // Time range
  timeRange: TimeRange;
  userId: string | null;

  // View mode
  viewMode: ScheduleViewMode;
  onChangeViewMode: (mode: ScheduleViewMode) => void;
}

const VIEW_LABELS: Record<ScheduleViewMode, string> = {
  daily: "일",
  weekly: "주",
  monthly: "월",
};

export default function ScheduleFloatingToolbar({
  dateLabel,
  onPrev,
  onNext,
  onToday,
  prevAriaLabel = "이전",
  nextAriaLabel = "다음",
  students,
  selectedStudentIds,
  onToggleStudent,
  subjects,
  selectedSubjectIds,
  onToggleSubject,
  teachers,
  selectedTeacherIds,
  onToggleTeacher,
  onClearAllFilters,
  onExpandToSidebar,
  colorBy,
  timeRange,
  userId,
  viewMode,
  onChangeViewMode,
}: ScheduleFloatingToolbarProps) {
  return (
    <div
      role="toolbar"
      aria-label="시간표 컨트롤"
      data-testid="schedule-floating-toolbar"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-[var(--color-bg-secondary)]/95 backdrop-blur-md shadow-2xl border border-[var(--color-border)] max-w-[min(calc(100vw-3rem),900px)]"
    >
      <button
        type="button"
        onClick={onPrev}
        aria-label={prevAriaLabel}
        className="px-2 py-1 rounded-md hover:bg-[var(--color-bg-primary)] inline-flex items-center text-[var(--color-text-secondary)]"
      >
        <ChevronLeft size={13} />
      </button>
      <span className="text-xs font-medium px-2 select-none whitespace-nowrap">
        {dateLabel}
      </span>
      <button
        type="button"
        onClick={onNext}
        aria-label={nextAriaLabel}
        className="px-2 py-1 rounded-md hover:bg-[var(--color-bg-primary)] inline-flex items-center text-[var(--color-text-secondary)]"
      >
        <ChevronRight size={13} />
      </button>
      <Divider />
      <button
        type="button"
        onClick={onToday}
        className="px-2 py-1 text-xs rounded-md hover:bg-[var(--color-bg-primary)] text-[var(--color-text-secondary)]"
      >
        오늘
      </button>
      <Divider />

      <UnifiedFilterPopover
        students={students}
        selectedStudentIds={selectedStudentIds}
        onToggleStudent={onToggleStudent}
        subjects={subjects}
        selectedSubjectIds={selectedSubjectIds}
        onToggleSubject={onToggleSubject}
        teachers={teachers}
        selectedTeacherIds={selectedTeacherIds}
        onToggleTeacher={onToggleTeacher}
        onClearAll={onClearAllFilters}
        onExpandToSidebar={onExpandToSidebar}
        colorBy={colorBy}
      />

      <Divider />

      <TimeRangeSelector
        current={timeRange}
        userId={userId}
        dropdownDirection="up"
      />

      <Divider />

      <div className="flex items-center gap-0.5">
        {(Object.keys(VIEW_LABELS) as ScheduleViewMode[]).map((mode) => {
          const isActive = viewMode === mode;
          return (
            <button
              key={mode}
              type="button"
              onClick={() => onChangeViewMode(mode)}
              aria-pressed={isActive}
              className={`px-2 py-1 text-xs rounded-md transition-colors ${
                isActive
                  ? "bg-[var(--color-accent)] text-white font-medium"
                  : "hover:bg-[var(--color-bg-primary)] text-[var(--color-text-secondary)]"
              }`}
            >
              {VIEW_LABELS[mode]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Divider() {
  return (
    <span className="w-px h-4 bg-[var(--color-border)] mx-1" aria-hidden="true" />
  );
}
