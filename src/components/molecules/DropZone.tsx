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

    console.log("🆕 DropZone handleDrop 호출됨:", { weekday, time });
    console.log("🆕 dataTransfer types:", e.dataTransfer?.types);

    const data = e.dataTransfer?.getData("text/plain");
    console.log("🆕 가져온 데이터:", data);

    if (data) {
      // 🆕 세션 드롭 처리
      if (data.startsWith("session:")) {
        const sessionId = data.replace("session:", "");
        console.log("🆕 세션 드롭 감지:", { sessionId, weekday, time });

        // Y축 위치 계산 (드롭 위치 기반)
        const rect = e.currentTarget.getBoundingClientRect();
        const yPosition = Math.max(0, e.clientY - rect.top);

        if (onSessionDrop) {
          console.log("🆕 onSessionDrop 호출:", {
            sessionId,
            weekday,
            time,
            yPosition,
          });
          onSessionDrop(sessionId, weekday, time, yPosition);
        }
      }
      // 🆕 기존 enrollment 드롭 처리
      else {
        console.log("🆕 enrollment 드롭 감지:", data);
        if (onDrop) {
          console.log("🆕 onDrop 호출:", { weekday, time, enrollmentId: data });
          onDrop(weekday, time, data);
        }
      }
    } else {
      console.log("🆕 드롭 데이터가 없음");
    }
  };

  const handleClick = () => {
    if (onEmptySpaceClick) {
      onEmptySpaceClick(weekday, time);
    }
  };

  // 🆕 드래그 중인 세션의 시간 범위에만 드롭 영역 표시
  const shouldShowDropZone = () => {
    if (!draggedSessionTimeRange) return false;

    const { startsAt, endsAt } = draggedSessionTimeRange;
    const currentTime = time;

    // 현재 시간이 드래그 중인 세션의 시간 범위에 포함되는지 확인
    return currentTime >= startsAt && currentTime < endsAt;
  };

  const styles = {
    ...style,
    border:
      isDragOver && shouldShowDropZone()
        ? "2px dashed var(--color-primary)"
        : "1px dashed transparent",
    backgroundColor:
      isDragOver && shouldShowDropZone()
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
