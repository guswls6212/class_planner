import React from "react";
import styles from "../../app/schedule/Schedule.module.css";
import type { Student } from "../../lib/planner";
import type { StudentPanelState } from "../../types/scheduleTypes";

interface StudentPanelProps {
  selectedStudentId: string;
  panelState: StudentPanelState;
  onMouseDown: (e: React.MouseEvent) => void;
  onStudentClick: (studentId: string) => void;
  onDragStart: (e: React.DragEvent, student: Student) => void;
  onSearchChange: (query: string) => void;
}

const StudentPanel: React.FC<StudentPanelProps> = ({
  selectedStudentId,
  panelState,
  onMouseDown,
  onStudentClick,
  onDragStart,
  onSearchChange,
}) => {
  // null/undefined 안전 처리
  if (!panelState) {
    return null;
  }

  const safePosition = panelState.position || { x: 0, y: 0 };
  const safeFilteredStudents = panelState.filteredStudents || [];
  const safeSearchQuery = panelState.searchQuery || "";

  return (
    <div
      className={`${styles.floatingPanel} position-fixed overflow-auto`}
      style={{
        left: safePosition.x,
        top: safePosition.y,
        width: 280,
        maxHeight: "400px",
        padding: 16,
      }}
      onMouseDown={onMouseDown}
    >
      {/* 드래그 가능한 헤더 */}
      <div
        className={`${styles.panelHeader} ${
          panelState.isDragging ? "cursor-grabbing" : "cursor-grab"
        }`}
        data-testid="students-panel-header"
        title="드래그하여 패널 위치를 이동할 수 있습니다"
      >
        <span>수강생 리스트</span>
      </div>

      {/* 검색 입력창 */}
      <div className={styles.searchContainer}>
        <input
          type="text"
          placeholder="학생 이름 검색..."
          value={safeSearchQuery}
          onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      <div className={styles.studentList} role="list">
        {safeFilteredStudents.map((s) => (
          <div key={s.id} role="listitem">
            <div
              draggable
              className={`${styles.studentItem} ${
                selectedStudentId === s.id ? styles.selected : ""
              }`}
              data-testid={`student-item-${s.id}`}
              onDragStart={(e) => onDragStart && onDragStart(e, s)}
              onMouseDown={() => onStudentClick && onStudentClick(s.id)}
            >
              {s.name}
            </div>
          </div>
        ))}
        {safeFilteredStudents.length === 0 && (
          <div
            style={{ color: "var(--color-gray-400)", padding: "8px 12px" }}
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
