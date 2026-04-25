import {
  LANE_WIDTH_PX_DESKTOP,
  LANE_WIDTH_PX_MOBILE,
  SLOT_HEIGHT_PX,
} from "@/shared/constants/sessionConstants";
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { logger } from "../../lib/logger";
import type { Session, Subject, Teacher } from "../../lib/planner";
import type { ColorByMode } from "../../hooks/useColorBy";
import { computeRequiredLanes, computeTentativeLayout } from "../../lib/sessionCollisionUtils";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { useDragController } from "../../hooks/useDragController";
import TimeTableRow from "../molecules/TimeTableRow";

interface TimeTableGridProps {
  sessions: Map<number, Session[]>;
  subjects: Subject[];
  enrollments: Array<{ id: string; studentId: string; subjectId: string }>;
  students: Array<{ id: string; name: string }>;
  onSessionClick: (session: Session) => void;
  onSessionDelete?: (session: Session) => void;
  onDrop: (weekday: number, time: string, enrollmentId: string) => void;
  onSessionDrop?: (
    sessionId: string,
    weekday: number,
    time: string,
    yPosition: number
  ) => void;
  onEmptySpaceClick: (weekday: number, time: string) => void;
  className?: string;
  style?: React.CSSProperties;
  ref?: React.Ref<HTMLDivElement>;
  selectedStudentIds?: string[];
  isAnyDragging?: boolean;
  isStudentDragging?: boolean;
  teachers?: Teacher[];
  colorBy?: ColorByMode;
  isReadOnly?: boolean;
}

const WEEKDAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

const TimeTableGrid = forwardRef<HTMLDivElement, TimeTableGridProps>(
  (
    {
      sessions,
      subjects,
      enrollments,
      students,
      onSessionClick,
      onSessionDelete,
      onDrop,
      onSessionDrop,
      onEmptySpaceClick,
      className = "",
      style = {},
      selectedStudentIds,
      isAnyDragging = false,
      isStudentDragging = false,
      teachers = [],
      colorBy = "subject",
      isReadOnly = false,
    },
    ref
  ) => {
    // 반응형: 모바일 뷰포트 감지 (SSR-safe)
    const isMobile = useMediaQuery("(max-width: 767px)");

    // 터치 디바이스 감지 (drag-and-drop 비활성화용)
    const isTouchDevice =
      typeof window !== "undefined" && "ontouchstart" in window;

    const dragController = useDragController();

    const [scrollbarState, setScrollbarState] = useState({
      thumbWidth: 0,
      thumbPosition: 0,
      isDragging: false,
    });

    const gridRef = useRef<HTMLDivElement>(null);
    const scrollbarThumbRef = useRef<HTMLDivElement>(null);

    const scrollPositionRef = useRef<{ scrollLeft: number; scrollTop: number }>(
      {
        scrollLeft: 0,
        scrollTop: 0,
      }
    );

    const updateScrollbar = useCallback(() => {
      const element = gridRef.current;
      if (!element) return;

      const containerWidth = element.clientWidth;
      const contentWidth = element.scrollWidth;
      const scrollLeft = element.scrollLeft;

      scrollPositionRef.current = {
        scrollLeft: element.scrollLeft,
        scrollTop: element.scrollTop,
      };

      if (contentWidth <= containerWidth) {
        setScrollbarState({
          thumbWidth: 0,
          thumbPosition: 0,
          isDragging: false,
        });
        return;
      }

      const thumbWidth = (containerWidth / contentWidth) * containerWidth;
      const thumbPosition =
        (scrollLeft / (contentWidth - containerWidth)) *
        (containerWidth - thumbWidth);

      setScrollbarState((prev) => ({
        ...prev,
        thumbWidth: Math.max(thumbWidth, 30),
        thumbPosition: Math.max(0, thumbPosition),
      }));
    }, []);

    const handleScrollbarMouseDown = useCallback((e: React.MouseEvent) => {
      e.preventDefault();
      setScrollbarState((prev) => ({ ...prev, isDragging: true }));
    }, []);

    const handleScrollbarMouseMove = useCallback(
      (e: MouseEvent) => {
        if (!scrollbarState.isDragging) return;

        const element = gridRef.current;
        if (!element) return;

        const containerWidth = element.clientWidth;
        const contentWidth = element.scrollWidth;
        const scrollbarContainer = element;

        const rect = scrollbarContainer.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const thumbWidth = scrollbarState.thumbWidth;
        const maxPosition = containerWidth - thumbWidth;

        const newPosition = Math.max(
          0,
          Math.min(clickX - thumbWidth / 2, maxPosition)
        );
        const scrollRatio = newPosition / maxPosition;
        const newScrollLeft = scrollRatio * (contentWidth - containerWidth);

        element.scrollLeft = newScrollLeft;
      },
      [scrollbarState.isDragging, scrollbarState.thumbWidth]
    );

    const handleScrollbarMouseUp = useCallback(() => {
      setScrollbarState((prev) => ({ ...prev, isDragging: false }));
    }, []);

    const handleScrollbarTrackClick = useCallback((e: React.MouseEvent) => {
      const element = gridRef.current;
      if (!element) return;

      const containerWidth = element.clientWidth;
      const contentWidth = element.scrollWidth;
      const scrollbarContainer = e.currentTarget as HTMLElement;

      const rect = scrollbarContainer.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const scrollRatio = clickX / rect.width;
      const newScrollLeft = scrollRatio * (contentWidth - containerWidth);

      element.scrollLeft = newScrollLeft;
    }, []);

    useEffect(() => {
      const element = gridRef.current;
      if (!element) return;

      const timer = setTimeout(updateScrollbar, 100);

      return () => {
        clearTimeout(timer);
      };
    }, [updateScrollbar]);

    const saveScrollPosition = useCallback(() => {
      const element = gridRef.current;
      if (!element) return;

      const scrollData = {
        scrollLeft: element.scrollLeft,
        scrollTop: element.scrollTop,
        timestamp: Date.now(),
      };

      try {
        localStorage.setItem(
          "schedule_scroll_position",
          JSON.stringify(scrollData)
        );
      } catch (error) {
        // localStorage 에러는 무시
      }
    }, []);

    const getSavedScrollPosition = useCallback(() => {
      try {
        const savedData = localStorage.getItem("schedule_scroll_position");
        if (savedData) {
          const { scrollLeft, scrollTop, timestamp } = JSON.parse(savedData);

          // 5분 이내의 데이터만 사용
          if (Date.now() - timestamp < 5 * 60 * 1000) {
            return { scrollLeft, scrollTop };
          }
        }
      } catch (error) {
        // localStorage 에러는 무시
      }
      return null;
    }, []);

    const restoreScrollPosition = useCallback(() => {
      const element = gridRef.current;
      if (!element) return;

      const savedPosition = getSavedScrollPosition();
      if (savedPosition) {
        element.scrollLeft = savedPosition.scrollLeft;
        element.scrollTop = savedPosition.scrollTop;
      }
    }, [getSavedScrollPosition]);

    // 마운트 시 한 번만 스크롤 위치 복원 (초기 상태가 0,0일 때만)
    useEffect(() => {
      const element = gridRef.current;
      if (!element) return;

      const savedPosition = getSavedScrollPosition();
      if (savedPosition) {
        if (
          element.scrollLeft === 0 &&
          element.scrollTop === 0 &&
          savedPosition.scrollLeft > 0
        ) {
          element.scrollLeft = savedPosition.scrollLeft;
          element.scrollTop = savedPosition.scrollTop;
        }
      }
    }, [getSavedScrollPosition]);

    useEffect(() => {
      const element = gridRef.current;
      if (!element) return;

      let saveTimer: NodeJS.Timeout;
      const handleScrollWithSave = () => {
        updateScrollbar();
        clearTimeout(saveTimer);
        saveTimer = setTimeout(saveScrollPosition, 300);
      };

      element.addEventListener("scroll", handleScrollWithSave);

      return () => {
        clearTimeout(saveTimer);
        element.removeEventListener("scroll", handleScrollWithSave);
      };
    }, [updateScrollbar, saveScrollPosition]);

    useEffect(() => {
      if (scrollbarState.isDragging) {
        document.addEventListener("mousemove", handleScrollbarMouseMove);
        document.addEventListener("mouseup", handleScrollbarMouseUp);
      }

      return () => {
        document.removeEventListener("mousemove", handleScrollbarMouseMove);
        document.removeEventListener("mouseup", handleScrollbarMouseUp);
      };
    }, [
      scrollbarState.isDragging,
      handleScrollbarMouseMove,
      handleScrollbarMouseUp,
    ]);

    const timeSlots30Min = useMemo(() => {
      const slots: string[] = [];
      for (let hour = 9; hour < 24; hour++) {
        slots.push(`${hour.toString().padStart(2, "0")}:00`);
        slots.push(`${hour.toString().padStart(2, "0")}:30`);
      }
      return slots;
    }, []);

    const slotCount = timeSlots30Min.length;


    // 드래그 중 목표 위치를 기반으로 레이아웃을 미리 계산해 TimeTableRow에 전달.
    // 드래그가 없으면 원본 sessions Map을 그대로 반환 (참조 동일).
    // 드래그 세션을 포함한 결과를 반환 — TimeTableRow에서 SessionBlock 렌더 시 skip하고
    // 대신 DragGhost를 렌더한다. 이렇게 해야 weekdayMaxLanes 계산에 ghost lane이 반영된다.
    const sessionsForRender = useMemo(
      () =>
        computeTentativeLayout(
          sessions,
          enrollments,
          subjects,
          dragController.draggedSession,
          dragController.targetWeekday,
          dragController.targetTime,
          dragController.targetYPosition,
        ),
      [sessions, enrollments, subjects, dragController],
    );

    const laneWidth = isMobile ? LANE_WIDTH_PX_MOBILE : LANE_WIDTH_PX_DESKTOP;

    // 각 weekday column 너비 = max lanes × laneWidth.
    // 드래그 중에는 sessionsForRender(tentative layout, 드래그 세션 포함)를 기준으로 계산해
    // 컬럼이 실시간으로 확장/축소되는 미리보기를 제공한다.
    const weekdayWidths = useMemo(
      () => {
        const isDraggingAny = dragController.isAnyDragging() || isStudentDragging;
        const baseMap = isDraggingAny ? sessionsForRender : sessions;
        return Array.from({ length: 7 }, (_, wd) => {
          const daySessions = baseMap?.get(wd) || [];
          const required = computeRequiredLanes(daySessions);
          const lanes = (!isDraggingAny && required >= 4) ? 2 : required;
          return Math.max(1, lanes) * laneWidth;
        });
      },
      [sessions, sessionsForRender, dragController, isStudentDragging, laneWidth]
    );

    const timeLabelColWidth = isMobile ? 40 : 56;
    const headerRowHeight = 40;
    const contentHeight = slotCount * SLOT_HEIGHT_PX;

    const gridTemplateColumns = useMemo(
      () =>
        `${timeLabelColWidth}px ${weekdayWidths.map((w) => `${w}px`).join(" ")}`,
      [timeLabelColWidth, weekdayWidths]
    );

    const gridTemplateRows = `${headerRowHeight}px ${contentHeight}px`;

    // document-level dragend 리셋은 useDragController 내부 useEffect가 처리.

    const handleDragStart = useCallback(
      (session: Session) => {
        if (isTouchDevice) return;
        dragController.startSessionDrag(session);
      },
      [isTouchDevice, dragController]
    );

    const handleDragOver = useCallback(
      (weekday: number, time: string, yPosition: number) => {
        if (isTouchDevice) return;
        if (!dragController.draggedSession) return;
        dragController.hoverTarget(weekday, time, yPosition);
      },
      [dragController, isTouchDevice]
    );

    const handleDragEnd = useCallback(() => {
      logger.info("TimeTableGrid 드래그 종료");
      dragController.cancelDrag();

      // 세션 드래그앤드롭 후 스크롤 위치 복원 (다음 페인트 직후)
      requestAnimationFrame(() => {
        const element = gridRef.current;
        if (element) {
          const savedPosition = getSavedScrollPosition();
          if (savedPosition) {
            element.scrollLeft = savedPosition.scrollLeft;
            element.scrollTop = savedPosition.scrollTop;
          }
        }
      });
    }, [dragController, getSavedScrollPosition]);

    return (
      <div
        className="time-table-container"
        data-testid="time-table-grid"
      >
        <div
          ref={(node) => {
            if (ref) {
              if (typeof ref === "function") {
                ref(node);
              } else {
                ref.current = node;
              }
            }
            gridRef.current = node;
          }}
          className={`time-table-grid grid bg-[var(--color-bg-primary)] border border-[var(--color-border-grid-light)] rounded-t-lg overflow-y-auto overflow-x-auto relative isolate max-h-[80vh] ${className}`}
          style={{
            gridTemplateColumns,
            gridTemplateRows,
            ...style,
          }}
        >
          {/* (1,1) 좌상단 빈 코너 — sticky top+left */}
          <div
            className="sticky top-0 left-0 z-[1000] bg-[var(--color-bg-primary)] border-b border-r border-[var(--color-border)]"
            style={{ gridColumn: 1, gridRow: 1 }}
          />

          {/* (1, 2..8) 요일 헤더 — sticky top */}
          {WEEKDAY_LABELS.map((label, weekday) => (
            <div
              key={`header-${weekday}`}
              className={`shadow-sm sticky top-0 z-[999] flex items-center justify-center font-bold ${isMobile ? "text-[11px]" : "text-sm"} text-[var(--color-text-primary)] bg-[var(--color-bg-primary)] border border-[var(--color-border)]`}
              style={{ gridColumn: weekday + 2, gridRow: 1 }}
            >
              {label}
            </div>
          ))}

          {/* (2, 1) 시간 라벨 컬럼 — sticky left */}
          <div
            className="sticky left-0 z-[998] flex flex-col bg-[var(--color-bg-primary)] border-r border-[var(--color-border)]"
            style={{ gridColumn: 1, gridRow: 2, height: contentHeight }}
          >
            {timeSlots30Min.map((timeString) => (
              <div
                key={`time-${timeString}`}
                className={`flex items-start justify-end pr-1 pt-0.5 ${isMobile ? "text-[9px]" : "text-[10px]"} text-[var(--color-text-secondary)] border-b border-[var(--color-border-grid-light)]`}
                style={{ height: SLOT_HEIGHT_PX }}
              >
                {timeString}
              </div>
            ))}
          </div>

          {/* (2, 2..8) 요일별 컬럼 */}
          {Array.from({ length: 7 }, (_, weekday) => (
            <TimeTableRow
              key={weekday}
              weekday={weekday}
              width={weekdayWidths[weekday]}
              sessions={sessionsForRender}
              subjects={subjects}
              enrollments={enrollments}
              students={students}
              onSessionClick={isReadOnly ? () => {} : onSessionClick}
              onSessionDelete={isReadOnly ? undefined : onSessionDelete}
              onDrop={isReadOnly ? () => {} : onDrop}
              onSessionDrop={isReadOnly ? undefined : onSessionDrop}
              onEmptySpaceClick={isReadOnly ? () => {} : onEmptySpaceClick}
              selectedStudentIds={selectedStudentIds}
              isAnyDragging={dragController.isAnyDragging() || isStudentDragging}
              teachers={teachers}
              colorBy={colorBy}
              isMobile={isMobile}
              onDragStart={isTouchDevice ? undefined : handleDragStart}
              onDragOver={isTouchDevice ? undefined : handleDragOver}
              onDragEnd={isTouchDevice ? undefined : handleDragEnd}
              dragPreview={isTouchDevice ? undefined : {
                draggedSession: dragController.draggedSession,
                targetWeekday: dragController.targetWeekday,
                targetTime: dragController.targetTime,
                targetYPosition: dragController.targetYPosition,
              }}
              style={{ gridColumn: weekday + 2, gridRow: 2 }}
            />
          ))}
        </div>

        {/* 가상 가로 스크롤바 */}
        <div
          className="virtual-scrollbar-container"
          onClick={handleScrollbarTrackClick}
        >
          <div
            ref={scrollbarThumbRef}
            className="virtual-scrollbar-thumb"
            style={{
              left: `${scrollbarState.thumbPosition}px`,
              width: `${scrollbarState.thumbWidth}px`,
            }}
            onMouseDown={handleScrollbarMouseDown}
          />
        </div>
      </div>
    );
  }
);

export { TimeTableGrid };
export default TimeTableGrid;
