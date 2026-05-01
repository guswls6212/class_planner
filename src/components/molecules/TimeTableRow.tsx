import React from "react";
import type { Session, Subject, Teacher } from "../../lib/planner";
import { logger } from "../../lib/logger";
import type { ColorByMode } from "../../hooks/useColorBy";
import { resolveSessionTone } from "./SessionCard.utils";

import { SLOT_HEIGHT_PX } from "@/shared/constants/sessionConstants";
import { computeRequiredLanes } from "../../lib/sessionCollisionUtils";
import { sessionContainsSelected } from "./SessionBlock.utils";
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
interface DragPreviewState {
  draggedSession: Session | null;
  targetWeekday: number | null;
  targetTime: string | null;
  targetYPosition: number | null;
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
  isAnyDragging?: boolean;
  teachers?: Teacher[];
  colorBy?: ColorByMode;
  isMobile?: boolean;
  // Drag handlers
  onDragStart?: (session: Session) => void;
  onDragOver?: (weekday: number, time: string, yPosition: number) => void;
  onDragEnd?: () => void;
  dragPreview?: DragPreviewState;
  // 오늘 열 강조 (주간 헤더 날짜 표시용)
  isToday?: boolean;
  nowLinePx?: number | null;
  nowTimeStr?: string;
  // Controlled overflow expansion (부모가 column 폭까지 같이 관리할 때 사용)
  isExpanded?: boolean;
  onToggleExpand?: () => void;
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
  isAnyDragging = false,
  teachers = [],
  colorBy = "subject",
  isMobile = false,
  onDragStart,
  onDragOver,
  onDragEnd,
  dragPreview,
  isToday = false,
  nowLinePx = null,
  nowTimeStr,
  isExpanded: isExpandedProp,
  onToggleExpand,
}) => {
  const [internalExpanded, setInternalExpanded] = React.useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
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

  // Sessions for this weekday
  const weekdaySessions = React.useMemo(() => {
    return sessions?.get(weekday) || [];
  }, [sessions, weekday]);

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
  const effectiveLanes = isExpanded ? rawMaxYPosition : (isOverflow ? 3 : rawMaxYPosition);

  // 드래그 중 target 요일에 양쪽 padding 추가 — 세션 너비는 유지하고 좌우 20px 여백만 생성.
  // weekdayWidths가 이미 DRAG_HOVER_PAD * 2 만큼 넓어져 있으므로 baseWidth로 원래 너비 복원.
  const DRAG_HOVER_PAD = 10;
  const isDraggingToThis = isDragging && dragPreview?.targetWeekday === weekday;
  const baseWidth = isDraggingToThis ? width - DRAG_HOVER_PAD * 2 : width;

  // 30-minute time slots (9:00 – 23:30)
  const timeSlots30Min = React.useMemo(() => {
    const slots: string[] = [];
    for (let hour = 9; hour < 24; hour++) {
      slots.push(`${hour.toString().padStart(2, "0")}:00`);
      slots.push(`${hour.toString().padStart(2, "0")}:30`);
    }
    return slots;
  }, []);

  // Lane width for horizontal overlap stacking within this weekday column
  const laneWidth = baseWidth / Math.max(1, effectiveLanes);
  const totalHeight = timeSlots30Min.length * SLOT_HEIGHT_PX;

  // 컨테이너 레벨 dragover — 커서 좌표로 (time, yPosition) 직접 계산.
  // 드래그 중인 세션(pointer-events:auto, z=500)이 셀을 가로막아도 버블링으로 도달.
  const handleContainerDragOver = React.useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (!isAnyDragging) return;
      e.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect || !onDragOver) return;
      const target = coordsToDropTarget(
        e.clientX - rect.left,
        e.clientY - rect.top,
        laneWidth,
        effectiveLanes,
        SLOT_HEIGHT_PX,
        timeSlots30Min,
        DRAG_HOVER_PAD,
        isDraggingToThis,
      );
      if (target) onDragOver(weekday, target.time, target.yPosition);
    },
    [isAnyDragging, weekday, onDragOver, laneWidth, effectiveLanes, timeSlots30Min, isDraggingToThis],
  );

  // 컨테이너 레벨 onDrop — 셀이 drop을 받지 못한 경우의 fallback
  const handleContainerDrop = React.useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (!isAnyDragging) return;
      e.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const target = coordsToDropTarget(
        e.clientX - rect.left,
        e.clientY - rect.top,
        laneWidth,
        effectiveLanes,
        SLOT_HEIGHT_PX,
        timeSlots30Min,
        DRAG_HOVER_PAD,
        isDraggingToThis,
      );
      if (!target) return;
      const data = e.dataTransfer?.getData("text/plain");
      if (data?.startsWith("session:")) {
        const sessionId = data.replace("session:", "");
        if (onSessionDrop) onSessionDrop(sessionId, weekday, target.time, target.yPosition);
      } else if (data) {
        if (onDrop) onDrop(weekday, target.time, data);
      }
    },
    [isAnyDragging, weekday, onDrop, onSessionDrop, laneWidth, effectiveLanes, timeSlots30Min, isDraggingToThis],
  );

  // 학생 필터 활성 시 매칭 세션을 앞 lane에 우선 배치 (렌더 타임 재정렬, yPosition 불변)
  // 필터 미활성 시에는 yPosition 오름차순 정렬 — useDisplaySessions의 startsAt 정렬과 독립적으로
  // yPosition을 lane 배치의 SSOT로 유지한다.
  const isStudentFilterActive = Boolean(selectedStudentIds?.length);
  const sortByYPos = (a: Session, b: Session) => (a.yPosition || 1) - (b.yPosition || 1);
  const orderedSessions = React.useMemo(() => {
    if (!isStudentFilterActive) return [...weekdaySessions].sort(sortByYPos);
    const matching = weekdaySessions
      .filter((s) => sessionContainsSelected(s, enrollments, selectedStudentIds!))
      .sort(sortByYPos);
    const nonMatching = weekdaySessions
      .filter((s) => !sessionContainsSelected(s, enrollments, selectedStudentIds!))
      .sort(sortByYPos);
    return [...matching, ...nonMatching];
  }, [weekdaySessions, selectedStudentIds, enrollments, isStudentFilterActive]);

  // Visible sessions:
  //   - 필터 미활성: yPosition <= 3 기반 (startsAt 순서와 무관하게 yPosition SSOT 유지)
  //   - 필터 활성: slice(0,3) — matching 세션이 앞으로 재정렬되어 있으므로 slice가 옳음
  const visibleSessions = React.useMemo(() => {
    if (!(isOverflow && !isExpanded)) return orderedSessions;
    return isStudentFilterActive
      ? orderedSessions.slice(0, 3)
      : orderedSessions.filter((s) => (s.yPosition || 1) <= 3);
  }, [orderedSessions, isOverflow, isExpanded, isStudentFilterActive]);

  // Hidden sessions: visible 기준 반대
  const hiddenSessions = React.useMemo(() => {
    if (!(isOverflow && !isExpanded)) return [];
    return isStudentFilterActive
      ? orderedSessions.slice(3)
      : orderedSessions.filter((s) => (s.yPosition || 1) >= 4);
  }, [orderedSessions, isOverflow, isExpanded, isStudentFilterActive]);

  // Position the +N chip near the first hidden session's start time (stable regardless of isExpanded).
  const chipTopPx = React.useMemo(() => {
    if (!isOverflow) return null;
    const candidates = isStudentFilterActive
      ? orderedSessions.slice(3)
      : orderedSessions.filter((s) => (s.yPosition || 1) >= 4);
    if (candidates.length === 0) return null;
    const first = candidates[0];
    const [h, m] = first.startsAt.split(":").map(Number);
    return Math.max(4, ((h * 60 + m - 9 * 60) / 30) * SLOT_HEIGHT_PX);
  }, [orderedSessions, isOverflow, isStudentFilterActive]);

  // Compute per-session layout (top/height from time, left/width from lane)
  const laidOutSessions = React.useMemo(() => {
    return visibleSessions.map((session) => {
      // 필터 미활성: yPosition - 1 을 laneIdx로 사용 (yPosition이 SSOT).
      // 필터 활성: orderedSessions 배열 index 기반 (matching 우선 시각 배치 유지).
      const rawIdx = isStudentFilterActive
        ? visibleSessions.findIndex((s) => s.id === session.id)
        : (session.yPosition || 1) - 1;
      const laneIdx = Math.min(Math.max(0, rawIdx), effectiveLanes - 1);
      const startMin = timeToMinutes(session.startsAt);
      const endMin = timeToMinutes(session.endsAt);
      const timeIdx = Math.max(0, (startMin - 9 * 60) / 30);
      const durationSlots = Math.max(1, (endMin - startMin) / 30);
      return {
        session,
        left: Math.round(laneIdx * laneWidth) + (isDraggingToThis ? DRAG_HOVER_PAD : 0),
        width: Math.round(laneWidth),
        top: Math.round(timeIdx * SLOT_HEIGHT_PX),
        height: Math.round(durationSlots * SLOT_HEIGHT_PX),
        yPosition: laneIdx + 1,
      };
    });
  }, [visibleSessions, timeToMinutes, laneWidth]);

  return (
    <div
      ref={containerRef}
      className={`relative bg-[var(--color-bg-primary)] border-r border-[var(--color-border-grid)] ${className}`}
      data-testid={`time-table-column-${weekday}`}
      data-weekday={weekday}
      onDragOver={handleContainerDragOver}
      onDrop={handleContainerDrop}
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

      {/* Drop cells — timeSlots × effectiveLanes */}
      {timeSlots30Min.map((timeString, timeIndex) => {
        return Array.from({ length: effectiveLanes }, (_, laneIdx) => {
          const yPosition = laneIdx + 1;
          return (
            <TimeTableCell
              key={`${timeString}-${yPosition}`}
              weekday={weekday}
              time={timeString}
              yPosition={yPosition}
              onDrop={onDrop}
              onSessionDrop={onSessionDrop}
              onEmptySpaceClick={onEmptySpaceClick}
              onDragOver={onDragOver}
              isAnyDragging={isAnyDragging}
              isDragging={isDragging}
              dragPreview={dragPreview}
              style={{
                position: "absolute",
                top: `${timeIndex * SLOT_HEIGHT_PX}px`,
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
      {laidOutSessions.map(({ session, left, width: sWidth, top, height, yPosition }) => (
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
          onDragStart={(_e, s) => {
            if (onDragStart) {
              onDragStart(s);
            }
          }}
          onDragEnd={() => {
            if (onDragEnd) {
              onDragEnd();
            }
          }}
          selectedStudentIds={selectedStudentIds}
          teachers={teachers}
          colorBy={colorBy}
          isMobile={isMobile}
          isDragging={Boolean(dragPreview?.draggedSession)}
          draggedSessionId={dragPreview?.draggedSession?.id}
          isAnyDragging={isAnyDragging}
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
        const timeIdx = Math.max(0, (sh * 60 + sm - 9 * 60) / 30);
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
          aria-label={isExpanded ? "세션 접기" : `${hiddenSessions.length}개 세션 더 보기`}
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
          onDragStart={(_e, session) => {
            if (onDragStart) onDragStart(session);
          }}
          onDragEnd={() => {
            setIsPopoverOpen(false);
            if (onDragEnd) onDragEnd();
          }}
        />
      )}
    </div>
  );
};

export default TimeTableRow;
