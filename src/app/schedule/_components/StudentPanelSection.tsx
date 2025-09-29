import React from "react";
import StudentPanel from "../../../components/organisms/StudentPanel";

type Props = {
  selectedStudentId: string;
  panelState: {
    position: { x: number; y: number };
    isDragging: boolean;
    dragOffset: { x: number; y: number };
    searchQuery: string;
    filteredStudents: any[];
    handleMouseDown: (e: React.MouseEvent) => void;
    handleStudentClick: (studentId: string) => void;
    setSearchQuery: (query: string) => void;
    resetDragState: () => void;
    setIsDragStarting: (value: boolean) => void;
  };
  onDragStart: (
    e: React.DragEvent,
    student: { id: string; name: string }
  ) => void;
  onDragEnd: (e: React.DragEvent) => void;
};

export default function StudentPanelSection({
  selectedStudentId,
  panelState,
  onDragStart,
  onDragEnd,
}: Props) {
  return (
    <StudentPanel
      selectedStudentId={selectedStudentId}
      panelState={panelState}
      onMouseDown={panelState.handleMouseDown}
      onStudentClick={panelState.handleStudentClick}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onSearchChange={panelState.setSearchQuery}
    />
  );
}
