import { useEffect, useMemo, useState } from 'react';
import type { Student } from '../lib/planner';
import type { DragOffset, StudentPanelState } from '../types/scheduleTypes';
import { usePanelPosition } from './usePanelPosition';

export const useStudentPanel = (
  students: Student[],
  selectedStudentId: string,
  setSelectedStudentId: (id: string) => void
): StudentPanelState & {
  setSearchQuery: (query: string) => void;
  handleMouseDown: (e: React.MouseEvent) => void;
  handleStudentClick: (studentId: string) => void;
} => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<DragOffset>({ x: 0, y: 0 });

  // 패널 위치 관리
  const { position, updatePosition } = usePanelPosition();

  // 검색어에 따라 필터링된 학생 목록
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    return students.filter(student =>
      student.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [students, searchQuery]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleStudentClick = (studentId: string) => {
    if (!isDragging) {
      if (selectedStudentId === studentId) {
        setSelectedStudentId('');
      } else {
        setSelectedStudentId(studentId);
      }
    }
  };

  // 드래그 이벤트 처리
  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!isDragging) return;

      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;

      // 화면 경계 체크
      const maxX = window.innerWidth - 280; // 패널 너비
      const maxY = window.innerHeight - 400; // 패널 높이

      const boundedX = Math.max(0, Math.min(newX, maxX));
      const boundedY = Math.max(0, Math.min(newY, maxY));

      updatePosition({ x: boundedX, y: boundedY });
    }

    function onUp() {
      setIsDragging(false);
    }

    if (isDragging) {
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    }

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isDragging, dragOffset, updatePosition]);

  return {
    position,
    isDragging,
    dragOffset,
    searchQuery,
    filteredStudents,
    setSearchQuery,
    handleMouseDown,
    handleStudentClick,
  };
};
