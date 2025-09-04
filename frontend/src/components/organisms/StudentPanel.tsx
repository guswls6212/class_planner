import React from 'react';
import type { Student } from '../../lib/planner';
import styles from '../../pages/Schedule.module.css';
import type { StudentPanelState } from '../../types/scheduleTypes';

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
  return (
    <div
      className={`${styles.floatingPanel} position-fixed overflow-auto`}
      style={{
        left: panelState.position.x,
        top: panelState.position.y,
        width: 280,
        maxHeight: '400px',
        padding: 16,
      }}
      onMouseDown={onMouseDown}
    >
      {/* 드래그 가능한 헤더 */}
      <div
        className={`${styles.panelHeader} ${panelState.isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        data-testid="students-panel-header"
      >
        수강생 리스트
      </div>

      {/* 검색 입력창 */}
      <div className={styles.searchContainer}>
        <input
          type="text"
          placeholder="학생 이름 검색..."
          value={panelState.searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      <div className={styles.studentList} role="list">
        {panelState.filteredStudents.map(s => (
          <div key={s.id} role="listitem">
            <div
              draggable
              className={`${styles.studentItem} ${selectedStudentId === s.id ? styles.selected : ''}`}
              data-testid={`student-item-${s.id}`}
              onDragStart={e => onDragStart(e, s)}
              onMouseDown={() => onStudentClick(s.id)}
            >
              {s.name}
            </div>
          </div>
        ))}
        {panelState.filteredStudents.length === 0 && (
          <div
            style={{ color: 'var(--color-gray-400)', padding: '8px 12px' }}
            role="listitem"
          >
            {panelState.searchQuery.trim()
              ? '검색 결과가 없습니다'
              : '학생 페이지에서 학생을 추가하세요'}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentPanel;
