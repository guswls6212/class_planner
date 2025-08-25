import { useState } from 'react';
import type { Student } from '../../lib/planner';

interface StudentPanelProps {
  students: Student[];
  selectedStudentId: string;
  onStudentSelect: (studentId: string) => void;
  panelPos: { x: number; y: number };
  onPanelMove: (pos: { x: number; y: number }) => void;
}

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
    onPanelMove({
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y,
    });
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

  return (
    <div
      style={{
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
      }}
    >
      {/* 드래그 가능한 헤더 */}
      <div
        style={{
          fontWeight: 700,
          marginBottom: 8,
          cursor: isDragging ? 'grabbing' : 'grab',
          padding: '4px 0',
        }}
        onMouseDown={handleMouseDown}
      >
        수강생 리스트
      </div>

      <ul
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'grid',
          gap: 8,
        }}
      >
        {students.map(s => (
          <li key={s.id}>
            <div
              draggable
              onDragStart={e => {
                e.dataTransfer.setData('text/plain', s.id);
                e.dataTransfer.effectAllowed = 'copy';
              }}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.15)',
                background:
                  selectedStudentId === s.id
                    ? 'rgba(59,130,246,0.5)'
                    : 'rgba(255,255,255,0.05)',
                color: '#fff',
                cursor: 'grab',
                userSelect: 'none',
                boxSizing: 'border-box',
              }}
              onClick={() => onStudentSelect(s.id)}
            >
              {s.name}
            </div>
          </li>
        ))}
        {students.length === 0 && (
          <li style={{ color: '#bbb', padding: '8px 12px' }}>
            학생 페이지에서 학생을 추가하세요
          </li>
        )}
      </ul>
    </div>
  );
}
