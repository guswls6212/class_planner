import React from "react";
import StudentPanel from "../../../components/organisms/StudentPanel";

type Props = {
  selectedStudentId: string;
  panelState: any;
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
