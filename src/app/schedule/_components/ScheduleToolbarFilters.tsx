"use client";

/**
 * Schedule 페이지의 toolbar 필터/네비 영역.
 *
 * 기존: schedule/page.tsx 의 inline JSX (~72 줄, line 2080-2151) — !isP3 조건부
 * filter chip bars + DayChipBar (daily) + Row 2 (date navigator + view mode +
 * color toggle).
 *
 * 본 component: presentation only. 모든 state/handler 는 parent (page.tsx) 에서
 * 주입. P3 모드는 ScheduleFloatingToolbar 가 별도 처리 — 본 component 는 default
 * 모드 전용.
 *
 * Sub-proposal: schedule-page-split-refactor PR 19 (loop iter 16, JSX 분리 phase).
 */

import type { Student, Teacher } from "@/lib/planner";
import type { ScheduleViewMode } from "@/hooks/useScheduleView";
import type { ColorByMode } from "@/components/molecules/SessionBlock.utils";
import { DayChipBar } from "@/components/molecules/DayChipBar";
import { ScheduleDateNavigator } from "@/components/molecules/ScheduleDateNavigator";
import SegmentedButton from "@/components/atoms/SegmentedButton";
import ColorByToggle from "@/components/molecules/ColorByToggle";
import StudentFilterChipBar from "./StudentFilterChipBar";
import TeacherFilterChipBar from "./TeacherFilterChipBar";

interface Props {
  /** P3 모드 — true 면 ScheduleFloatingToolbar 가 대체. 본 component 는 default 모드만 렌더 */
  isP3: boolean;
  viewMode: ScheduleViewMode;
  colorBy: ColorByMode;
  /** 학생/강사 필터 chip 노출 (member 는 false — 전체 명단 노출 방지 + 본인 수업만이라 불필요). default true. */
  showFilters?: boolean;

  // === Student filter ===
  students: Student[];
  selectedStudentIds: string[];
  onToggleStudentFilter: (id: string) => void;
  onClearStudentFilter: () => void;
  onStudentDragStart: (e: React.DragEvent, student: Student) => void;
  onStudentDragEnd: (e: React.DragEvent) => void;

  // === Teacher filter ===
  teachers: Teacher[];
  selectedTeacherIds: string[];
  onToggleTeacherFilter: (id: string) => void;
  onClearTeacherFilter: () => void;

  // === DayChipBar (daily 전용) ===
  selectedWeekday: number;
  baseDate: Date;
  onSelectWeekday: (wd: number) => void;

  // === Row 2: date nav + view mode + color toggle ===
  dateLabel: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  prevAriaLabel: string;
  nextAriaLabel: string;
  viewModes: readonly { label: string; value: ScheduleViewMode }[];
  onChangeViewMode: (mode: ScheduleViewMode) => void;
  onChangeColorBy: (mode: ColorByMode) => void;
}

export default function ScheduleToolbarFilters({
  isP3,
  viewMode,
  colorBy,
  showFilters = true,
  students,
  selectedStudentIds,
  onToggleStudentFilter,
  onClearStudentFilter,
  onStudentDragStart,
  onStudentDragEnd,
  teachers,
  selectedTeacherIds,
  onToggleTeacherFilter,
  onClearTeacherFilter,
  selectedWeekday,
  baseDate,
  onSelectWeekday,
  dateLabel,
  onPrev,
  onNext,
  onToday,
  prevAriaLabel,
  nextAriaLabel,
  viewModes,
  onChangeViewMode,
  onChangeColorBy,
}: Props) {
  return (
    <>
      {/* default 모드 — chip bar. P3 는 floating toolbar 의 통합 필터로 이동.
       * ADR-020 R5: colorBy="student" 모드 폐기. backup UI 의 학생 chip bar 는 mode 무관 항상 표시. */}
      {!isP3 && showFilters && (
        <StudentFilterChipBar
          students={students}
          selectedStudentIds={selectedStudentIds}
          onToggleStudent={onToggleStudentFilter}
          onClearFilter={onClearStudentFilter}
          onDragStart={onStudentDragStart}
          onDragEnd={onStudentDragEnd}
        />
      )}

      {!isP3 && showFilters && colorBy === "teacher" && (
        <TeacherFilterChipBar
          teachers={teachers}
          selectedTeacherIds={selectedTeacherIds}
          onToggleTeacher={onToggleTeacherFilter}
          onClearFilter={onClearTeacherFilter}
        />
      )}

      {/* 일별 뷰: 요일 칩 바 */}
      {viewMode === "daily" && (
        <DayChipBar
          selectedWeekday={selectedWeekday}
          onSelectWeekday={onSelectWeekday}
          baseDate={baseDate}
        />
      )}

      {/* Row 2: 날짜 네비 + 뷰·색상 토글. P3 모드는 ScheduleFloatingToolbar 로 이동. */}
      {!isP3 && (
        <div className="flex items-center justify-between gap-2 px-1 py-2">
          <ScheduleDateNavigator
            label={dateLabel}
            onPrev={onPrev}
            onNext={onNext}
            onToday={onToday}
            prevAriaLabel={prevAriaLabel}
            nextAriaLabel={nextAriaLabel}
          />
          <div className="flex items-center gap-2 shrink-0">
            <SegmentedButton
              options={viewModes}
              value={viewMode}
              onChange={onChangeViewMode}
              aria-label="뷰 모드"
            />
            <div className="flex items-center gap-1">
              <ColorByToggle colorBy={colorBy} onChange={onChangeColorBy} />
              {colorBy === "teacher" && teachers.length > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[rgba(167,139,250,0.15)] text-[var(--color-accent)] border border-[rgba(167,139,250,0.3)]">
                  강사 {teachers.length}명
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
