"use client";

import React, { useState } from "react";
import { BottomSheet } from "../../../components/molecules/BottomSheet";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import StudentPanel from "../../../components/organisms/StudentPanel";

type Props = {
  selectedStudentId: string;
  panelState: {
    position: { x: number; y: number };
    isDragging: boolean;
    dragOffset: { x: number; y: number };
    searchQuery: string;
    filteredStudents: Array<{ id: string; name: string }>;
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
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);

  const panelContent = (
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

  if (isMobile) {
    return (
      <>
        {/* 모바일: 수강생 목록 열기 버튼 */}
        <button
          type="button"
          onClick={() => setBottomSheetOpen(true)}
          className="fixed bottom-20 right-4 z-[99] flex items-center gap-2 rounded-full bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white shadow-lg"
          aria-label="수강생 목록 열기"
        >
          <span>수강생</span>
          {selectedStudentId && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/30 text-xs">
              1
            </span>
          )}
        </button>

        <BottomSheet
          isOpen={bottomSheetOpen}
          onClose={() => setBottomSheetOpen(false)}
          title="수강생 리스트"
          aria-labelledby="student-panel-sheet-title"
        >
          {/* BottomSheet 내부에서 StudentPanel 컨텐츠만 렌더 (floating 패널 제외) */}
          <div className="flex flex-col gap-2">
            <input
              type="text"
              placeholder="학생 이름 검색..."
              value={panelState.searchQuery}
              onChange={(e) => panelState.setSearchQuery(e.target.value)}
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]"
            />
            <div className="flex flex-col gap-2" role="list">
              {panelState.filteredStudents.map((s) => (
                <div key={s.id} role="listitem">
                  <button
                    type="button"
                    className={`w-full rounded-md border px-3 py-2 text-left text-sm transition-all duration-200 ${
                      selectedStudentId === s.id
                        ? "border-[var(--color-accent)] bg-[var(--color-accent)]/20 text-[var(--color-accent)]"
                        : "border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
                    }`}
                    onClick={() => {
                      panelState.handleStudentClick(s.id);
                      setBottomSheetOpen(false);
                    }}
                  >
                    {s.name}
                  </button>
                </div>
              ))}
              {panelState.filteredStudents.length === 0 && (
                <p className="px-3 py-2 text-sm text-[var(--color-text-secondary)]">
                  {panelState.searchQuery.trim()
                    ? "검색 결과가 없습니다"
                    : "학생 페이지에서 학생을 추가하세요"}
                </p>
              )}
            </div>
          </div>
        </BottomSheet>
      </>
    );
  }

  // 데스크탑: 기존 floating 패널
  return panelContent;
}
