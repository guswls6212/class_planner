import { SESSION_CELL_HEIGHT } from "@/shared/constants/sessionConstants";
import React, { useState } from "react";

interface DropZoneProps {
  weekday: number;
  time: string;
  yPosition?: number; // 🆕 현재 DropZone의 yPosition (1, 2, 3...)
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
  isDragging?: boolean; // 드래그 중인지 여부
  // 🆕 드래그 프리뷰 정보
  dragPreview?: { draggedSession: any } | null;
}

export default function DropZone({
  weekday,
  time,
  yPosition = 1, // 🆕 기본값 1
  onDrop,
  onSessionDrop, // 🆕 세션 드롭 핸들러
  onEmptySpaceClick,
  style,
  onDragOver, // 🆕 드래그 오버 핸들러
  draggedSessionTimeRange, // 🆕 드래그 중인 세션의 시간 범위
  isDragging = false, // 🆕 기본값 false
  dragPreview = null, // 🆕 드래그 프리뷰 정보
}: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);

    // 🆕 드롭 효과 설정 (드롭 허용)
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);

    // 🆕 드롭 효과 설정 (드롭 허용)
    e.dataTransfer.dropEffect = "move";

    // 🆕 실시간 미리보기를 위한 드래그 오버 처리
    if (onDragOver) {
      // 현재 DropZone의 yPosition을 픽셀 위치로 변환
      const pixelYPosition = (yPosition - 1) * SESSION_CELL_HEIGHT;
      onDragOver(weekday, time, pixelYPosition);
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

        // 현재 DropZone의 yPosition을 픽셀 위치로 변환
        const pixelYPosition = (yPosition - 1) * SESSION_CELL_HEIGHT;

        if (onSessionDrop) {
          onSessionDrop(sessionId, weekday, time, pixelYPosition);
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
    // 🆕 드래그 중일 때 드롭존이 더 잘 보이도록 미세한 배경색 추가
    ...(isDragging &&
      !showBorder && {
        backgroundColor: "rgba(var(--color-primary-rgb), 0.02)",
      }),
  };

  return (
    <div
      style={styles}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
      data-testid={`dropzone-${weekday}-${time}-${yPosition}`}
    >
      {/* 🆕 개별 DropZone으로 단순화 - 분할 렌더링 제거 */}
    </div>
  );
}
