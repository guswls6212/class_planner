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

// 🆕 드래그 상태 타입 정의 (간소화)
interface DragPreviewState {
  draggedSession: Session | null; // 현재 드래그 중인 세션 객체 (드래그 시작 시 설정)
  targetWeekday: number | null; // 드래그 대상 요일 (0=월요일, 1=화요일, ..., 6=일요일)
  targetTime: string | null; // 드래그 대상 시간 (예: "09:00", "10:30")
  targetYPosition: number | null; // 드래그 대상 Y축 위치 (픽셀 단위, 0부터 시작)
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
  ) => void; // 🆕 세션 드롭 핸들러
  onEmptySpaceClick: (weekday: number, time: string) => void;
  className?: string;
  style?: React.CSSProperties;
  ref?: React.Ref<HTMLDivElement>;
  selectedStudentId?: string; // 🆕 선택된 학생 ID 추가
  isAnyDragging?: boolean; // 🆕 전역 드래그 상태 (학생 드래그와 세션 드래그 모두 포함)
  isStudentDragging?: boolean; // 🆕 학생 드래그 상태 추가
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
      onSessionDrop, // 🆕 세션 드롭 핸들러
      onEmptySpaceClick,
      className = "",
      style = {},
      selectedStudentId, // 🆕 선택된 학생 ID 추가
      isAnyDragging = false, // 🆕 전역 드래그 상태 추가
      isStudentDragging = false, // 🆕 학생 드래그 상태 추가
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

    // 🆕 드래그 상태 관리 (간소화)
    const [dragPreview, setDragPreview] = useState<DragPreviewState>({
      draggedSession: null,
      targetWeekday: null,
      targetTime: null,
      targetYPosition: null,
    });

    // 🆕 가상 스크롤바 상태 관리
    const [scrollbarState, setScrollbarState] = useState({
      thumbWidth: 0,
      thumbPosition: 0,
      isDragging: false,
    });

    const gridRef = useRef<HTMLDivElement>(null);
    const scrollbarThumbRef = useRef<HTMLDivElement>(null);

    // 🆕 스크롤 위치 보존을 위한 ref
    const scrollPositionRef = useRef<{ scrollLeft: number; scrollTop: number }>(
      {
        scrollLeft: 0,
        scrollTop: 0,
      }
    );

    // 🆕 가상 스크롤바 업데이트 함수
    const updateScrollbar = useCallback(() => {
      const element = gridRef.current;
      if (!element) return;

      const containerWidth = element.clientWidth;
      const contentWidth = element.scrollWidth;
      const scrollLeft = element.scrollLeft;

      // 🆕 스크롤 위치 저장
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

    // 🆕 스크롤바 썸 드래그 시작
    const handleScrollbarMouseDown = useCallback((e: React.MouseEvent) => {
      e.preventDefault();
      setScrollbarState((prev) => ({ ...prev, isDragging: true }));
    }, []);

    // 🆕 스크롤바 썸 드래그 중
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

    // 🆕 스크롤바 썸 드래그 종료
    const handleScrollbarMouseUp = useCallback(() => {
      setScrollbarState((prev) => ({ ...prev, isDragging: false }));
    }, []);

    // 🆕 스크롤바 트랙 클릭
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

    // 🆕 초기 스크롤바 설정
    useEffect(() => {
      const element = gridRef.current;
      if (!element) return;

      // 초기 설정
      const timer = setTimeout(updateScrollbar, 100);

      return () => {
        clearTimeout(timer);
      };
    }, [updateScrollbar]);

    // 🆕 localStorage에서 스크롤 위치 저장/복원
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

    // 🆕 저장된 스크롤 위치를 가져오는 함수 (동기적)
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

    // 🆕 초기 로드 시에만 스크롤 위치 복원 (컴포넌트 마운트 시 한 번만)
    useEffect(() => {
      const element = gridRef.current;
      if (!element) return;

      const savedPosition = getSavedScrollPosition();
      if (savedPosition) {
        // 초기 상태(0,0)일 때만 복원
        if (
          element.scrollLeft === 0 &&
          element.scrollTop === 0 &&
          savedPosition.scrollLeft > 0
        ) {
          element.scrollLeft = savedPosition.scrollLeft;
          element.scrollTop = savedPosition.scrollTop;
        }
      }
    }, [getSavedScrollPosition]); // 의존성 배열에 getSavedScrollPosition만 포함

    // 🆕 사용자 스크롤 시 위치 저장 (debounce 적용)
    useEffect(() => {
      const element = gridRef.current;
      if (!element) return;

      let saveTimer: NodeJS.Timeout;
      const handleScrollWithSave = () => {
        updateScrollbar();

        // 사용자 스크롤 시에만 위치 저장 (debounce 적용)
        clearTimeout(saveTimer);
        saveTimer = setTimeout(saveScrollPosition, 300);
      };

      element.addEventListener("scroll", handleScrollWithSave);

      return () => {
        clearTimeout(saveTimer);
        element.removeEventListener("scroll", handleScrollWithSave);
      };
    }, [updateScrollbar, saveScrollPosition]);

    // 🆕 전역 마우스 이벤트 리스너
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

    // 🆕 30분 단위로 변경: 9:00 ~ 24:00 (30개 열)
    const timeSlots30Min = useMemo(() => {
      const slots: string[] = [];
      for (let hour = 9; hour < 24; hour++) {
        slots.push(`${hour.toString().padStart(2, "0")}:00`);
        slots.push(`${hour.toString().padStart(2, "0")}:30`);
      }
      return slots;
    }, []);

    const timeCols = timeSlots30Min.length; // 30개 열

    // 🚀 간단한 세션 Y축 위치 계산: 논리적 위치(1,2,3...)를 픽셀 위치로 변환
    const getSessionYPositions = useCallback(
      (weekday: number): Map<string, number> => {
        const daySessions = sessions?.get(weekday) || [];
        const sessionYPositions = new Map<string, number>();

        // 각 세션의 논리적 위치를 픽셀 위치로 변환
        daySessions.forEach((session) => {
          const logicalPosition = session.yPosition || 1; // 기본값: 1
          const pixelPosition = (logicalPosition - 1) * SESSION_CELL_HEIGHT;
          sessionYPositions.set(session.id, pixelPosition);
        });

        return sessionYPositions;
      },
      [sessions]
    );

    // 🚀 간단한 요일별 높이 계산: 데이터베이스의 maxYPosition 사용
    const getWeekdayHeight = useCallback(
      (weekday: number): number => {
        const daySessions = sessions?.get(weekday) || [];

        if (daySessions.length === 0) {
          return 49; // 기본 높이
        }

        // 데이터베이스에서 저장된 maxYPosition 찾기
        const maxYPosition = Math.max(
          ...daySessions.map((session) => session.yPosition || 1)
        );

        // 논리적 위치를 픽셀 높이로 변환
        const height = maxYPosition * SESSION_CELL_HEIGHT;

        return Math.max(49, height); // 최소 높이 49px 보장
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

    // 🆕 드래그 시작 핸들러 (터치 디바이스에서는 no-op)
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

    // 🆕 드래그 오버 핸들러 (터치 디바이스에서는 no-op)
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

    // 🆕 드래그 종료 핸들러 (간소화)
    const handleDragEnd = useCallback(() => {
      // TimeTableCell에서 이미 드롭 처리를 했으므로 여기서는 상태만 초기화
      // 중복 호출 방지를 위해 onSessionDrop 호출 제거
      logger.info("🔄 TimeTableGrid 드래그 종료 - 상태 초기화만 수행");

      setDragPreview({
        draggedSession: null,
        targetWeekday: null,
        targetTime: null,
        targetYPosition: null,
      });

      // 🆕 세션 드래그앤드롭 후에만 스크롤 위치 복원
      setTimeout(() => {
        const element = gridRef.current;
        if (element) {
          const savedPosition = getSavedScrollPosition();
          if (savedPosition) {
            // 드래그앤드롭 후에는 저장된 위치로 완전 복원
            element.scrollLeft = savedPosition.scrollLeft;
            element.scrollTop = savedPosition.scrollTop;
          }
        }
      }, 100); // 그리드 리렌더링 완료 후 복원
    }, [getSavedScrollPosition]);

    return (
      <div className="time-table-container" data-surface="surface">
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
          data-testid="time-table-grid"
          style={{
            gridTemplateColumns,
            gridTemplateRows,
            ...style,
          }}
        >
          {/* 좌상단 빈칸 */}
          <div className="bg-[var(--color-bg-primary)]" />

          {/* 🆕 시간 헤더 (X축 상단) - 30분 단위 */}
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
                selectedStudentId={selectedStudentId}
                isAnyDragging={isAnyDragging || isStudentDragging} // 🆕 전역 드래그 상태 전달 (세션 드래그 + 학생 드래그)
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

        {/* 🆕 가상 가로 스크롤바 */}
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
