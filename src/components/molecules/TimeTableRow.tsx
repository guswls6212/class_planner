import React from "react";
import type { Session, Subject, Teacher } from "../../lib/planner";
import { logger } from "../../lib/logger";
import type { ColorByMode } from "../../hooks/useColorBy";
import { resolveSessionTone } from "./SessionCard.utils";

import { SLOT_HEIGHT_PX } from "@/shared/constants/sessionConstants";
import { computeRequiredLanes } from "../../lib/sessionCollisionUtils";
import TimeTableCell from "./TimeTableCell";
import SessionBlock from "./SessionBlock";
import {
  SessionOverflowPopover,
  type OverflowSessionItem,
} from "./SessionOverflowPopover";

// D-hybrid: columns with ≥4 yPositions show only the first 2 + "+N" pill
const OVERFLOW_THRESHOLD = 4;

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
}

/**
 * TimeTableRow — weekday column (B2+).
 * 시간축이 세로(rows), 요일이 가로(cols).
 * yPosition(=overlap lane)은 column 내부에서 가로로 스택된다.
 * B3: D-hybrid — ≤3 lanes equal-split, ≥4 lanes cap at 2 + overflow pill.
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
}) => {
  const [openPillSlot, setOpenPillSlot] = React.useState<string | null>(null);

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

  // Required lane count based on actual time overlaps (not stored yPosition max)
  const rawMaxYPosition = React.useMemo(() => {
    return computeRequiredLanes(weekdaySessions);
  }, [weekdaySessions]);

  const isDragging = React.useMemo(() => {
    return Boolean(dragPreview?.draggedSession);
  }, [dragPreview]);

  // D-hybrid: overflow only when not actively dragging
  const isOverflow = !isDragging && rawMaxYPosition >= OVERFLOW_THRESHOLD;
  const effectiveLanes = isOverflow ? 2 : rawMaxYPosition;

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

  // Visible sessions (yPos ≤2 when overflow; all otherwise)
  const visibleSessions = React.useMemo(() => {
    return isOverflow
      ? weekdaySessions.filter((s) => (s.yPosition || 1) <= 2)
      : weekdaySessions;
  }, [weekdaySessions, isOverflow]);

  // Hidden sessions (yPos ≥3 when overflow; empty otherwise)
  const hiddenSessions = React.useMemo(() => {
    return isOverflow
      ? weekdaySessions.filter((s) => (s.yPosition || 1) >= 3)
      : [];
  }, [weekdaySessions, isOverflow]);

  // Compute per-session layout (top/height from time, left/width from lane)
  const laidOutSessions = React.useMemo(() => {
    return visibleSessions.map((session) => {
      // Clamp laneIdx to valid range — orphan yPosition values (e.g., yPos=2 with no yPos=1)
      // would place blocks outside the column without this clamp.
      const laneIdx = Math.min(
        Math.max(0, (session.yPosition || 1) - 1),
        effectiveLanes - 1
      );
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
      };
    });
  }, [visibleSessions, timeToMinutes, laneWidth]);

  // Per-slot hidden sessions (for overflow pills)
  const slotHiddenSessions = React.useMemo(() => {
    if (!isOverflow) return [];
    return timeSlots30Min.map((slot) => {
      const slotMin = timeToMinutes(slot);
      return hiddenSessions.filter((s) => {
        const start = timeToMinutes(s.startsAt);
        const end = timeToMinutes(s.endsAt);
        return start <= slotMin && slotMin < end;
      });
    });
  }, [timeSlots30Min, hiddenSessions, isOverflow, timeToMinutes]);

  // Group contiguous time slots sharing the same hidden session set → one pill per group
  const overflowGroups = React.useMemo(() => {
    if (!isOverflow) return [];
    const groups: { startIdx: number; endIdx: number; hidden: Session[] }[] = [];
    slotHiddenSessions.forEach((hidden, idx) => {
      if (hidden.length === 0) return;
      const hiddenKey = hidden.map((s) => s.id).sort().join(",");
      if (groups.length > 0) {
        const last = groups[groups.length - 1];
        const lastKey = last.hidden.map((s) => s.id).sort().join(",");
        if (idx === last.endIdx + 1 && hiddenKey === lastKey) {
          last.endIdx = idx;
          return;
        }
      }
      groups.push({ startIdx: idx, endIdx: idx, hidden });
    });
    return groups;
  }, [isOverflow, slotHiddenSessions]);

  // Map hidden sessions to OverflowSessionItem for the popover
  const toOverflowItems = React.useCallback(
    (sessions: Session[]): OverflowSessionItem[] =>
      sessions.map((session) => {
        const firstEnrollment = enrollments.find((e) =>
          session.enrollmentIds?.includes(e.id)
        );
        const subject = firstEnrollment
          ? (subjects.find((s) => s.id === firstEnrollment.subjectId) ?? null)
          : null;

        const studentNames = (session.enrollmentIds || []).flatMap((eid) => {
          const enr = enrollments.find((e) => e.id === eid);
          const st = enr ? students.find((s) => s.id === enr.studentId) : null;
          return st ? [st.name] : [];
        });

        // Resolve accent color from subject color (same logic as SessionBlock)
        const tone = resolveSessionTone(subject?.color);
        const accent = tone.accent;

        // Resolve teacher name from session.teacherId (optional field on Session)
        const teacherName = session.teacherId
          ? (teachers?.find((t) => t.id === session.teacherId)?.name ?? undefined)
          : undefined;

        return {
          id: session.id,
          subject,
          studentNames,
          accent,
          startTime: session.startsAt,
          endTime: session.endsAt,
          teacherName,
          studentCount: studentNames.length,
        };
      }),
    [enrollments, subjects, students, teachers]
  );

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
            className="absolute left-0 right-0"
            style={{ top: nowLinePx, zIndex: 10 }}
            aria-label="현재 시각"
          >
            <div
              className="absolute rounded-full"
              style={{ width: 10, height: 10, background: "var(--color-accent-hover)", top: -4, left: -4 }}
            />
            <div
              className="absolute left-0 right-0"
              style={{ height: 2, background: "var(--color-accent-hover)", borderRadius: 1 }}
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
      {laidOutSessions.map(({ session, left, width: sWidth, top, height }) => (
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

      {/* Overflow pills — one per contiguous group of slots sharing the same hidden session set */}
      {isOverflow &&
        overflowGroups.map(({ startIdx, endIdx, hidden }) => {
          const timeString = timeSlots30Min[startIdx];
          const pillHeight = (endIdx - startIdx + 1) * SLOT_HEIGHT_PX - 4;
          return (
            <div
              key={`pill-group-${startIdx}`}
              style={{
                position: "absolute",
                top: startIdx * SLOT_HEIGHT_PX + 2,
                right: 2,
                height: pillHeight,
                width: 20,
                zIndex: 110,
              }}
              data-testid={`overflow-pill-wrapper-${timeString}`}
            >
              <button
                type="button"
                className="flex items-center justify-center w-full h-full text-[9px] font-bold text-white bg-[#27272A] rounded-sm hover:bg-[#3f3f46] transition-colors leading-none"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenPillSlot((prev) =>
                    prev === timeString ? null : timeString
                  );
                }}
                aria-label={`${hidden.length}개 세션 더 보기`}
                data-testid={`overflow-pill-${timeString}`}
              >
                +{hidden.length}
              </button>
              {openPillSlot === timeString && (
                <SessionOverflowPopover
                  title={`${timeString} 숨겨진 세션`}
                  items={toOverflowItems(hidden)}
                  onSelect={(id) => {
                    const session = hidden.find((s) => s.id === id);
                    if (session) onSessionClick(session);
                    setOpenPillSlot(null);
                  }}
                  onClose={() => setOpenPillSlot(null)}
                />
              )}
            </div>
          );
        })}
    </div>
  );
};

export default TimeTableRow;
