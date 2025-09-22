import React from "react";
import TimeTableGrid from "../../../components/organisms/TimeTableGrid";
import type {
  Enrollment,
  Session,
  Student,
  Subject,
} from "../../../lib/planner";

type Props = {
  containerRef: React.RefObject<HTMLDivElement | null>;
  gridVersion: number;
  sessions: any;
  subjects: Subject[];
  enrollments: Enrollment[];
  students: Student[];
  onSessionClick: (session: Session) => void;
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
  selectedStudentId: string;
  isStudentDragging: boolean;
};

export default function ScheduleGridSection({
  containerRef,
  gridVersion,
  sessions,
  subjects,
  enrollments,
  students,
  onSessionClick,
  onDrop,
  onSessionDrop,
  onEmptySpaceClick,
  selectedStudentId,
  isStudentDragging,
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
        onDrop={onDrop}
        onSessionDrop={onSessionDrop}
        onEmptySpaceClick={onEmptySpaceClick}
        selectedStudentId={selectedStudentId}
        isStudentDragging={isStudentDragging}
      />
    </div>
  );
}
