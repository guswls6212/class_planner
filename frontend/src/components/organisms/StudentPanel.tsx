import { useState } from 'react';
import type { Student } from '../../lib/planner';

interface StudentPanelProps {
  students: Student[];
  selectedStudentId: string;
  onStudentSelect: (studentId: string) => void;
  panelPos: { x: number; y: number };
  onPanelMove: (pos: { x: number; y: number }) => void;
}

// 유틸리티 함수들 (테스트 가능)
// eslint-disable-next-line react-refresh/only-export-components
export const getPanelStyles = (panelPos: {
  x: number;
  y: number;
}): React.CSSProperties => {
  return {
    position: 'fixed',
    left: panelPos.x,
    top: panelPos.y,
    width: 280,
    maxHeight: '400px',
    overflow: 'auto',
    background: 'rgba(0,0,0,0.5)',
    backdropFilter: 'blur(6px)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 8,
    padding: 16,
    zIndex: 1000,
  };
};

// eslint-disable-next-line react-refresh/only-export-components
export const getHeaderStyles = (isDragging: boolean): React.CSSProperties => {
  return {
    fontWeight: 700,
    marginBottom: 8,
    cursor: isDragging ? 'grabbing' : 'grab',
    padding: '4px 0',
  };
};

// eslint-disable-next-line react-refresh/only-export-components
export const getListStyles = (): React.CSSProperties => {
  return {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'grid',
    gap: 8,
  };
};

// eslint-disable-next-line react-refresh/only-export-components
export const getStudentItemStyles = (
  isSelected: boolean,
  isDragging: boolean
): React.CSSProperties => {
  return {
    width: '100%',
    textAlign: 'left',
    padding: '8px 12px',
    borderRadius: 6,
    border: '1px solid rgba(255,255,255,0.15)',
    background: isSelected ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.05)',
    color: '#fff',
    cursor: isDragging ? 'grabbing' : 'grab',
    userSelect: 'none',
    boxSizing: 'border-box',
  };
};

// eslint-disable-next-line react-refresh/only-export-components
export const getEmptyMessageStyles = (): React.CSSProperties => {
  return {
    color: '#bbb',
    padding: '8px 12px',
  };
};

// eslint-disable-next-line react-refresh/only-export-components
export const calculateDragPosition = (
  clientX: number,
  clientY: number,
  dragOffset: { x: number; y: number }
): { x: number; y: number } => {
  return {
    x: clientX - dragOffset.x,
    y: clientY - dragOffset.y,
  };
};

// eslint-disable-next-line react-refresh/only-export-components
export const shouldShowEmptyMessage = (students: Student[]): boolean => {
  return students.length === 0;
};

// eslint-disable-next-line react-refresh/only-export-components
export const isStudentSelected = (
  studentId: string,
  selectedStudentId: string
): boolean => {
  return studentId === selectedStudentId;
};

// eslint-disable-next-line react-refresh/only-export-components
export const getPanelWidth = (): number => {
  return 280;
};

// eslint-disable-next-line react-refresh/only-export-components
export const getPanelMaxHeight = (): string => {
  return '400px';
};

// eslint-disable-next-line react-refresh/only-export-components
export const getPanelZIndex = (): number => {
  return 1000;
};

// eslint-disable-next-line react-refresh/only-export-components
export const validatePanelPosition = (pos: {
  x: number;
  y: number;
}): boolean => {
  return typeof pos.x === 'number' && typeof pos.y === 'number';
};

// eslint-disable-next-line react-refresh/only-export-components
export const getDragEffect = (): 'copy' => {
  return 'copy';
};

export default function StudentPanel({
  students,
  selectedStudentId,
  onStudentSelect,
  panelPos,
  onPanelMove,
}: StudentPanelProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsDragging(true);
      setDragOffset({
        x: e.nativeEvent.offsetX,
        y: e.nativeEvent.offsetY,
      });
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    const newPosition = calculateDragPosition(e.clientX, e.clientY, dragOffset);
    onPanelMove(newPosition);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // 이벤트 리스너 등록
  useState(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  });

  const panelStyles = getPanelStyles(panelPos);
  const headerStyles = getHeaderStyles(isDragging);
  const listStyles = getListStyles();

  return (
    <div style={panelStyles}>
      {/* 드래그 가능한 헤더 */}
      <div style={headerStyles} onMouseDown={handleMouseDown}>
        수강생 리스트
      </div>

      <ul style={listStyles}>
        {students.map(s => {
          const isSelected = isStudentSelected(s.id, selectedStudentId);
          const studentItemStyles = getStudentItemStyles(
            isSelected,
            isDragging
          );

          return (
            <li key={s.id}>
              <div
                draggable
                onDragStart={e => {
                  e.dataTransfer.setData('text/plain', s.id);
                  e.dataTransfer.effectAllowed = getDragEffect();
                }}
                style={studentItemStyles}
                onClick={() => onStudentSelect(s.id)}
              >
                {s.name}
              </div>
            </li>
          );
        })}
        {shouldShowEmptyMessage(students) && (
          <li style={getEmptyMessageStyles()}>
            학생 페이지에서 학생을 추가하세요
          </li>
        )}
      </ul>
    </div>
  );
}
