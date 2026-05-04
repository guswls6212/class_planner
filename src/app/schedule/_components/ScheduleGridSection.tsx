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
  onEmptySpaceClick: (
    weekday: number,
    time: string,
    yPosition?: number
  ) => void;
  selectedStudentIds?: string[];
  isStudentDragging: boolean;
  teachers?: Teacher[];
  colorBy?: ColorByMode;
  baseDate: Date;
  /** 다중 선택된 세션 id Set */
  selectedSessionIds?: Set<string>;
  /** modifier(Shift/Ctrl/Meta) + click */
  onSessionSelectToggle?: (sessionId: string) => void;
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
  onEmptySpaceClick,
  selectedStudentIds,
  isStudentDragging,
  teachers = [],
  colorBy = "subject",
  baseDate,
  selectedSessionIds,
  onSessionSelectToggle,
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
        onEmptySpaceClick={onEmptySpaceClick}
        selectedStudentIds={selectedStudentIds}
        isStudentDragging={isStudentDragging}
        teachers={teachers}
        colorBy={colorBy}
        baseDate={baseDate}
        selectedSessionIds={selectedSessionIds}
        onSessionSelectToggle={onSessionSelectToggle}
      />
    </div>
  );
}
