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
  onEmptySpaceClick: (
    weekday: number,
    time: string,
    yPosition?: number
  ) => void;
  selectedStudentIds?: string[];
  isStudentDragging: boolean;
  teachers?: Teacher[];
  colorBy?: ColorByMode;
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
  onEmptySpaceClick,
  selectedStudentIds,
  isStudentDragging,
  teachers = [],
  colorBy = "subject",
}: Props) {
  return (
    <div ref={containerRef} data-surface="surface">
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
        onEmptySpaceClick={onEmptySpaceClick}
        selectedStudentIds={selectedStudentIds}
        isStudentDragging={isStudentDragging}
        teachers={teachers}
        colorBy={colorBy}
      />
    </div>
  );
}
