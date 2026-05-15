import React from "react";
import type { Session, Subject, Teacher } from "../../lib/planner";
import { logger } from "../../lib/logger";
import type { ColorByMode } from "../../hooks/useColorBy";
import { resolveSessionTone } from "./SessionCard.utils";

import { SLOT_HEIGHT_PX } from "@/shared/constants/sessionConstants";
import { computeRequiredLanes } from "../../lib/sessionCollisionUtils";
import { sessionMatchesFilters } from "./SessionBlock.utils";
import TimeTableCell from "./TimeTableCell";
import SessionBlock from "./SessionBlock";
import HiddenSessionsPopover from "./HiddenSessionsPopover";

// D-hybrid: columns with ≥4 yPositions show only the first 3 + "+N" inline chip
const OVERFLOW_THRESHOLD = 4;

/**
 * 커서 상대좌표(relX, relY)를 drop 대상 {time, yPosition}으로 변환한다.
 * 브라우저 hit-test(z-index/pointer-events)를 우회하여 픽셀 단위 정밀도 확보.
 * dragover 이벤트는 pointer-events:auto인 드래그 소스에서 버블링되므로
 * 이 함수를 컨테이너 레벨에서 호출하면 셀이 가려져도 항상 올바른 위치를 계산한다.
 */
export function coordsToDropTarget(
  relX: number,
  relY: number,
  laneWidth: number,
  effectiveLanes: number,
  slotHeightPx: number,
  timeSlots: string[],
  dragHoverPad: number,
  isDraggingToThis: boolean,
): { time: string; yPosition: number } | null {
  if (timeSlots.length === 0) return null;
  const adjustedX = Math.max(0, relX - (isDraggingToThis ? dragHoverPad : 0));
  const laneIdx = Math.min(Math.max(0, Math.floor(adjustedX / laneWidth)), effectiveLanes - 1);
  const timeIdx = Math.min(Math.max(0, Math.floor(relY / slotHeightPx)), timeSlots.length - 1);
  return { time: timeSlots[timeIdx], yPosition: laneIdx + 1 };
}

// Drag preview state (same shape as TimeTableGrid)
//
// SSOT (drag-ghost / lane-highlight / amber overlay 3 종 시각 피드백 통일):
//   - drag-ghost     : laidOutSessions.find(ds.id) 좌표 (post-shift, compactYPositions 후)
//   - lane-highlight : 위 ghost 좌표 derive (fallback: targetYPosition raw)
//   - amber overlay  : 위 ghost 좌표 derive + targetHalf glow line (Variant E insertBefore)
// 세 시각 피드백 모두 ghost 좌표 single source 로 derive → 항상 같은 lane 가리킨다.
// 상세 / RC: class-planner/docs/dnd-visual-feedback.md.
//
// targetMode:
//   - "lane"         : drop 후 lane occupy. lane-highlight 박스만, amber overlay 없음.
//   - "insertBefore" : lane 사이 insert (Variant E). amber overlay 표시 + targetHalf glow.
//   - null           : hover 없음.
// targetHalf: insertBefore 시 cell 의 어느 절반에 cursor 가 있는지 ("left" / "right").
interface DragPreviewState {
  draggedSession: Session | null;
  targetWeekday: number | null;
  targetTime: string | null;
  targetYPosition: number | null;
  // optional: legacy 호출자 호환. undefined → "lane" default.
  targetMode?: "lane" | "insertBefore" | null;
  targetHalf?: "left" | "right" | null;
}

interface TimeTableRowProps {
  weekday: number;
  width: number; // 이 weekday column 전체 너비 (max lane 수 × laneWidth)
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
  selectedStudentIds?: string[];
  /** 과목 필터 — 학생과 AND 결합. 매칭 sessions이 앞 lane으로 정렬. */
  selectedSubjectIds?: string[];
  /** 강사 필터 — 학생/과목과 AND 결합. session.teacherId로 매칭. */
  selectedTeacherIds?: string[];
  isAnyDragging?: boolean;
  /** Ctrl/Meta+drag 복사 모드 — SessionBlock에 전달해 원본 opacity 유지 */
  isCopyMode?: boolean;
  /** drag 시작 시점 copy mode (latched). LaneInsertSlot mount 조건에 사용 —
   *  drag 도중 Cmd 풀어도 lane insert 비활성 유지 (T10b 회귀 가드). */
  dragStartedAsCopy?: boolean;
  teachers?: Teacher[];
  colorBy?: ColorByMode;
  isMobile?: boolean;
  dragPreview?: DragPreviewState;
  /**
   * drag 시작 시점의 이 weekday 의 lane 수 (TimeTableGrid 가 latch). drag 중 cell 수가
   * 줄어드는 케이스 (lane shift 후 source weekday 의 lane 줄어듦) 방지 — effectiveLanes
   * = max(frozenLanes, required). drag 중에만 유효, drag 끝나면 null.
   */
  frozenLanes?: number | null;
  /** 선택된 세션 id Set — SessionBlock의 selected 시각 표시 결정 */
  selectedSessionIds?: Set<string>;
  /** modifier(Shift/Ctrl/Meta) + click 시 호출 */
  onSessionSelectToggle?: (sessionId: string) => void;
  /** 모바일 long-press 메뉴 — "복사" 항목 (Ctrl/Cmd 키 없는 환경 대응) */
  onSessionContextMenuCopy?: (sessionId: string) => void;
  /** 모바일 long-press 메뉴 — "선택 시작" 항목 */
  onSessionContextMenuStartSelect?: (sessionId: string) => void;
  // 오늘 열 강조 (주간 헤더 날짜 표시용)
  isToday?: boolean;
  nowLinePx?: number | null;
  nowTimeStr?: string;
  // Controlled overflow expansion (부모가 column 폭까지 같이 관리할 때 사용)
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  /** 시간 라벨/세션 위치 계산 기준 시작 시각 (0-23). default 9. */
  startHour?: number;
  /** 표시 종료 시각 (inclusive — endHour:30 슬롯까지 표시). default 23. */
  endHour?: number;
}

/**
 * TimeTableRow — weekday column (B2+).
 * 시간축이 세로(rows), 요일이 가로(cols).
 * yPosition(=overlap lane)은 column 내부에서 가로로 스택된다.
 * Phase 4: ≤3 lanes equal-split, ≥4 lanes show 3 inline + "+N" expand chip.
 */
export const TimeTableRow: React.FC<TimeTableRowProps> = ({
  weekday,
  width,
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
  selectedSubjectIds,
  selectedTeacherIds,
  isAnyDragging = false,
  isCopyMode = false,
  dragStartedAsCopy = false,
  teachers = [],
  colorBy = "subject",
  isMobile = false,
  dragPreview,
  frozenLanes,
  isToday = false,
  nowLinePx = null,
  nowTimeStr,
  isExpanded: isExpandedProp,
  onToggleExpand,
  selectedSessionIds,
  onSessionSelectToggle,
  onSessionContextMenuCopy,
  onSessionContextMenuStartSelect,
  startHour = 9,
  endHour = 23,
}) => {
  const [internalExpanded, setInternalExpanded] = React.useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);

  // Bug4 fix: drag 시작 시 popover 닫기는 DraggableSessionCard 노드를 mid-drag 중 unmount해서
  // dnd-kit이 active draggable을 잃는다. 대신 drag가 종료(draggedSession → null)될 때 닫는다.
  const prevDraggedRef = React.useRef<Session | null>(null);
  React.useEffect(() => {
    const current = dragPreview?.draggedSession ?? null;
    if (prevDraggedRef.current !== null && current === null) {
      // drag 완료 후 popover 닫기 (drag 중에는 노드 유지)
      setIsPopoverOpen(false);
    }
    prevDraggedRef.current = current;
  }, [dragPreview?.draggedSession]);

  // Controlled mode (isExpandedProp provided by parent) vs uncontrolled (internal state)
  const isExpanded = isExpandedProp !== undefined ? isExpandedProp : internalExpanded;
  const handleToggleExpand = onToggleExpand ?? (() => setInternalExpanded((p) => !p));

  // Convert time string to minutes helper
  const timeToMinutes = React.useCallback((time: string): number => {
    if (!time || typeof time !== "string") {
      logger.warn("Invalid time format", { time });
      return 0;
    }
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  }, []);

  // [startHour:00, endHour+1:00) 와 strict overlap이 있는 세션. 경계를 넘는
  // 세션(예: 11:30-16:30 + range 7-13)은 양쪽 시간 모드(7-13, 13-22)에서
  // 모두 보이도록 부분 겹침을 허용한다. laidOutSessions에서 보이는 영역만
  // clamp 하고 overflowsTop/Bottom flag로 SessionBlock에 시각 표지를 전달.
  const weekdaySessions = React.useMemo(() => {
    const all = sessions?.get(weekday) || [];
    const lowerBound = startHour * 60;
    const upperBound = (endHour + 1) * 60;
    return all.filter((s) => {
      const startMin = timeToMinutes(s.startsAt);
      const endMin = timeToMinutes(s.endsAt);
      return startMin < upperBound && endMin > lowerBound;
    });
  }, [sessions, weekday, startHour, endHour, timeToMinutes]);

  // Reset internal expanded state when weekday switches or session list changes.
  // Controlled mode에서는 부모(TimeTableGrid)가 expandedWeekdays를 직접 관리한다.
  React.useEffect(() => {
    setInternalExpanded(false);
  }, [weekday, weekdaySessions]);

  // Required lane count based on actual time overlaps (not stored yPosition max)
  const rawMaxYPosition = React.useMemo(() => {
    return computeRequiredLanes(weekdaySessions);
  }, [weekdaySessions]);

  const isDragging = React.useMemo(() => {
    return Boolean(dragPreview?.draggedSession);
  }, [dragPreview]);

  // D-hybrid: overflow only when not actively dragging
  const isOverflow = !isDragging && rawMaxYPosition >= OVERFLOW_THRESHOLD;
  // drag 중에는 시작 시점 lane 수를 floor 로 — cell 수 줄어듦 차단 (mount/unmount flicker
  // 방지). 늘어남은 허용 (insertBefore 시 +1). dnd-visual-feedback.md § 5 (transient flicker).
  const effectiveLanes = isDragging && frozenLanes != null
    ? Math.max(frozenLanes, rawMaxYPosition)
    : (isExpanded ? rawMaxYPosition : (isOverflow ? 3 : rawMaxYPosition));

  // 드래그 중 target 요일에 양쪽 padding 추가 — 세션 너비는 유지하고 좌우 20px 여백만 생성.
  // weekdayWidths가 이미 DRAG_HOVER_PAD * 2 만큼 넓어져 있으므로 baseWidth로 원래 너비 복원.
  const DRAG_HOVER_PAD = 10;
  const isDraggingToThis = isDragging && dragPreview?.targetWeekday === weekday;
  const baseWidth = isDraggingToThis ? width - DRAG_HOVER_PAD * 2 : width;

  // 30분 단위 time slots — startHour:00 ~ endHour:30 (inclusive).
  const timeSlots30Min = React.useMemo(() => {
    const slots: string[] = [];
    for (let hour = startHour; hour <= endHour; hour++) {
      slots.push(`${hour.toString().padStart(2, "0")}:00`);
      slots.push(`${hour.toString().padStart(2, "0")}:30`);
    }
    return slots;
  }, [startHour, endHour]);

  // Lane width for horizontal overlap stacking within this weekday column
  const laneWidth = baseWidth / Math.max(1, effectiveLanes);
  const totalHeight = timeSlots30Min.length * SLOT_HEIGHT_PX;

  // 학생/과목/강사 필터 활성 시 매칭 sessions를 앞 lane에 우선 배치 (yPosition 불변).
  // 3 entity AND 결합 — 활성 type 모두 만족하는 sessions만 매칭. dim 시각은 SessionBlock이 담당.
  const studentIdsKey = selectedStudentIds ?? [];
  const subjectIdsKey = selectedSubjectIds ?? [];
  const teacherIdsKey = selectedTeacherIds ?? [];
  const isStudentFilterActive = studentIdsKey.length > 0;
  const isSubjectFilterActive = subjectIdsKey.length > 0;
  const isTeacherFilterActive = teacherIdsKey.length > 0;
  const isFilterActive = isStudentFilterActive || isSubjectFilterActive || isTeacherFilterActive;
  const sortByYPos = (a: Session, b: Session) => (a.yPosition || 1) - (b.yPosition || 1);
  const orderedSessions = React.useMemo(() => {
    if (!isFilterActive) return [...weekdaySessions].sort(sortByYPos);
    const matching = weekdaySessions
      .filter((s) =>
        sessionMatchesFilters(s, enrollments, studentIdsKey, subjectIdsKey, teacherIdsKey),
      )
      .sort(sortByYPos);
    const nonMatching = weekdaySessions
      .filter(
        (s) =>
          !sessionMatchesFilters(s, enrollments, studentIdsKey, subjectIdsKey, teacherIdsKey),
      )
      .sort(sortByYPos);
    return [...matching, ...nonMatching];
  }, [weekdaySessions, studentIdsKey, subjectIdsKey, teacherIdsKey, enrollments, isFilterActive]);

  // Visible sessions:
  //   - 필터 미활성: yPosition <= 3 기반 (startsAt 순서와 무관하게 yPosition SSOT 유지)
  //   - 필터 활성: slice(0,3) — matching 세션이 앞으로 재정렬되어 있으므로 slice가 옳음
  const visibleSessions = React.useMemo(() => {
    if (!(isOverflow && !isExpanded)) return orderedSessions;
    return isFilterActive
      ? orderedSessions.slice(0, 3)
      : orderedSessions.filter((s) => (s.yPosition || 1) <= 3);
  }, [orderedSessions, isOverflow, isExpanded, isFilterActive]);

  // Hidden sessions: visible 기준 반대
  const hiddenSessions = React.useMemo(() => {
    if (!(isOverflow && !isExpanded)) return [];
    return isFilterActive
      ? orderedSessions.slice(3)
      : orderedSessions.filter((s) => (s.yPosition || 1) >= 4);
  }, [orderedSessions, isOverflow, isExpanded, isFilterActive]);

  // Position the +N chip near the first hidden session's start time (stable regardless of isExpanded).
  const chipTopPx = React.useMemo(() => {
    if (!isOverflow) return null;
    const candidates = isFilterActive
      ? orderedSessions.slice(3)
      : orderedSessions.filter((s) => (s.yPosition || 1) >= 4);
    if (candidates.length === 0) return null;
    const first = candidates[0];
    // first.startsAt이 lowerBound보다 작을 수 있다 (overflowsTop 세션) → clamp.
    const visStartMin = Math.max(timeToMinutes(first.startsAt), startHour * 60);
    return Math.max(4, ((visStartMin - startHour * 60) / 30) * SLOT_HEIGHT_PX);
  }, [orderedSessions, isOverflow, isFilterActive, startHour, timeToMinutes]);

  // Compute per-session layout. 경계 초과 세션(startMin<lowerBound 또는
  // endMin>upperBound)은 보이는 영역으로 clamp 하고, overflowsTop/Bottom flag로
  // SessionBlock에 시각 표지(그라데이션 cap)를 전달한다.
  const laidOutSessions = React.useMemo(() => {
    const lowerBound = startHour * 60;
    const upperBound = (endHour + 1) * 60;
    return visibleSessions.map((session) => {
      // 필터 미활성: yPosition - 1 을 laneIdx로 사용 (yPosition이 SSOT).
      // 필터 활성: orderedSessions 배열 index 기반 (matching 우선 시각 배치 유지).
      const rawIdx = isFilterActive
        ? visibleSessions.findIndex((s) => s.id === session.id)
        : (session.yPosition || 1) - 1;
      const laneIdx = Math.min(Math.max(0, rawIdx), effectiveLanes - 1);
      const startMin = timeToMinutes(session.startsAt);
      const endMin = timeToMinutes(session.endsAt);
      const visStart = Math.max(startMin, lowerBound);
      const visEnd = Math.min(endMin, upperBound);
      const timeIdx = Math.max(0, (visStart - lowerBound) / 30);
      const durationSlots = Math.max(0.5, (visEnd - visStart) / 30);
      return {
        session,
        left: Math.round(laneIdx * laneWidth) + (isDraggingToThis ? DRAG_HOVER_PAD : 0),
        width: Math.round(laneWidth),
        top: Math.round(timeIdx * SLOT_HEIGHT_PX),
        height: Math.round(durationSlots * SLOT_HEIGHT_PX),
        yPosition: laneIdx + 1,
        overflowsTop: startMin < lowerBound,
        overflowsBottom: endMin > upperBound,
      };
    });
  }, [visibleSessions, timeToMinutes, laneWidth, startHour, endHour, isDraggingToThis, effectiveLanes, isFilterActive]);

  // ghost layout (드래그 중 movingSession 의 laidOut 위치) — lane-highlight + amber
  // overlay 가 같은 source 에서 좌표 derive. compactYPositions artifact (lane 1 출발
  // + insertBefore=2 시 ghost yPos 가 1 로 compact) 도 자동 반영. dnd-visual-feedback.md
  // § 1 RC 분석 참조.
  const ghostLayout = React.useMemo(() => {
    const dsId = dragPreview?.draggedSession?.id;
    if (!dsId) return null;
    return laidOutSessions.find(({ session }) => session.id === dsId) ?? null;
  }, [laidOutSessions, dragPreview?.draggedSession?.id]);

  return (
    <div
      className={`relative bg-[var(--color-bg-primary)] border-r border-[var(--color-border-grid)] ${className}`}
      data-testid={`time-table-column-${weekday}`}
      data-weekday={weekday}
      style={{
        height: `${totalHeight}px`,
        width: `${width}px`,
        // target 컬럼: 미묘한 inner glow로 "여기에 드래그 중" 표시
        boxShadow: isDraggingToThis
          ? "inset 0 0 0 1.5px rgba(99,179,237,0.35)"
          : undefined,
        ...style,
      }}
    >
      {/* 수평 시간선 overlay — pointer-events:none, 세션 블록보다 낮은 z-index */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {timeSlots30Min.map((slot, idx) => (
          <div
            key={`line-${slot}`}
            className="absolute left-0 right-0"
            style={{
              top: idx * SLOT_HEIGHT_PX,
              height: 1,
              background: idx % 2 === 0
                ? "rgba(255,255,255,0.09)"
                : "rgba(255,255,255,0.04)",
            }}
          />
        ))}

        {/* 현재 시각 선 (오늘 열만) */}
        {isToday && nowLinePx !== null && (
          <div
            className="absolute left-0 right-0 pointer-events-none"
            style={{ top: nowLinePx, zIndex: 150, transition: "top 0.5s ease-out" }}
            aria-label="현재 시각"
          >
            {/* Amber time pill on the left */}
            {nowTimeStr && (
              <div
                className="absolute left-0 -top-[11px] text-[10px] font-semibold px-[6px] py-0.5 rounded-[10px] leading-[1.4] whitespace-nowrap z-[151]"
                style={{
                  background: "var(--color-accent-hover)",
                  color: "var(--color-bg-primary)",
                  fontFeatureSettings: '"tnum"',
                }}
              >
                {nowTimeStr}
              </div>
            )}
            {/* 2px horizontal line */}
            <div
              className="absolute left-0 right-0 h-[2px] rounded-[1px]"
              style={{ background: "var(--color-accent-hover)" }}
            />
          </div>
        )}
      </div>

      {/* 드래그 중 레인 경계선 — 어느 lane으로 떨어질지 시각적 힌트 */}
      {isDragging && effectiveLanes >= 2 && (
        Array.from({ length: effectiveLanes - 1 }, (_, i) => (
          <div
            key={`lane-bound-${i}`}
            data-testid={`lane-boundary-${i}`}
            className="absolute top-0 bottom-0 pointer-events-none"
            style={{
              left: (i + 1) * laneWidth + (isDraggingToThis ? DRAG_HOVER_PAD : 0),
              width: 1,
              background: "rgba(255,255,255,0.10)",
              zIndex: 94,
            }}
          />
        ))
      )}

      {/* 드래그 중 타겟 레인 하이라이트 — 항상 column 박스 (사용자 직관 "어느 lane 으로
          드롭하는지"). 좌표는 ghost layout (laidOutSessions) 에서 derive — compactYPositions
          artifact (lane 1 출발 + insertBefore=2 시 ghost yPos=1 로 compact 되는 케이스) 도
          자동 반영. ghost 미존재 시 raw targetYPosition fallback. amber overlay 도 같은
          좌표 derive → 3 종 시각 피드백 항상 같은 lane. dnd-visual-feedback.md § 5 참조. */}
      {isDragging && dragPreview?.targetWeekday === weekday && dragPreview?.targetYPosition != null && (() => {
        const left = ghostLayout
          ? ghostLayout.left
          : (dragPreview.targetYPosition - 1) * laneWidth + (isDraggingToThis ? DRAG_HOVER_PAD : 0);
        const width = ghostLayout ? ghostLayout.width : Math.round(laneWidth);
        return (
          <div
            data-testid="lane-highlight"
            className="absolute top-0 bottom-0 pointer-events-none"
            style={{
              left,
              width,
              background: "rgba(99,179,237,0.10)",
              borderLeft: "1.5px solid rgba(99,179,237,0.35)",
              borderRight: "1.5px solid rgba(99,179,237,0.35)",
              zIndex: 95,
            }}
          />
        );
      })()}

      {/* Drop cells — timeSlots × effectiveLanes.
          drag 중 (insertMode=true) 일 땐 cell 을 left/right half 두 insertBefore
          droppable 로 분할 — cursor 가 cell 어디에 hover 하든 가까운 boundary insert.
          Variant E (Edge Hover Slot) — cell split. dragStartedAsCopy (시작 시점 latch)
          기준이라 drag 도중 Cmd 풀어도 insertMode 유지 안 됨 (T10b 회귀 가드). */}
      {timeSlots30Min.map((timeString, timeIndex) => {
        return Array.from({ length: effectiveLanes }, (_, laneIdx) => {
          const yPosition = laneIdx + 1;
          const cellAbsTop = timeIndex * SLOT_HEIGHT_PX;
          return (
            <TimeTableCell
              key={`${timeString}-${yPosition}`}
              weekday={weekday}
              time={timeString}
              yPosition={yPosition}
              onDrop={onDrop}
              onEmptySpaceClick={onEmptySpaceClick}
              isReadOnly={false}
              insertMode={
                isDraggingToThis &&
                !dragStartedAsCopy &&
                (selectedSessionIds?.size ?? 0) <= 1
              }
              style={{
                position: "absolute",
                top: `${cellAbsTop}px`,
                left: `${laneIdx * laneWidth + (isDraggingToThis ? DRAG_HOVER_PAD : 0)}px`,
                width: `${laneWidth}px`,
                height: `${SLOT_HEIGHT_PX}px`,
                zIndex: 1,
              }}
            />
          );
        });
      })}

      {/* Session blocks (absolutely positioned, visible sessions only) */}
      {laidOutSessions.map(({ session, left, width: sWidth, top, height, yPosition, overflowsTop, overflowsBottom }) => (
        // target weekday에서만 SessionBlock을 skip하고 DragGhost가 대신 렌더.
        // targetWeekday === null (아직 셀 위를 안 지남)이면 원본 위치에 정상 렌더.
        session.id === dragPreview?.draggedSession?.id
          && dragPreview?.targetWeekday === weekday
          ? null :
        <SessionBlock
          key={session.id}
          session={session}
          subjects={(subjects || []).map((subject) => ({
            ...subject,
            color: subject.color || "#000000",
          }))}
          enrollments={enrollments}
          students={students}
          left={left}
          width={sWidth}
          yOffset={top}
          yPosition={yPosition}
          height={height}
          onClick={() => onSessionClick(session)}
          onDelete={
            onSessionDelete ? () => onSessionDelete(session) : undefined
          }
          selectedStudentIds={selectedStudentIds}
          selectedSubjectIds={selectedSubjectIds}
          selectedTeacherIds={selectedTeacherIds}
          teachers={teachers}
          colorBy={colorBy}
          isMobile={isMobile}
          isDragging={Boolean(dragPreview?.draggedSession)}
          draggedSessionId={dragPreview?.draggedSession?.id}
          isAnyDragging={isAnyDragging}
          isCopyMode={isCopyMode}
          overflowsTop={overflowsTop}
          overflowsBottom={overflowsBottom}
          hasLaneOverflowChip={isOverflow && yPosition === effectiveLanes}
          selected={selectedSessionIds?.has(session.id) ?? false}
          onSelectToggle={
            onSessionSelectToggle
              ? () => onSessionSelectToggle(session.id)
              : undefined
          }
          onContextMenuCopy={
            onSessionContextMenuCopy
              ? () => onSessionContextMenuCopy(session.id)
              : undefined
          }
          onContextMenuStartSelect={
            onSessionContextMenuStartSelect
              ? () => onSessionContextMenuStartSelect(session.id)
              : undefined
          }
        />
      ))}

      {/* Source placeholder — 세션이 이 요일에서 빠져나갔을 때 원래 자리에 흐릿한 표시 */}
      {(() => {
        const ds = dragPreview?.draggedSession;
        // source weekday이고, hover 중인 target이 있고, 이 요일에서 세션이 사라졌을 때
        if (!ds || ds.weekday !== weekday || dragPreview?.targetWeekday === null) return null;
        // laidOutSessions에 없어야 함 (다른 요일로 이동된 경우)
        if (laidOutSessions.some(({ session }) => session.id === ds.id)) return null;

        const [sh, sm] = (ds.startsAt ?? "").split(":").map(Number);
        const [eh, em] = (ds.endsAt ?? "").split(":").map(Number);
        const timeIdx = Math.max(0, (sh * 60 + sm - startHour * 60) / 30);
        const durationSlots = Math.max(1, ((eh * 60 + em) - (sh * 60 + sm)) / 30);
        const laneIdx = Math.min(Math.max(0, (ds.yPosition ?? 1) - 1), effectiveLanes - 1);

        const firstEnrollId = ds.enrollmentIds?.[0];
        const enr = firstEnrollId ? enrollments.find((e) => e.id === firstEnrollId) : null;
        const subj = enr ? subjects.find((s) => s.id === enr.subjectId) : null;
        const srcColor = subj?.color ?? "#6B7280";

        return (
          <div
            key="drag-source"
            style={{
              position: "absolute",
              left: Math.round(laneIdx * laneWidth),
              top: Math.round(timeIdx * SLOT_HEIGHT_PX) + 1,
              width: Math.round(laneWidth),
              height: Math.round(durationSlots * SLOT_HEIGHT_PX) - 1,
              backgroundColor: srcColor,
              opacity: 0.18,
              borderRadius: 4,
              pointerEvents: "none",
              zIndex: 90,
            }}
            data-testid="drag-source"
          />
        );
      })()}

      {/* amber overlay ("여기 삽입") — Variant E insertBefore mode 시 ghost 좌표
          (laidOutSessions) 에 그려진다. cell 의 isOver 가 아닌 dragController.targetMode
          + targetHalf 기반 — 3 시각 피드백 SSOT 통일 (dnd-visual-feedback.md § 3, 5).
          targetHalf 로 left/right boundary glow 분기. multi-select / Cmd+copy 시 미렌더
          (T10b 회귀 가드, cell 의 insertMode 와 동일 조건). */}
      {(() => {
        if (dragPreview?.targetWeekday !== weekday) return null;
        if (dragPreview?.targetMode !== "insertBefore") return null;
        if (dragStartedAsCopy) return null;
        if ((selectedSessionIds?.size ?? 0) > 1) return null;
        if (!ghostLayout) return null;
        return (
          <div
            data-testid="amber-overlay"
            data-target-half={dragPreview.targetHalf ?? undefined}
            style={{
              position: "absolute",
              left: ghostLayout.left,
              top: ghostLayout.top,
              width: ghostLayout.width,
              height: ghostLayout.height,
              zIndex: 4,
              pointerEvents: "none",
            }}
            className="rounded-md border-2 border-dashed border-amber-400/90 bg-amber-300/25 flex items-center justify-center"
          >
            <span className="text-[12px] font-bold text-amber-200 select-none whitespace-nowrap">
              여기 삽입
            </span>
            {dragPreview.targetHalf === "left" && (
              <div className="absolute inset-y-0 left-0 w-1 bg-amber-400 rounded-l-md shadow-[0_0_8px_2px_rgba(251,191,36,0.6)]" />
            )}
            {dragPreview.targetHalf === "right" && (
              <div className="absolute inset-y-0 right-0 w-1 bg-amber-400 rounded-r-md shadow-[0_0_8px_2px_rgba(251,191,36,0.6)]" />
            )}
          </div>
        );
      })()}

      {/* DragGhost — 드래그 대상 위치에 세션 내용이 담긴 반투명 미리보기 카드 */}
      {(() => {
        const ds = dragPreview?.draggedSession;
        if (!ds || dragPreview?.targetWeekday !== weekday) return null;

        const ghostLayout = laidOutSessions.find(({ session }) => session.id === ds.id);
        if (!ghostLayout) return null;

        // 과목·학생 정보 추출 (sessionsForRender의 세션 = 이미 target 시간으로 업데이트됨)
        const { session: ghostSession } = ghostLayout;
        const firstEnrollId = ds.enrollmentIds?.[0];
        const enr = firstEnrollId ? enrollments.find((e) => e.id === firstEnrollId) : null;
        const subj = enr ? subjects.find((s) => s.id === enr.subjectId) : null;
        const ghostColor = subj?.color ?? "#6B7280";
        const tone = resolveSessionTone(ghostColor);
        const studentNames = (ds.enrollmentIds ?? [])
          .flatMap((eid) => {
            const e = enrollments.find((en) => en.id === eid);
            const st = e ? students.find((s) => s.id === e.studentId) : null;
            return st ? [st.name] : [];
          })
          .slice(0, 4);

        return (
          <div
            key="drag-ghost"
            data-testid="drag-ghost"
            style={{
              position: "absolute",
              left: ghostLayout.left + 1,
              top: ghostLayout.top + 1,
              width: ghostLayout.width - 2,
              height: ghostLayout.height - 2,
              backgroundColor: tone.bg,
              borderRadius: 6,
              pointerEvents: "none",
              zIndex: 200,
              opacity: 0.82,
              boxShadow: "0 4px 16px rgba(0,0,0,0.18), 0 0 0 2px rgba(255,255,255,0.25)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              padding: "3px 6px",
              gap: 1,
              borderLeft: `3px solid ${tone.accent}`,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 600, color: tone.fg, lineHeight: 1.3, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
              {subj?.name ?? "과목 없음"}
            </div>
            <div style={{ fontSize: 10, color: tone.fg, opacity: 0.75, lineHeight: 1.2 }}>
              {ghostSession.startsAt}–{ghostSession.endsAt}
            </div>
            {studentNames.length > 0 && (
              <div style={{ fontSize: 10, color: tone.fg, opacity: 0.65, lineHeight: 1.2, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                {studentNames.join(", ")}
              </div>
            )}
          </div>
        );
      })()}

      {/* Overflow chip:
            - 미펼침: "+N" 클릭 → popover 오픈 (직접 드래그 가능)
            - 펼침:   "−"  클릭 → collapse (handleToggleExpand) */}
      {isOverflow && chipTopPx !== null && (
        <button
          type="button"
          className="absolute cursor-pointer border-0 rounded-[6px] session-overlay-pill backdrop-blur-sm text-white text-[10px] font-bold leading-tight whitespace-nowrap"
          onClick={(e) => {
            e.stopPropagation();
            if (isExpanded) {
              handleToggleExpand();
            } else {
              setIsPopoverOpen((p) => !p);
            }
          }}
          aria-label={isExpanded ? "수업 접기" : `${hiddenSessions.length}개 수업 더 보기`}
          aria-expanded={isExpanded}
          data-testid={`overflow-expand-btn-${weekday}`}
          style={{
            top: chipTopPx ?? 4,
            right: 4,
            zIndex: 115,
            padding: "3px 6px",
          }}
        >
          {isExpanded ? "−" : `+${hiddenSessions.length}`}
        </button>
      )}

      {/* Overflow popover — 미펼침 상태에서 +N 칩 클릭 시 숨겨진 세션을 직접 드래그 */}
      {isPopoverOpen && !isExpanded && hiddenSessions.length > 0 && chipTopPx !== null && (
        <HiddenSessionsPopover
          hiddenSessions={hiddenSessions}
          subjects={subjects || []}
          enrollments={enrollments}
          students={students}
          anchorTop={chipTopPx}
          onClose={() => setIsPopoverOpen(false)}
          onExpandAll={() => {
            handleToggleExpand();
            setIsPopoverOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default TimeTableRow;
