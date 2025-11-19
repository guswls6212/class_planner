import { SESSION_CELL_HEIGHT } from "@/shared/constants/sessionConstants";
import React, { useEffect, useState } from "react";
import { logger } from "../../lib/logger";

interface DropZoneProps {
  weekday: number;
  time: string;
  yPosition?: number; // 🆕 현재 DropZone의 yPosition (1, 2, 3...)
  onDrop: (
    weekday: number,
    time: string,
    enrollmentId: string,
    yPosition?: number
  ) => void; // 🆕 yPosition 추가
  onSessionDrop?: (
    sessionId: string,
    weekday: number,
    time: string,
    yPosition: number
  ) => void; // 🆕 세션 드롭 핸들러
  onEmptySpaceClick: (
    weekday: number,
    time: string,
    yPosition?: number
  ) => void; // 🆕 yPosition 추가
  style?: React.CSSProperties;
  // 🆕 드래그 오버 핸들러
  onDragOver?: (weekday: number, time: string, yPosition: number) => void;
  // 🆕 드래그 중인 세션의 시간 범위 (드롭 영역 표시용)
  draggedSessionTimeRange?: { startsAt: string; endsAt: string } | null;
  isDragging?: boolean; // 드래그 중인지 여부
  isAnyDragging?: boolean; // 🆕 전역 드래그 상태 (학생 드래그와 세션 드래그 모두 포함)
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
  isAnyDragging = false, // 🆕 전역 드래그 상태 기본값 false
  dragPreview = null, // 🆕 드래그 프리뷰 정보
}: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  // 🆕 전역 드래그 상태가 리셋될 때 드래그 오버 상태도 리셋
  useEffect(() => {
    if (!isAnyDragging) {
      setIsDragOver(false);
    }
  }, [isAnyDragging]);

  const handleDragEnter = (e: React.DragEvent) => {
    logger.debug("DropZone handleDragEnter 호출됨", {
      weekday,
      time,
      yPosition,
      effectAllowed: e.dataTransfer?.effectAllowed,
      types: e.dataTransfer?.types,
    });
    e.preventDefault();
    e.stopPropagation(); // 이벤트 전파 중단
    setIsDragOver(true);

    // 🆕 드롭 효과 설정 (드롭 허용) - effectAllowed를 기반으로 판단
    if (e.dataTransfer) {
      if (e.dataTransfer.effectAllowed === "move") {
        e.dataTransfer.dropEffect = "move"; // 세션 드래그는 move
      } else {
        e.dataTransfer.dropEffect = "copy"; // 학생 드래그는 copy
      }
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false); // 🆕 드래그 리브 시 드롭존 표시 해제
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation(); // 이벤트 전파 중단
    setIsDragOver(true); // 🆕 드래그 오버 시 드롭존 표시

    // 🆕 드롭 효과 설정 (드롭 허용) - effectAllowed를 기반으로 판단
    if (e.dataTransfer) {
      if (e.dataTransfer.effectAllowed === "move") {
        e.dataTransfer.dropEffect = "move"; // 세션 드래그는 move
      } else {
        e.dataTransfer.dropEffect = "copy"; // 학생 드래그는 copy
      }
    }

    // 🆕 실시간 미리보기를 위한 드래그 오버 처리
    if (onDragOver) {
      // 현재 DropZone의 yPosition을 픽셀 위치로 변환
      const pixelYPosition = (yPosition - 1) * SESSION_CELL_HEIGHT;
      onDragOver(weekday, time, pixelYPosition);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    logger.debug("DropZone handleDrop 호출됨", {
      weekday,
      time,
      yPosition,
      effectAllowed: e.dataTransfer?.effectAllowed,
      dropEffect: e.dataTransfer?.dropEffect,
      types: e.dataTransfer?.types,
    });
    e.preventDefault();
    e.stopPropagation(); // 이벤트 전파 중단
    setIsDragOver(false); // 🆕 드롭 시 드래그 오버 상태 리셋

    const data = e.dataTransfer?.getData("text/plain");
    logger.debug("DropZone 드롭 데이터", { data });

    // 🆕 드래그 상태 리셋 - 드래그 소스의 드래그 상태를 강제로 종료
    if (e.dataTransfer && typeof e.dataTransfer.clearData === "function") {
      e.dataTransfer.clearData();
      // 드롭 후에는 effectAllowed를 none으로 설정하지 않음 (드래그 종료 시 자연스럽게 처리)
    }

    if (data) {
      // 🆕 세션 드롭 처리
      if (data.startsWith("session:")) {
        const sessionId = data.replace("session:", "");
        logger.debug("세션 드롭 처리", { sessionId });

        // 현재 DropZone의 yPosition을 픽셀 위치로 변환
        const pixelYPosition = (yPosition - 1) * SESSION_CELL_HEIGHT;

        if (onSessionDrop) {
          onSessionDrop(sessionId, weekday, time, pixelYPosition);
        }
      }
      // 🆕 기존 enrollment 드롭 처리
      else {
        logger.debug("enrollment 드롭 처리", { data });
        if (onDrop) {
          onDrop(weekday, time, data, yPosition); // 🆕 yPosition 추가
        }
      }
    } else {
      logger.debug("DropZone: 드롭 데이터가 없음");
    }

    // 🆕 드롭 완료 후 브라우저 드래그 상태 잔상 제거 시도
    try {
      // 일부 브라우저에서 드래그 잔상이 남는 문제를 완화
      (document.activeElement as HTMLElement)?.blur?.();
    } catch {
      // 드래그 잔상 제거 실패는 무시
    }
  };

  const handleClick = () => {
    if (onEmptySpaceClick) {
      onEmptySpaceClick(weekday, time, yPosition); // 🆕 yPosition 추가
    }
  };

  // 🆕 드롭존 표시 조건 (학생 드래그와 세션 드래그 모두 동일)
  const shouldShowDropZone = () => {
    // 학생 드래그인 경우 항상 드롭존 표시
    if (!draggedSessionTimeRange) return true;

    // 세션 드래그의 경우 요일만 맞으면 드롭존 표시
    return true;
  };

  const shouldShow = shouldShowDropZone();
  // 🆕 드래그 오버된 부분만 드롭존 표시 (학생 드래그와 세션 드래그 동일)
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
      // 🆕 드롭 영역 설정 강화
      draggable={false}
      data-drop-zone="true"
      data-weekday={weekday}
      data-time={time}
      data-y-position={yPosition}
    >
      {/* 🆕 개별 DropZone으로 단순화 - 분할 렌더링 제거 */}
    </div>
  );
}
