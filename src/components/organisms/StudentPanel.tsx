import React from "react";
import type { Student } from "../../lib/planner";
import type { StudentPanelState } from "../../types/scheduleTypes";

interface StudentPanelProps {
  selectedStudentId: string;
  panelState: StudentPanelState;
  onMouseDown: (e: React.MouseEvent) => void;
  onStudentClick: (studentId: string) => void;
  onDragStart: (e: React.DragEvent, student: Student) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onSearchChange: (query: string) => void;
}

const StudentPanel: React.FC<StudentPanelProps> = ({
  selectedStudentId,
  panelState,
  onMouseDown,
  onStudentClick,
  onDragStart,
  onDragEnd,
  onSearchChange,
}) => {
  if (!panelState) {
    return null;
  }

  const safePosition = panelState.position || { x: 0, y: 0 };
  const safeFilteredStudents = panelState.filteredStudents || [];
  const safeSearchQuery = panelState.searchQuery || "";

  return (
    <div
      className="fixed z-[9999] overflow-auto rounded-xl border border-white/20 bg-black/85 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.8),0_10px_10px_-5px_rgba(0,0,0,0.6)] backdrop-blur-[10px] w-[280px] max-h-[400px] p-4"
      style={{
        left: safePosition.x,
        top: safePosition.y,
      }}
      onMouseDown={onMouseDown}
    >
      {/* 드래그 가능한 헤더 */}
      <div
        className={`mb-4 py-2 text-center text-base font-bold text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.5)] ${
          panelState.isDragging ? "cursor-grabbing" : "cursor-grab"
        }`}
        data-testid="students-panel-header"
        title="드래그하여 패널 위치를 이동할 수 있습니다"
      >
        <span>수강생 리스트</span>
      </div>

      {/* 검색 입력창 */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="학생 이름 검색..."
          value={safeSearchQuery}
          onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
          className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white outline-none transition-all duration-200 placeholder:text-white/60 focus:border-white/30 focus:bg-white/15 focus:shadow-[0_0_0_2px_rgba(255,255,255,0.1)]"
        />
      </div>

      <div className="m-0 flex list-none flex-col gap-2 p-0" role="list">
        {safeFilteredStudents.map((s) => (
          <div key={s.id} role="listitem">
            <div
              draggable
              className={`w-full cursor-grab select-none rounded-md border px-3 py-2 text-left text-white transition-all duration-200 active:cursor-grabbing ${
                selectedStudentId === s.id
                  ? "border-blue-500/30 bg-blue-500/50"
                  : "border-white/15 bg-white/5 hover:border-white/20 hover:bg-white/[0.08]"
              }`}
              data-testid={`student-item-${s.id}`}
              onDragStart={(e) => onDragStart && onDragStart(e, s)}
              onDragEnd={(e) => onDragEnd && onDragEnd(e)}
              onClick={() => onStudentClick && onStudentClick(s.id)}
            >
              {s.name}
            </div>
          </div>
        ))}
        {safeFilteredStudents.length === 0 && (
          <div
            className="px-3 py-2 text-gray-400"
            role="listitem"
          >
            {safeSearchQuery.trim()
              ? "검색 결과가 없습니다"
              : "학생 페이지에서 학생을 추가하세요"}
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(StudentPanel);
