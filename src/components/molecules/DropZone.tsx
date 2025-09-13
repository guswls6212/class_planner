import React, { useState } from "react";

interface DropZoneProps {
  weekday: number;
  time: string;
  onDrop: (weekday: number, time: string, enrollmentId: string) => void;
  onSessionDrop?: (
    sessionId: string,
    weekday: number,
    time: string,
    yPosition: number
  ) => void; // 🆕 세션 드롭 핸들러
  onEmptySpaceClick: (weekday: number, time: string) => void;
  style?: React.CSSProperties;
  // 🆕 드래그 오버 핸들러
  onDragOver?: (weekday: number, time: string, yPosition: number) => void;
  // 🆕 드래그 중인 세션의 시간 범위 (드롭 영역 표시용)
  draggedSessionTimeRange?: { startsAt: string; endsAt: string } | null;
}

export default function DropZone({
  weekday,
  time,
  onDrop,
  onSessionDrop, // 🆕 세션 드롭 핸들러
  onEmptySpaceClick,
  style,
  onDragOver, // 🆕 드래그 오버 핸들러
  draggedSessionTimeRange, // 🆕 드래그 중인 세션의 시간 범위
}: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();

    // 🆕 실시간 미리보기를 위한 드래그 오버 처리
    if (onDragOver) {
      const rect = e.currentTarget.getBoundingClientRect();
      const yPosition = Math.max(0, e.clientY - rect.top);
      onDragOver(weekday, time, yPosition);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const data = e.dataTransfer?.getData("text/plain");

    if (data) {
      // 🆕 세션 드롭 처리
      if (data.startsWith("session:")) {
        const sessionId = data.replace("session:", "");

        // Y축 위치 계산 (드롭 위치 기반)
        const rect = e.currentTarget.getBoundingClientRect();
        const yPosition = Math.max(0, e.clientY - rect.top);

        if (onSessionDrop) {
          onSessionDrop(sessionId, weekday, time, yPosition);
        }
      }
      // 🆕 기존 enrollment 드롭 처리
      else {
        if (onDrop) {
          onDrop(weekday, time, data);
        }
      }
    }
  };

  const handleClick = () => {
    if (onEmptySpaceClick) {
      onEmptySpaceClick(weekday, time);
    }
  };

  // 🆕 드래그 중인 세션의 시간 범위에만 드롭 영역 표시 (학생 드래그는 항상 표시)
  const shouldShowDropZone = () => {
    // 학생 드래그인 경우 항상 드롭존 표시
    if (!draggedSessionTimeRange) return true;

    // 세션 드래그의 경우 요일만 맞으면 드롭존 표시
    // 실제 시간 충돌과 위치 조정은 TimeTableGrid의 스마트 포지셔닝에서 처리
    return true;
  };

  const shouldShow = shouldShowDropZone();
  const showBorder = isDragOver && shouldShow;

  const styles = {
    ...style,
    border: showBorder
      ? "2px dashed var(--color-primary)"
      : "1px dashed transparent",
    backgroundColor: showBorder
      ? "rgba(var(--color-primary-rgb), 0.1)"
      : style?.backgroundColor || "transparent",
    cursor: "pointer",
    pointerEvents: "auto" as const, // 클릭 이벤트가 제대로 작동하도록 설정
  };

  return (
    <div
      style={styles}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
      data-testid={`dropzone-${weekday}-${time}`}
    />
  );
}
