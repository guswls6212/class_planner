import { useEffect, useMemo, useState } from 'react';
import type { Student } from '../lib/planner';
import type {
  DragOffset,
  PanelPosition,
  StudentPanelState,
} from '../types/scheduleTypes';

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
  const [position, setPosition] = useState<PanelPosition>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<DragOffset>({ x: 0, y: 0 });

  // 검색어에 따라 필터링된 학생 목록
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    return students.filter(student =>
      student.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [students, searchQuery]);

  // 패널을 화면 정중앙에 위치시키는 useEffect
  useEffect(() => {
    const savedPos = localStorage.getItem('ui:studentsPanelPos');
    if (!savedPos) {
      const panelWidth = 280;
      const panelHeight = 400;
      const centerX = (window.innerWidth - panelWidth) / 2;
      const centerY = (window.innerHeight - panelHeight) / 2;
      setPosition({ x: centerX, y: centerY });
    }
  }, []);

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

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!isDragging) return;
      setPosition({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y });
    }
    function onUp() {
      setIsDragging(false);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isDragging, dragOffset]);

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
