import React from "react";
import TimeTableGrid from "../../../components/organisms/TimeTableGrid";
import type {
  Enrollment,
  Session,
  Student,
  Subject,
  Teacher,
} from "../../../lib/planner";
import type { ColorByMode } from "../../../hooks/useColorBy";

type Props = {
  containerRef: React.RefObject<HTMLDivElement | null>;
  gridVersion: number;
  sessions: Map<number, Session[]>;
  subjects: Subject[];
  enrollments: Enrollment[];
  students: Student[];
  onSessionClick: (session: Session) => void;
  onSessionDelete?: (session: Session) => void;
  onDrop: (
    weekday: number,
    time: string,
    enrollmentId: string,
    yPosition?: number
  ) => void;
  onSessionDrop: (
    sessionId: string,
    weekday: number,
    time: string,
    yPosition: number
  ) => void;
  onSessionCopy?: (
    sessionId: string,
    weekday: number,
    time: string,
    yPosition: number
  ) => void;
  /** Variant E (Edge Hover Slot) — lane 사이 droppable 에 drop 시 호출. */
  onSessionInsertBefore?: (
    sessionId: string,
    weekday: number,
    time: string,
    insertBeforeYPos: number,
  ) => void;
  onEmptySpaceClick: (
    weekday: number,
    time: string,
    yPosition?: number
  ) => void;
  selectedStudentIds?: string[];
  selectedSubjectIds?: string[];
  selectedTeacherIds?: string[];
  isStudentDragging: boolean;
  teachers?: Teacher[];
  colorBy?: ColorByMode;
  baseDate: Date;
  /** 다중 선택된 세션 id Set */
  selectedSessionIds?: Set<string>;
  /** modifier(Shift/Ctrl/Meta) + click */
  onSessionSelectToggle?: (sessionId: string) => void;
  /** 모바일 long-press 메뉴 — "복사" */
  onSessionContextMenuCopy?: (sessionId: string) => void;
  /** 모바일 long-press 메뉴 — "선택 시작" */
  onSessionContextMenuStartSelect?: (sessionId: string) => void;
  /** 시간표 표시 시작 시각 (0-23). default 9. */
  startHour?: number;
  /** 시간표 표시 종료 시각 (0-23, inclusive). default 23. */
  endHour?: number;
  /** P3 모드처럼 외부 scroll container가 있을 때 grid 자체 max-h 제거. */
  fillHeight?: boolean;
  /**
   * 출결 map by sessionId — SessionBlock 우하단 출결 dot 시각 계산용.
   * caller (schedule/page.tsx) 가 useAttendance.attendance state 그대로 전달.
   */
  attendanceMapBySession?: Record<string, Record<string, { status: string }>>;
};

export default function ScheduleGridSection({
  containerRef,
  gridVersion,
  sessions,
  subjects,
  enrollments,
  students,
  onSessionClick,
  onSessionDelete,
  onDrop,
  onSessionDrop,
  onSessionCopy,
  onSessionInsertBefore,
  onEmptySpaceClick,
  selectedStudentIds,
  selectedSubjectIds,
  selectedTeacherIds,
  isStudentDragging,
  teachers = [],
  colorBy = "subject",
  baseDate,
  selectedSessionIds,
  onSessionSelectToggle,
  onSessionContextMenuCopy,
  onSessionContextMenuStartSelect,
  startHour,
  endHour,
  fillHeight,
  attendanceMapBySession,
}: Props) {
  return (
    <div ref={containerRef}>
      <TimeTableGrid
        key={gridVersion}
        sessions={sessions}
        subjects={subjects}
        enrollments={enrollments}
        students={students}
        onSessionClick={onSessionClick}
        onSessionDelete={onSessionDelete}
        onDrop={onDrop}
        onSessionDrop={onSessionDrop}
        onSessionCopy={onSessionCopy}
        onSessionInsertBefore={onSessionInsertBefore}
        onEmptySpaceClick={onEmptySpaceClick}
        selectedStudentIds={selectedStudentIds}
        selectedSubjectIds={selectedSubjectIds}
        selectedTeacherIds={selectedTeacherIds}
        isStudentDragging={isStudentDragging}
        teachers={teachers}
        colorBy={colorBy}
        baseDate={baseDate}
        selectedSessionIds={selectedSessionIds}
        onSessionSelectToggle={onSessionSelectToggle}
        onSessionContextMenuCopy={onSessionContextMenuCopy}
        onSessionContextMenuStartSelect={onSessionContextMenuStartSelect}
        startHour={startHour}
        endHour={endHour}
        fillHeight={fillHeight}
        attendanceMapBySession={attendanceMapBySession}
      />
    </div>
  );
}
