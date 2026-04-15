import { useEffect, useMemo, useState } from "react";
import type { Student } from "../lib/planner";
import { logger } from "../lib/logger";
import type { DragOffset, StudentPanelState } from "../types/scheduleTypes";

export const useStudentPanel = (
  students: Student[],
  selectedStudentId: string,
  setSelectedStudentId: (id: string) => void,
  onDragEnd?: () => void // 🆕 드래그 종료 콜백 추가
): StudentPanelState & {
  setSearchQuery: (query: string) => void;
  handleMouseDown: (e: React.MouseEvent) => void;
  handleStudentClick: (studentId: string) => void;
  resetDragState: () => void;
  setIsDragStarting: (value: boolean) => void;
} => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<DragOffset>({ x: 0, y: 0 });
  const [isDragStarting, setIsDragStarting] = useState(false); // 🆕 드래그 시작 플래그

  // 패널 위치 관리 (직접 localStorage 사용)
  const [position, setPosition] = useState({ x: 20, y: 100 });

  // localStorage에서 패널 위치 로드
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedPosition = localStorage.getItem("studentPanelPosition");
      if (savedPosition) {
        try {
          const parsed = JSON.parse(savedPosition);
          setPosition(parsed);
        } catch (error) {
          logger.warn("패널 위치 파싱 실패", undefined, error instanceof Error ? error : undefined);
        }
      }
    }
  }, []);

  // 패널 위치 업데이트 함수
  const updatePosition = (newPosition: { x: number; y: number }) => {
    setPosition(newPosition);
    if (typeof window !== "undefined") {
      localStorage.setItem("studentPanelPosition", JSON.stringify(newPosition));
    }
  };

  // 검색어에 따라 필터링된 학생 목록
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    return students.filter((student) =>
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
    // 🆕 드래그 중이거나 드래그 시작 중일 때는 학생 선택 방지
    if (!isDragging && !isDragStarting) {
      if (selectedStudentId === studentId) {
        setSelectedStudentId("");
      } else {
        setSelectedStudentId(studentId);
      }
    }
  };

  // 🆕 드래그 상태 강제 리셋 함수
  const resetDragState = () => {
    setIsDragging(false);
    setIsDragStarting(false);
    setDragOffset({ x: 0, y: 0 });
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
      setIsDragStarting(false); // 🆕 드래그 시작 플래그도 리셋

      // 🆕 드래그 종료 콜백 호출 (전역 드래그 상태 리셋)
      if (onDragEnd) {
        onDragEnd();
      }
    }

    if (isDragging) {
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    }

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
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
    resetDragState,
    setIsDragStarting,
  };
};
