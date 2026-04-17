import { SESSION_CELL_HEIGHT } from "@/shared/constants/sessionConstants";
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
import { useMediaQuery } from "../../hooks/useMediaQuery";
import TimeTableRow from "../molecules/TimeTableRow";

interface DragPreviewState {
  draggedSession: Session | null;
  targetWeekday: number | null;
  targetTime: string | null;
  targetYPosition: number | null;
}

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

    const [dragPreview, setDragPreview] = useState<DragPreviewState>({
      draggedSession: null,
      targetWeekday: null,
      targetTime: null,
      targetYPosition: null,
    });

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

    const timeCols = timeSlots30Min.length; // 30개 열

    const getSessionYPositions = useCallback(
      (weekday: number): Map<string, number> => {
        const daySessions = sessions?.get(weekday) || [];
        const sessionYPositions = new Map<string, number>();

        daySessions.forEach((session) => {
          const logicalPosition = session.yPosition || 1;
          const pixelPosition = (logicalPosition - 1) * SESSION_CELL_HEIGHT;
          sessionYPositions.set(session.id, pixelPosition);
        });

        return sessionYPositions;
      },
      [sessions]
    );

    const getWeekdayHeight = useCallback(
      (weekday: number): number => {
        const daySessions = sessions?.get(weekday) || [];

        if (daySessions.length === 0) {
          return 49;
        }

        const maxYPosition = Math.max(
          ...daySessions.map((session) => session.yPosition || 1)
        );

        const height = maxYPosition * SESSION_CELL_HEIGHT;

        return Math.max(49, height);
      },
      [sessions]
    );

    // 요일별 높이를 useMemo로 최적화
    const weekdayHeights = useMemo(
      () => Array.from({ length: 7 }, (_, i) => getWeekdayHeight(i)),
      [getWeekdayHeight]
    );

    // 그리드 템플릿 행을 useMemo로 최적화
    const gridTemplateRows = useMemo(
      () => `40px ${weekdayHeights.map((h) => `${h}px`).join(" ")}`,
      [weekdayHeights]
    );

    // 그리드 템플릿 열: 모바일(< 768px)에서는 축소된 너비 사용
    const gridTemplateColumns = useMemo(
      () =>
        isMobile
          ? `56px repeat(${timeCols}, 64px)` // 모바일: 요일 56px + 열 64px
          : `80px repeat(${timeCols}, 100px)`, // 데스크탑: 요일 80px + 열 100px
      [timeCols, isMobile]
    );

    const handleDragStart = useCallback(
      (session: Session) => {
        if (isTouchDevice) return;
        setDragPreview({
          draggedSession: session,
          targetWeekday: null,
          targetTime: null,
          targetYPosition: null,
        });
      },
      [isTouchDevice]
    );

    const handleDragOver = useCallback(
      (weekday: number, time: string, yPosition: number) => {
        if (isTouchDevice) return;
        if (!dragPreview.draggedSession) return;

        setDragPreview((prev) => ({
          ...prev,
          targetWeekday: weekday,
          targetTime: time,
          targetYPosition: yPosition,
        }));
      },
      [dragPreview.draggedSession, isTouchDevice]
    );

    const handleDragEnd = useCallback(() => {
      logger.info("TimeTableGrid 드래그 종료");

      setDragPreview({
        draggedSession: null,
        targetWeekday: null,
        targetTime: null,
        targetYPosition: null,
      });

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
    }, [getSavedScrollPosition]);

    return (
      <div className="time-table-container" data-surface="surface" data-testid="time-table-grid">
        <div
          ref={(node) => {
            if (ref) {
              if (typeof ref === "function") {
                ref(node);
              } else {
                ref.current = node;
              }
            }

            // ref 콜백에서는 복원하지 않음 (useEffect에서 처리)

            gridRef.current = node;
          }}
          className={`time-table-grid grid bg-[var(--color-bg-primary)] border border-[var(--color-border-grid-light)] rounded-t-lg overflow-y-auto overflow-x-auto relative isolate max-h-[80vh] ${className}`}
          style={{
            gridTemplateColumns,
            gridTemplateRows,
            ...style,
          }}
        >
          {/* 좌상단 빈칸 */}
          <div className="bg-[var(--color-bg-primary)]" />

          {/* 시간 헤더 (X축 상단) */}
          {timeSlots30Min.map((timeString, index) => {
            const isLastTime = index === timeSlots30Min.length - 1;
            return (
              <div
                key={timeString}
                className={`shadow-sm flex items-center justify-center p-1 text-center ${isMobile ? "text-[9px]" : "text-[11px]"} text-[var(--color-text-secondary)] bg-[var(--color-bg-primary)] border border-[var(--color-border)] h-[40px] sticky top-0 z-[999] ${isLastTime ? "border-r-[var(--color-border)]" : "border-r-[var(--color-border-grid)]"}`}
              >
                {timeString}
              </div>
            );
          })}

          {/* 요일별 행 (Y축 왼쪽) */}
          {Array.from({ length: 7 }, (_, weekday) => {
            return (
              <TimeTableRow
                key={weekday}
                weekday={weekday}
                height={weekdayHeights[weekday]}
                sessions={sessions}
                subjects={subjects}
                enrollments={enrollments}
                students={students}
                sessionYPositions={getSessionYPositions(weekday)}
                onSessionClick={isReadOnly ? () => {} : onSessionClick}
                onSessionDelete={isReadOnly ? undefined : onSessionDelete}
                onDrop={isReadOnly ? () => {} : onDrop}
                onSessionDrop={isReadOnly ? undefined : onSessionDrop}
                onEmptySpaceClick={isReadOnly ? () => {} : onEmptySpaceClick}
                selectedStudentIds={selectedStudentIds}
                isAnyDragging={isAnyDragging || isStudentDragging}
                teachers={teachers}
                colorBy={colorBy}
                isMobile={isMobile}
                // 터치 디바이스에서는 drag-and-drop 핸들러를 전달하지 않음
                onDragStart={isTouchDevice ? undefined : handleDragStart}
                onDragOver={isTouchDevice ? undefined : handleDragOver}
                onDragEnd={isTouchDevice ? undefined : handleDragEnd}
                dragPreview={isTouchDevice ? undefined : dragPreview}
              />
            );
          })}
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
