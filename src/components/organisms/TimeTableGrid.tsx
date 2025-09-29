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
import type { Session, Subject } from "../../lib/planner";
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
}

const TimeTableGrid = forwardRef<HTMLDivElement, TimeTableGridProps>(
  (
    {
      sessions,
      subjects,
      enrollments,
      students,
      onSessionClick,
      onDrop,
      onSessionDrop, // 🆕 세션 드롭 핸들러
      onEmptySpaceClick,
      className = "",
      style = {},
      selectedStudentId, // 🆕 선택된 학생 ID 추가
      isAnyDragging = false, // 🆕 전역 드래그 상태 추가
      isStudentDragging = false, // 🆕 학생 드래그 상태 추가
    },
    ref
  ) => {
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
        // console.warn('스크롤 위치 저장 실패:', error);
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

    // 🆕 추가 보장을 위한 스크롤 위치 복원 (ref에서 처리되지 않은 경우를 대비)
    useEffect(() => {
      const element = gridRef.current;
      if (!element) return;

      // ref에서 즉시 설정이 실패한 경우를 대비한 백업 복원
      const timer = setTimeout(() => {
        const savedPosition = getSavedScrollPosition();
        if (
          savedPosition &&
          element.scrollLeft === 0 &&
          element.scrollTop === 0
        ) {
          element.scrollLeft = savedPosition.scrollLeft;
          element.scrollTop = savedPosition.scrollTop;
        }
      }, 100);

      return () => clearTimeout(timer);
    }, [getSavedScrollPosition]);

    // 🆕 스크롤 위치 저장 (debounce 적용)
    useEffect(() => {
      const element = gridRef.current;
      if (!element) return;

      let saveTimer: NodeJS.Timeout;
      const handleScrollWithSave = () => {
        updateScrollbar();

        // 스크롤 위치 저장을 debounce
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

    // 🆕 그리드 템플릿 열을 30분 단위로 변경: 80px + 30개 × 100px (학생 이름 표시를 위해)
    const gridTemplateColumns = useMemo(
      () => `80px repeat(${timeCols}, 100px)`,
      [timeCols]
    );

    // 🆕 드래그 시작 핸들러 (간소화)
    const handleDragStart = useCallback((session: Session) => {
      setDragPreview({
        draggedSession: session,
        targetWeekday: null,
        targetTime: null,
        targetYPosition: null,
      });
    }, []);

    // 🆕 드래그 오버 핸들러 (간소화)
    const handleDragOver = useCallback(
      (weekday: number, time: string, yPosition: number) => {
        if (!dragPreview.draggedSession) return;

        setDragPreview((prev) => ({
          ...prev,
          targetWeekday: weekday,
          targetTime: time,
          targetYPosition: yPosition,
        }));
      },
      [dragPreview.draggedSession]
    );

    // 🆕 드래그 종료 핸들러 (간소화)
    const handleDragEnd = useCallback(() => {
      // DropZone에서 이미 드롭 처리를 했으므로 여기서는 상태만 초기화
      // 중복 호출 방지를 위해 onSessionDrop 호출 제거
      logger.info("🔄 TimeTableGrid 드래그 종료 - 상태 초기화만 수행");

      setDragPreview({
        draggedSession: null,
        targetWeekday: null,
        targetTime: null,
        targetYPosition: null,
      });

      // 🆕 드래그 종료 후 스크롤 위치 복원
      setTimeout(() => {
        restoreScrollPosition();
      }, 100); // 그리드 리렌더링 완료 후 복원
    }, [restoreScrollPosition]);

    return (
      <div className="time-table-container">
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

            // 🆕 DOM이 마운트되자마자 저장된 스크롤 위치 즉시 설정 (깜빡임 방지)
            if (node) {
              const savedPosition = getSavedScrollPosition();
              if (savedPosition) {
                // requestAnimationFrame을 사용하여 DOM 렌더링 완료 후 실행
                requestAnimationFrame(() => {
                  node.scrollLeft = savedPosition.scrollLeft;
                  node.scrollTop = savedPosition.scrollTop;
                });
              }
            }
          }}
          className={`time-table-grid ${className}`}
          data-testid="time-table-grid"
          style={{
            display: "grid",
            gridTemplateColumns,
            gridTemplateRows,
            backgroundColor: "var(--color-bg-primary)",
            border: "1px solid var(--color-border-grid)",
            borderRadius: "8px 8px 0 0", // 위쪽만 둥글게
            // 그리드 내부에서만 스크롤되도록 설정
            overflowY: "auto", // 세로 스크롤은 필요할 때만 표시
            overflowX: "hidden", // 가상 스크롤바를 위해 숨김
            position: "relative",
            isolation: "isolate",
            maxHeight: "80vh", // 최대 높이 제한으로 스크롤 활성화
            ...style,
          }}
        >
          {/* 좌상단 빈칸 */}
          <div style={{ backgroundColor: "var(--color-background)" }} />

          {/* 🆕 시간 헤더 (X축 상단) - 30분 단위 */}
          {timeSlots30Min.map((timeString, index) => {
            const isLastTime = index === timeSlots30Min.length - 1;
            return (
              <div
                key={timeString}
                className="shadow-sm"
                style={{
                  // 완전 불투명 배경으로 세션 셀과의 겹침 제거
                  backgroundColor: "var(--color-bg-primary)", // 테마별 배경색 사용
                  padding: "4px", // 🆕 패딩을 줄여서 30분 단위에 맞춤
                  textAlign: "center",
                  fontSize: "11px", // 🆕 폰트 크기를 줄여서 30분 단위에 맞춤
                  color: "var(--color-text-secondary)",
                  border: "1px solid var(--color-border)",
                  borderRight: isLastTime
                    ? "1px solid var(--color-border)"
                    : "1px solid var(--color-border-grid)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "40px",
                  position: "sticky",
                  top: 0,
                  zIndex: 999, // 세션보다 높게
                }}
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
                onSessionClick={onSessionClick}
                onDrop={onDrop}
                onSessionDrop={onSessionDrop} // 🆕 세션 드롭 핸들러 전달
                onEmptySpaceClick={onEmptySpaceClick}
                selectedStudentId={selectedStudentId}
                isAnyDragging={isAnyDragging || isStudentDragging} // 🆕 전역 드래그 상태 전달 (세션 드래그 + 학생 드래그)
                // 🆕 드래그 핸들러들 전달
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                dragPreview={dragPreview}
              />
            );
          })}
        </div>

        {/* 🆕 가상 가로 스크롤바 */}
        <div
          className="virtual-scrollbar-container"
          style={{
            position: "sticky",
            bottom: 0,
            left: 0,
            right: 0,
            height: "12px",
            backgroundColor: "#f0f0f0",
            borderTop: "1px solid #ddd",
            borderRadius: "0 0 8px 8px",
            zIndex: 1000,
            cursor: "pointer",
          }}
          onClick={handleScrollbarTrackClick}
        >
          <div
            ref={scrollbarThumbRef}
            className="virtual-scrollbar-thumb"
            style={{
              position: "absolute",
              bottom: "1px",
              left: `${scrollbarState.thumbPosition}px`,
              height: "10px",
              width: `${scrollbarState.thumbWidth}px`,
              backgroundColor: "#666",
              borderRadius: "5px",
              cursor: "pointer",
              zIndex: 1001,
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
