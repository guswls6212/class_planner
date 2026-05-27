/**
 * TimeTableGrid: 시간표 weekly view 의 grid 컨테이너 — 7 요일 × time-axis 의 layout +
 * lane width 계산 + dnd-kit 컨텍스트 + DragOverlay + tentative drop preview 만 담당.
 *
 * 의존성:
 *   - dnd-kit (DndContext + DragOverlay) — drag/drop coordination
 *   - sessionCollisionUtils (computeRequiredLanes, computeTentativeLayout) — lane 계산 + preview
 *   - sessionClusters (computeRowClusters) — row 별 session 묶기
 *   - molecules/TimeTableRow — 요일 별 row 렌더
 *   - molecules/SessionBlock (PresentationMode type)
 *   - hooks/useDragController, useNowMinute, useMediaQuery
 *   - shared/constants/sessionConstants (LANE_WIDTH / SLOT_HEIGHT 토큰)
 *   - non-goal: session add/update API, modal 렌더 (schedule/page 책임), single session 렌더 (TimeTableRow → SessionBlock 책임)
 *
 * 결정 history:
 *   - dnd-kit Variant E (insertBefore) preview — tentative drop 표시 위치 (PR #387/388).
 *   - lane width 모바일/데스크탑 분기 (useMediaQuery + constants).
 *   - row clustering — sessionClusters로 row 별 session 그룹화.
 *   - ADR-002 (2026-05-28): Cohesion Sweep Phase 2 — UI organism, 분리는 needs-review.
 *
 * Sniff test (자기 답변, 2026-05-28):
 *   1. 다른 파일 같이 수정? — yes (schedule/page drag handler + TimeTableRow + SessionBlock 연동).
 *   2. 시그니처 영향? — props 명확 (sessions/subjects/teachers/drag context). caller = schedule/page.
 *   3. UI/state/API 섞임? — UI + drag state. API X.
 *   4. 도메인 둘 이상? — 한 도메인 (timetable grid 의 layout + drag coordination).
 *   5. pure + 부수효과? — 부수효과 위주 (dnd 이벤트 + ref + state).
 *
 * 분리 후보 (후속 cycle, needs-review):
 *   - DragOverlay 분리 sub-component (drag preview 전용).
 *   - lane width 계산 hook 분리 (useLaneWidth).
 *   - 진행 전: e2e 회귀 가드 (drag UX) 의무.
 */

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
import type { Session, Subject, Teacher } from "../../lib/planner";
import type { ColorByMode } from "../../hooks/useColorBy";
import { computeRequiredLanes, computeTentativeLayout } from "../../lib/sessionCollisionUtils";
import { computeRowClusters } from "../../lib/sessionClusters";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { useDragController } from "../../hooks/useDragController";
import { useNowMinute } from "../../hooks/useNowMinute";
import TimeTableRow from "../molecules/TimeTableRow";
import type { PresentationMode } from "../molecules/SessionBlock";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  pointerWithin,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";

// 포인터가 실제로 들어있는 droppable을 우선 선택, 없으면 가장 가까운 중심으로 fallback.
// 시간 슬롯이 30px로 좁고 lane 경계 부근에서 closestCenter가 부정확한 문제 해소.
const gridCollisionDetection: CollisionDetection = (args) => {
  const within = pointerWithin(args);
  return within.length > 0 ? within : closestCenter(args);
};
import DragOverlayCard from "../molecules/DragOverlayCard";

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
  /**
   * Ctrl/Meta + drag로 복사 시 호출. 호출자가 새 ID로 session 생성.
   * 미전달 시 isCopyMode 무시하고 기존 onSessionDrop(이동) 동작.
   */
  onSessionCopy?: (
    sessionId: string,
    weekday: number,
    time: string,
    yPosition: number
  ) => void;
  /**
   * 사용자가 LaneInsertSlot (lane 사이 droppable) 에 drop 했을 때 호출. 명시적 lane
   * 삽입 — 같은 시간 lane ≥ insertBeforeYPos 모두 +1 shift + movingSession 그 자리
   * 차지. 미전달 시 insertBefore drop 은 일반 yPos drop 으로 fallback (즉 lane
   * insertBeforeYPos 에 drop 한 것처럼 처리). Variant E (Edge Hover Slot).
   */
  onSessionInsertBefore?: (
    sessionId: string,
    weekday: number,
    time: string,
    insertBeforeYPos: number,
  ) => void;
  onEmptySpaceClick: (weekday: number, time: string) => void;
  className?: string;
  style?: React.CSSProperties;
  ref?: React.Ref<HTMLDivElement>;
  selectedStudentIds?: string[];
  /** 과목 필터 — 학생 필터와 AND 결합 (lane 정렬). */
  selectedSubjectIds?: string[];
  /** 강사 필터 — 학생/과목과 AND 결합 (lane 정렬 + dim 통일). */
  selectedTeacherIds?: string[];
  isAnyDragging?: boolean;
  isStudentDragging?: boolean;
  teachers?: Teacher[];
  colorBy?: ColorByMode;
  isReadOnly?: boolean;
  // 주간 헤더 날짜 표시용. 없으면 오늘 기준으로 fallback.
  baseDate?: Date;
  /** 다중 선택된 세션 id Set. 비어있거나 undefined이면 일반 모드. */
  selectedSessionIds?: Set<string>;
  /** modifier(Shift/Ctrl/Meta) + click 시 호출 */
  onSessionSelectToggle?: (sessionId: string) => void;
  /** 모바일 long-press 메뉴 — "복사" */
  onSessionContextMenuCopy?: (sessionId: string) => void;
  /** 모바일 long-press 메뉴 — "선택 시작" */
  onSessionContextMenuStartSelect?: (sessionId: string) => void;
  /** 표시 시작 시각 (0-23). default 9. */
  startHour?: number;
  /** 표시 종료 시각 (0-23, inclusive — endHour:30 슬롯까지 표시). default 23. */
  endHour?: number;
  /** 외부 scroll container가 있을 때 (P3 floating layout 등) grid 자체
   *  max-h-[80vh]/overflow 제거 → outer가 scroll 받음. default false. */
  fillHeight?: boolean;
  /** SessionBlock 표시 모드 — share view 분기. Default "edit". */
  presentationMode?: PresentationMode;
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
      onSessionCopy,
      onSessionInsertBefore,
      onEmptySpaceClick,
      className = "",
      style = {},
      selectedStudentIds,
      selectedSubjectIds,
      selectedTeacherIds,
      isAnyDragging = false,
      isStudentDragging = false,
      teachers = [],
      colorBy = "subject",
      isReadOnly = false,
      baseDate,
      selectedSessionIds,
      onSessionSelectToggle,
      onSessionContextMenuCopy,
      onSessionContextMenuStartSelect,
      startHour = 9,
      endHour = 23,
      fillHeight = false,
      presentationMode = "edit",
    },
    ref
  ) => {
    // 반응형: 모바일 뷰포트 감지 (SSR-safe)
    const isMobile = useMediaQuery("(max-width: 767px)");

    const dragController = useDragController();

    // dnd-kit sensors: PointerSensor (desktop + mobile), TouchSensor (long-press fallback)
    const sensors = useSensors(
      useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
      useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    );

    // session lookup by id (for onDragStart)
    const sessionById = useMemo(() => {
      const map = new Map<string, Session>();
      sessions?.forEach((daySessions) => daySessions.forEach((s) => map.set(s.id, s)));
      return map;
    }, [sessions]);

    // row-level overflow 펼침 상태 — key = `${weekday}|${clusterKey}` (clusterKey = cluster.startMin).
    // 한 weekday 안 여러 time-row (cluster) 별로 independent expand 가능. 사용자 보고 (2026-05-15
    // Image 9): 같은 weekday 안 3 개 시간대 (10:00, 12:00, 15:00) 각각 5 개 sessions →
    // 각 row 별 '+N'/'-' 버튼 따로 표시 + row 별 expand.
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    const toggleRowExpand = useCallback(
      (weekday: number, clusterKey: string) => {
        setExpandedRows((prev) => {
          const next = new Set(prev);
          const k = `${weekday}|${clusterKey}`;
          if (next.has(k)) next.delete(k);
          else next.add(k);
          return next;
        });
      },
      [],
    );

    // 한 weekday 의 모든 cluster 일괄 토글 (사용자 요구 2026-05-16): 한 row chip 클릭 시
    // 모든 cluster expand/collapse. 모두 expanded → 모두 collapse, 그 외 → 모두 expand.
    // column 폭은 이미 max cluster lane 수로 늘어나 있으므로 다른 row 도 같이 expand 시
    // sessions 모두 visible (사용자가 별도 chip 클릭 안 해도 됨).
    const toggleAllRowsInWeekday = useCallback(
      (weekday: number) => {
        const daySessions = sessions?.get(weekday) || [];
        const clustersInDay = computeRowClusters(daySessions);
        if (clustersInDay.length === 0) return;
        setExpandedRows((prev) => {
          const keys = clustersInDay.map((c) => `${weekday}|${c.key}`);
          const allExpanded = keys.every((k) => prev.has(k));
          const next = new Set(prev);
          if (allExpanded) {
            for (const k of keys) next.delete(k);
          } else {
            for (const k of keys) next.add(k);
          }
          return next;
        });
      },
      [sessions],
    );

    // 주(week) 데이터가 바뀌면 펼침 상태 초기화
    useEffect(() => {
      setExpandedRows(new Set());
    }, [sessions]);

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

    // mount 1회 read한 결과를 ref에 캐시 — 같은 mount 동안 재 read 방지.
    // (saveScrollPosition은 매 scroll write이지만, get은 restore 1회만 호출)
    const savedScrollRef = useRef<{ scrollLeft: number; scrollTop: number } | null | undefined>(undefined);
    const getSavedScrollPosition = useCallback(() => {
      if (savedScrollRef.current !== undefined) return savedScrollRef.current;
      try {
        const savedData = localStorage.getItem("schedule_scroll_position");
        if (savedData) {
          const { scrollLeft, scrollTop, timestamp } = JSON.parse(savedData);

          // 5분 이내의 데이터만 사용
          if (Date.now() - timestamp < 5 * 60 * 1000) {
            savedScrollRef.current = { scrollLeft, scrollTop };
            return savedScrollRef.current;
          }
        }
      } catch (error) {
        // localStorage 에러는 무시
      }
      savedScrollRef.current = null;
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
      for (let hour = startHour; hour <= endHour; hour++) {
        slots.push(`${hour.toString().padStart(2, "0")}:00`);
        slots.push(`${hour.toString().padStart(2, "0")}:30`);
      }
      return slots;
    }, [startHour, endHour]);

    const slotCount = timeSlots30Min.length;


    // 드래그 중 목표 위치를 기반으로 레이아웃을 미리 계산해 TimeTableRow에 전달.
    // 드래그가 없으면 원본 sessions Map을 그대로 반환 (참조 동일).
    // 드래그 세션을 포함한 결과를 반환 — TimeTableRow에서 SessionBlock 렌더 시 skip하고
    // 대신 DragGhost를 렌더한다. 이렇게 해야 weekdayMaxLanes 계산에 ghost lane이 반영된다.
    // Bug5 fix: dragController 객체(매 렌더마다 새 참조)가 아닌 primitive 값으로 deps 지정.
    const { draggedSession, targetWeekday, targetTime, targetYPosition, targetMode, targetHalf } = dragController;
    const sessionsForRender = useMemo(
      () =>
        computeTentativeLayout(
          sessions,
          enrollments,
          subjects,
          draggedSession,
          targetWeekday,
          targetTime,
          targetYPosition,
          { targetMode: targetMode ?? "lane" },
        ),
      [sessions, enrollments, subjects, draggedSession, targetWeekday, targetTime, targetYPosition, targetMode],
    );

    // dragPreview SSOT — 매 render 새 객체로 전달하면 TimeTableRow(7개) 의
    // dragPreview-의존 useEffect/useMemo 가 매번 재실행되므로 primitive deps 로 stable 화.
    // targetMode + targetHalf 까지 같이 전달해서 drag-ghost / lane-highlight / amber overlay
    // 3 종 시각 피드백이 같은 SSOT 를 본다 (dnd-visual-feedback.md 참조).
    const dragPreviewProp = useMemo(
      () => ({
        draggedSession,
        targetWeekday,
        targetTime,
        targetYPosition,
        targetMode,
        targetHalf,
      }),
      [draggedSession, targetWeekday, targetTime, targetYPosition, targetMode, targetHalf],
    );

    const laneWidth = isMobile ? LANE_WIDTH_PX_MOBILE : LANE_WIDTH_PX_DESKTOP;

    // 각 weekday column 너비 = max lanes × laneWidth.
    // 드래그 중에는 sessionsForRender(tentative layout, 드래그 세션 포함)를 기준으로 계산.
    // target 요일에만 DRAG_HOVER_PAD * 2(양쪽 20px) 추가 — 세션 너비는 그대로이고
    // 양 옆에 여백만 생겨서 다음 요일로 넘어가지 않고 원하는 위치에 쉽게 드롭할 수 있다.
    const DRAG_HOVER_PAD = 10;
    const weekdayWidths = useMemo(
      () => {
        const isDraggingAny = (dragController.isAnyDragging()) || isStudentDragging;
        const targetWd = targetWeekday;
        const baseMap = isDraggingAny ? sessionsForRender : sessions;
        return Array.from({ length: 7 }, (_, wd) => {
          const daySessions = baseMap?.get(wd) || [];
          const required = computeRequiredLanes(daySessions);
          // 4+ 겹침 시 column 폭 결정:
          //   - 드래그 중: required 사용 (cluster expand 무시, 모든 cluster collapsed treat
          //     해도 drag 중에는 chip 미표시 → 실제 cluster 별 폭 의미 없음). frozen 가드는
          //     별도 (cell mount/unmount flicker).
          //   - 비-drag: cluster 별 effectiveLanes 의 max — 한 cluster 만 expand 해도 column
          //     폭이 그 cluster lane 수로 늘어남. 다른 collapsed cluster 는 빈 공간 자연 발생.
          //   - cluster.requiredLanes < 4: 항상 그대로 (overflow 아님).
          //   - expandedRows.has(`${wd}|${c.key}`): 그 cluster expand → c.requiredLanes.
          //   - 그 외: 3 lanes (collapsed).
          let lanes: number;
          if (isDraggingAny) {
            lanes = required;
          } else {
            const clusters = computeRowClusters(daySessions);
            const laneNeeds = clusters.map((c) =>
              c.requiredLanes < 4 || expandedRows.has(`${wd}|${c.key}`)
                ? c.requiredLanes
                : 3,
            );
            lanes = Math.max(1, ...laneNeeds, 1);
          }
          const baseW = Math.max(1, lanes) * laneWidth;
          // target 요일에 좌우 여백 추가 (hover 중일 때만)
          return isDraggingAny && wd === targetWd && targetWd !== null
            ? baseW + DRAG_HOVER_PAD * 2
            : baseW;
        });
      },
      // Bug5 fix: primitive values 사용. dragController.isAnyDragging()은 함수 호출이므로
      // draggedSession null 여부로 대체 (drag 중이면 draggedSession !== null).
      [sessions, sessionsForRender, draggedSession, targetWeekday, isStudentDragging, laneWidth, expandedRows]
    );

    const timeLabelColWidth = isMobile ? 40 : 56;

    const now = useNowMinute();

    // 주 날짜 배열 및 오늘 계산
    const weekDates = useMemo(() => {
      const base = baseDate ?? now;
      const monday = new Date(base);
      const dayOfWeek = (monday.getDay() + 6) % 7; // 0=Mon
      monday.setDate(monday.getDate() - dayOfWeek);
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        return d;
      });
    }, [baseDate, now]);

    const todayStr = now.toDateString();

    // 현재 시각 → 픽셀 위치 (startHour 기준, SLOT_HEIGHT_PX per 30min).
    // 마지막 slot 시작 분(= (slotCount-1) * 30) 이후의 시각은 표시 X.
    const nowLinePx = useMemo(() => {
      const minutesSinceStart =
        (now.getHours() - startHour) * 60 + now.getMinutes();
      const lastSlotStartMinutes = (slotCount - 1) * 30;
      if (minutesSinceStart < 0 || minutesSinceStart > lastSlotStartMinutes)
        return null;
      return (minutesSinceStart / 30) * SLOT_HEIGHT_PX;
    }, [now, startHour, slotCount]);

    const nowTimeStr = useMemo(() => {
      const h = now.getHours().toString().padStart(2, "0");
      const m = now.getMinutes().toString().padStart(2, "0");
      return `${h}:${m}`;
    }, [now]);

    const headerRowHeight = 60;
    const contentHeight = slotCount * SLOT_HEIGHT_PX;

    const gridTemplateColumns = useMemo(
      () =>
        `${timeLabelColWidth}px ${weekdayWidths.map((w) => `${w}px`).join(" ")}`,
      [timeLabelColWidth, weekdayWidths]
    );

    const gridTemplateRows = `${headerRowHeight}px ${contentHeight}px`;

    // document-level dragend 리셋은 useDragController 내부 useEffect가 처리.

    // ⚠️ Bug fix (2026-05-04 #2): drag 도중 window blur나 keyup 이벤트가 발생하면
    // useDragController의 isCopyMode가 false로 바뀜. 사용자는 Cmd를 계속 누르고
    // 있는데도 drop 시점엔 false → onSessionDrop(이동)으로 routing 됐음.
    // 사용자 보고 사고: macOS에서 Cmd+drag가 native drag 시작 시 짧은 blur 발생 →
    // onBlur 핸들러가 isCopyMode reset → drop 시 move.
    //
    // 해결: drag start 시점의 modifier 상태를 ref에 latch. 시각 상태(isCopyMode)는
    // 라이브 갱신(DragOverlayCard "복사" 라벨 즉시 반응)을 위해 유지하되, 라우팅
    // 결정은 ref로 한다 — drag 도중 blur가 발생해도 시작 시점 의도가 보존됨.
    const dragStartCopyModeRef = useRef(false);
    // drag 시작 시점 copy mode 의 reactive 버전 — LaneInsertSlot mount 조건 (Variant
    // E) 에 사용. 시각용 (DragOverlayCard 의 copy 표식 등) 은 그대로 dragController.
    // isCopyMode (window keydown 따라 즉시 갱신) 를 쓰지만, "복사 모드일 땐 lane
    // insert 비활성" 의 routing 의도는 시작 시점 latch 가 일관성 (T10b 회귀 가드).
    const [dragStartedAsCopy, setDragStartedAsCopy] = useState(false);

    // drag 시작 시점의 weekday 별 lane 수 latch — drag 중 cell mount/unmount flicker
    // 방지. effectiveLanes = max(frozen, required) 로 줄어듦 차단, 늘어남만 허용.
    // dnd-visual-feedback.md § 5 (1-frame flicker 완화) 참조.
    const [frozenLaneCountsPerWeekday, setFrozenLaneCountsPerWeekday] = useState<number[] | null>(null);

    const handleDndDragStart = useCallback(
      ({ active, activatorEvent }: DragStartEvent) => {
        const session = sessionById.get(active.id as string);
        if (session) dragController.startSessionDrag(session);
        // dnd-kit의 activatorEvent에서 modifier 직접 캡처 (window listener 의존성 ↓).
        const ev = activatorEvent as PointerEvent | KeyboardEvent | MouseEvent;
        const isCopyAtStart =
          (ev as PointerEvent).ctrlKey === true ||
          (ev as PointerEvent).metaKey === true;
        dragStartCopyModeRef.current = isCopyAtStart; // ← 라우팅용 latch
        setDragStartedAsCopy(isCopyAtStart); // ← LaneInsertSlot 등 reactive 자식용
        dragController.setCopyModeOverride(isCopyAtStart); // ← 시각 동기화
        // weekday 별 현재 lane 수 latch — drag 중 cell 수 줄어듦 차단 (flicker 방지)
        const startLanes = Array.from({ length: 7 }, (_, wd) =>
          computeRequiredLanes(sessions?.get(wd) || []),
        );
        setFrozenLaneCountsPerWeekday(startLanes);
      },
      [sessionById, dragController, sessions],
    );

    const handleDndDragOver = useCallback(
      ({ over }: DragOverEvent) => {
        if (!over) { dragController.leaveTarget(); return; }
        // over.id formats:
        //   "weekday|time|yPosition"           (TimeTableCell — lane occupy / non-insertMode)
        //   "weekday|time|yPos|leftHalf"       (cell split — insertBefore:yPos)
        //   "weekday|time|yPos|rightHalf"      (cell split — insertBefore:yPos+1)
        const parts = (over.id as string).split("|");
        if (parts.length < 3) return;
        const [wd, time, yPosStr, half] = parts;
        const yPos = Number(yPosStr);
        const wdNum = Number(wd);
        // NaN 가드 — 비정상 over.id (빈 segment 등) 대응. dragController state 오염 방지.
        if (!Number.isFinite(yPos) || !Number.isFinite(wdNum)) {
          dragController.leaveTarget();
          return;
        }
        if (half === "leftHalf") {
          dragController.hoverTarget(wdNum, time, yPos, "insertBefore", "left");
        } else if (half === "rightHalf") {
          dragController.hoverTarget(wdNum, time, yPos + 1, "insertBefore", "right");
        } else {
          dragController.hoverTarget(wdNum, time, yPos, "lane");
        }
      },
      [dragController],
    );

    const handleDndDragEnd = useCallback(
      ({ active, over }: DragEndEvent) => {
        // 라우팅용 isCopy: drag start 시점 latch 사용 (window blur/keyup 영향 방지).
        // 시각용 dragController.isCopyMode와 분리 — drop 결정은 시작 의도를 따른다.
        const isCopy = dragStartCopyModeRef.current;
        if (over) {
          const sessionId = active.id as string;
          const parts = (over.id as string).split("|");
          if (parts.length >= 3) {
            const [wd, time, yPosStr, half] = parts;
            const baseYPos = Number(yPosStr);
            const isInsertBefore = half === "leftHalf" || half === "rightHalf";
            const yPos = half === "rightHalf" ? baseYPos + 1 : baseYPos;
            // Ctrl/Meta + drag → 복사 (onSessionCopy가 있을 때만, 없으면 이동 fallback)
            if (isCopy && onSessionCopy) {
              // 복사 시엔 insertBefore 도 일반 lane copy 로 fallback (복사 + 명시적 shift
              // 조합은 향후 별도 디자인). 사용자 의도 = "그 자리에 lane 1개로 복사".
              onSessionCopy(sessionId, Number(wd), time, yPos);
            } else if (isInsertBefore && onSessionInsertBefore) {
              onSessionInsertBefore(sessionId, Number(wd), time, yPos);
            } else if (onSessionDrop) {
              onSessionDrop(sessionId, Number(wd), time, yPos);
            }
          }
          dragController.completeDrop();
        } else {
          dragController.cancelDrag();
        }
        dragStartCopyModeRef.current = false; // 다음 drag를 위해 reset
        setDragStartedAsCopy(false);
        setFrozenLaneCountsPerWeekday(null); // drag 종료 시 freeze 해제
        // 드래그 후 스크롤 위치 복원
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
      },
      [dragController, onSessionDrop, onSessionCopy, onSessionInsertBefore, getSavedScrollPosition],
    );

    return (
      <DndContext
        sensors={sensors}
        collisionDetection={gridCollisionDetection}
        onDragStart={handleDndDragStart}
        onDragOver={handleDndDragOver}
        onDragEnd={handleDndDragEnd}
      >
      <div
        className="time-table-container"
        data-testid="time-table-grid"
        data-tour="schedule-grid"
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
          className={`time-table-grid grid bg-[var(--color-bg-primary)] border border-[var(--color-border-grid-light)] rounded-t-lg relative isolate ${
            fillHeight
              ? "overflow-x-auto schedule-p3-scroll"
              : "overflow-y-auto overflow-x-auto max-h-[80vh]"
          } ${className}`}
          style={{
            gridTemplateColumns,
            gridTemplateRows,
            transition: "grid-template-columns 0.15s ease",
            ...style,
          }}
        >
          {/* (1,1) 좌상단 빈 코너 — sticky top+left */}
          <div
            className="sticky top-0 left-0 z-[1000] bg-[var(--color-bg-primary)] border-b border-r border-[var(--color-border)]"
            style={{ gridColumn: 1, gridRow: 1 }}
          />

          {/* (1, 2..8) 요일 헤더 — sticky top, Stacked Circle */}
          {WEEKDAY_LABELS.map((label, weekday) => {
            const date = weekDates[weekday];
            const dateNum = date.getDate();
            const isToday = date.toDateString() === todayStr;
            return (
              <div
                key={`header-${weekday}`}
                className="shadow-sm sticky top-0 z-[999] flex flex-col items-center justify-center gap-[2px] bg-[var(--color-bg-primary)] border border-[var(--color-border)]"
                style={{ gridColumn: weekday + 2, gridRow: 1 }}
              >
                <span
                  className={`text-[10px] font-semibold uppercase tracking-wide leading-none ${
                    isToday ? "text-[var(--color-accent-hover)]" : "text-[var(--color-text-muted)]"
                  }`}
                >
                  {label}
                </span>
                <span
                  className={`text-[22px] font-bold leading-none flex items-center justify-center w-9 h-9 rounded-full ${
                    isToday
                      ? "bg-[var(--color-accent-hover)] text-[var(--color-bg-primary)]"
                      : "text-[var(--color-text-primary)]"
                  }`}
                >
                  {dateNum}
                </span>
              </div>
            );
          })}

          {/* (2, 1) 시간 라벨 컬럼 — sticky left */}
          <div
            className="sticky left-0 z-[998] flex flex-col bg-[var(--color-bg-primary)] border-r border-[var(--color-border)]"
            style={{ gridColumn: 1, gridRow: 2, height: contentHeight }}
          >
            {timeSlots30Min.map((timeString) => {
              const isHour = timeString.endsWith(":00");
              return (
                <div
                  key={`time-${timeString}`}
                  className={[
                    "flex items-start justify-end pr-1 pt-0.5",
                    "border-b border-[var(--color-border-grid-light)]",
                    isMobile ? "text-[9px]" : "text-[10px]",
                    isHour
                      ? "font-semibold text-[var(--color-text-secondary)]"
                      : "font-normal text-[var(--color-text-secondary)] opacity-60",
                  ].join(" ")}
                  style={{ height: SLOT_HEIGHT_PX }}
                >
                  {timeString}
                </div>
              );
            })}
          </div>

          {/* (2, 2..8) 요일별 컬럼 */}
          {Array.from({ length: 7 }, (_, weekday) => {
            const isToday = weekDates[weekday].toDateString() === todayStr;
            return (
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
                selectedSubjectIds={selectedSubjectIds}
                selectedTeacherIds={selectedTeacherIds}
                isAnyDragging={dragController.isAnyDragging() || isStudentDragging}
                isCopyMode={dragController.isCopyMode && Boolean(onSessionCopy)}
                dragStartedAsCopy={dragStartedAsCopy && Boolean(onSessionCopy)}
                teachers={teachers}
                colorBy={colorBy}
                isMobile={isMobile}
                dragPreview={dragPreviewProp}
                frozenLanes={frozenLaneCountsPerWeekday?.[weekday] ?? null}
                expandedRowKeys={expandedRows}
                onToggleRowExpand={(clusterKey) => toggleRowExpand(weekday, clusterKey)}
                onToggleAllRowsInWeekday={() => toggleAllRowsInWeekday(weekday)}
                isToday={isToday}
                nowLinePx={isToday ? nowLinePx : null}
                nowTimeStr={isToday ? nowTimeStr : undefined}
                startHour={startHour}
                endHour={endHour}
                presentationMode={presentationMode}
                selectedSessionIds={selectedSessionIds}
                onSessionSelectToggle={
                  isReadOnly ? undefined : onSessionSelectToggle
                }
                onSessionContextMenuCopy={
                  isReadOnly ? undefined : onSessionContextMenuCopy
                }
                onSessionContextMenuStartSelect={
                  isReadOnly ? undefined : onSessionContextMenuStartSelect
                }
                style={{
                  gridColumn: weekday + 2,
                  gridRow: 2,
                  ...(isToday && { background: "linear-gradient(180deg, rgba(251,191,36,0.04) 0%, rgba(251,191,36,0.02) 100%)" }),
                }}
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
        <DragOverlay>
          {dragController.draggedSession ? (
            <DragOverlayCard
              session={dragController.draggedSession}
              subjects={subjects}
              isCopy={dragController.isCopyMode && Boolean(onSessionCopy)}
              selectionCount={
                selectedSessionIds && selectedSessionIds.size > 1
                  ? selectedSessionIds.size
                  : 1
              }
            />
          ) : null}
        </DragOverlay>
      </div>
      </DndContext>
    );
  }
);

export { TimeTableGrid };
export default TimeTableGrid;
