"use client";

/**
 * 주간 시간표 그리드 — viewMode === "weekly" 시 렌더.
 *
 * 기존: schedule/page.tsx 의 inline JSX (~84 줄, line 2122-2205) — SelectionBar +
 * cross-week filter banner (ADR-020 Variant C) + ScheduleGridSection + EmptyWeekState.
 *
 * 본 component: presentation only. ScheduleGridSection 의 30+ props 그대로 통과.
 *
 * Sub-proposal: schedule-page-split-refactor PR 23 (loop iter 20, JSX 분리 phase).
 */

import type { RefObject } from "react";
import type { Session, Subject, Student, Teacher, Enrollment } from "@/lib/planner";
import type { ColorByMode } from "@/components/molecules/SessionBlock.utils";
import { EmptyWeekState } from "@/components/molecules/EmptyWeekState";
import SelectionBar from "@/components/atoms/SelectionBar";
import ScheduleGridSection from "./ScheduleGridSection";

/** "YYYY-MM-DD" KST 월요일 → "M월 D일 — M월 D일" 표시 (banner 용). */
function formatBannerWeekRange(mondayIso: string): string {
  const monday = new Date(`${mondayIso}T12:00:00+09:00`);
  if (isNaN(monday.getTime())) return mondayIso;
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) => `${d.getMonth() + 1}월 ${d.getDate()}일`;
  return `${fmt(monday)} — ${fmt(sunday)}`;
}

interface ClosestMatchingWeekResult {
  weekStartDate: string;
  count: number;
  isFuture: boolean;
}

interface Props {
  // SelectionBar
  selectionCount: number;
  onBulkDelete: () => void;
  onClearSelection: () => void;

  // Cross-week banner
  closestMatchingWeek: ClosestMatchingWeekResult | null;
  onJumpToMatchingWeek: (weekStartDate: string) => void;

  // ScheduleGridSection
  containerRef: RefObject<HTMLDivElement | null>;
  gridVersion: number;
  sessions: Map<number, Session[]>;
  subjects: Subject[];
  enrollments: Enrollment[];
  students: Student[];
  teachers: Teacher[];
  onSessionClick: (...args: any[]) => void;
  onSessionDelete: (session: Session) => void;
  onDrop: (...args: any[]) => void;
  onSessionDrop: (...args: any[]) => Promise<void> | void;
  onSessionCopy: ((...args: any[]) => Promise<void> | void) | undefined;
  onSessionInsertBefore:
    | ((...args: any[]) => Promise<void> | void)
    | undefined;
  onEmptySpaceClick: (...args: any[]) => void;
  selectedStudentIds: string[];
  selectedSubjectIds: string[];
  selectedTeacherIds: string[];
  isStudentDragging: boolean;
  colorBy: ColorByMode;
  baseDate: Date;
  selectedSessionIds: Set<string>;
  onSessionSelectToggle: ((sessionId: string) => void) | undefined;
  onSessionContextMenuCopy: ((sessionId: string) => void) | undefined;
  onSessionContextMenuStartSelect: ((sessionId: string) => void) | undefined;
  startHour: number;
  endHour: number;
  fillHeight: boolean;
  attendanceMapBySession?: Record<
    string,
    Record<string, Record<string, { status: string }>>
  >;

  // EmptyWeekState
  weekFilteredSessionsCount: number;
  hasTemplate: boolean;
  canManage: boolean;
  onApplyTemplate: () => void;
  onAddSession: () => void;
}

export default function ScheduleWeeklyGrid(props: Props) {
  return (
    <div className="relative">
      <SelectionBar
        count={props.selectionCount}
        onDelete={props.onBulkDelete}
        onClear={props.onClearSelection}
      />
      {/* ADR-020 보강 (UAT 2026-05-21): cross-week filter empty banner (Variant C).
        * 현재 주에 매칭 없고 다른 주에 있으면 표시. 클릭 시 가장 가까운 매칭 주로 navigate. */}
      {props.closestMatchingWeek && (
        <div
          role="status"
          data-testid="cross-week-filter-banner"
          className="px-3 py-2 mb-2 rounded bg-[var(--color-bg-secondary)] border-l-2 border-[var(--color-accent)] text-xs"
        >
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[var(--color-text-primary)] font-medium">
              현재 주에 필터 매칭 수업이 없어요
            </span>
            <button
              type="button"
              onClick={() =>
                props.onJumpToMatchingWeek(
                  props.closestMatchingWeek!.weekStartDate,
                )
              }
              className="shrink-0 px-2 py-1 text-[10px] rounded bg-[var(--color-accent)] text-white font-bold hover:opacity-90"
            >
              {props.closestMatchingWeek.isFuture ? "다음" : "지난"} 매칭 주로 →
            </button>
          </div>
          <p className="text-[10px] text-[var(--color-text-muted)]">
            가장 가까운 매칭:{" "}
            <span className="text-[var(--color-text-secondary)] font-medium">
              {formatBannerWeekRange(props.closestMatchingWeek.weekStartDate)}
            </span>{" "}
            ({props.closestMatchingWeek.count}개 수업)
          </p>
        </div>
      )}
      <ScheduleGridSection
        containerRef={props.containerRef}
        gridVersion={props.gridVersion}
        sessions={props.sessions}
        subjects={props.subjects}
        enrollments={props.enrollments}
        students={props.students}
        onSessionClick={props.onSessionClick}
        onSessionDelete={props.onSessionDelete}
        onDrop={props.onDrop}
        onSessionDrop={props.onSessionDrop}
        onSessionCopy={props.onSessionCopy}
        onSessionInsertBefore={props.onSessionInsertBefore}
        onEmptySpaceClick={props.onEmptySpaceClick}
        selectedStudentIds={props.selectedStudentIds}
        selectedSubjectIds={props.selectedSubjectIds}
        selectedTeacherIds={props.selectedTeacherIds}
        isStudentDragging={props.isStudentDragging}
        teachers={props.teachers}
        colorBy={props.colorBy}
        baseDate={props.baseDate}
        selectedSessionIds={props.selectedSessionIds}
        onSessionSelectToggle={props.onSessionSelectToggle}
        onSessionContextMenuCopy={props.onSessionContextMenuCopy}
        onSessionContextMenuStartSelect={props.onSessionContextMenuStartSelect}
        startHour={props.startHour}
        endHour={props.endHour}
        fillHeight={props.fillHeight}
        attendanceMapBySession={props.attendanceMapBySession}
        isReadOnly={!props.canManage}
        allowReadOnlySessionClick={!props.canManage}
      />
      {props.weekFilteredSessionsCount === 0 && (
        <EmptyWeekState
          hasTemplate={props.hasTemplate}
          onApplyTemplate={() => {
            if (props.canManage) props.onApplyTemplate();
          }}
          onAddSession={() => {
            if (!props.canManage) return;
            props.onAddSession();
          }}
        />
      )}
    </div>
  );
}
