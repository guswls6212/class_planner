import React, { useCallback, useRef, useState } from "react";
import { logger } from "../../lib/logger";
import { useSessionStatus } from "../../hooks/useSessionStatus";
import type { Session, Subject } from "@/lib/planner";
import {
  type ColorByMode,
  getGroupStudentNames,
  getImprovedStudentDisplayText,
  getSessionBlockStyles,
  getSessionSubject,
  getStudentDeterministicColor,
  resolveSessionColor,
} from "./SessionBlock.utils";
import { resolveSessionTone } from "./SessionCard.utils";

interface SessionBlockProps {
  session: Session;
  subjects: Subject[];
  enrollments: Array<{ id: string; studentId: string; subjectId: string }>;
  students: Array<{ id: string; name: string }>;
  teachers?: Array<{ id: string; name: string; color: string }>;
  colorBy?: ColorByMode;
  left: number;
  width: number;
  yOffset: number;
  height?: number;
  onClick: () => void;
  onDragStart?: (e: React.DragEvent, session: Session) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  selectedStudentIds?: string[];
  isMobile?: boolean;
  isDragging?: boolean;
  draggedSessionId?: string;
  isAnyDragging?: boolean;
  hasConflict?: boolean;
  onDelete?: () => void;
  isReadOnly?: boolean;
}

export const validateSessionBlockProps = (
  left: number,
  width: number,
  yOffset: number
): boolean => {
  return left >= 0 && width > 0 && yOffset >= 0;
};

export const shouldShowSubjectName = (subjectName?: string): boolean => {
  return Boolean(subjectName);
};

function SessionBlock({
  session,
  subjects,
  enrollments,
  students,
  teachers = [],
  colorBy = "subject",
  left,
  width,
  yOffset,
  height,
  onClick,
  onDragStart,
  onDragEnd,
  selectedStudentIds,
  isMobile = false,
  isDragging = false,
  draggedSessionId,
  isAnyDragging = false,
  hasConflict = false,
  onDelete,
  isReadOnly = false,
}: SessionBlockProps) {
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchMovedRef = useRef(false);

  // Hook must be called before any early return (Rules of Hooks).
  const sessionStatus = useSessionStatus(
    session?.startsAt ?? "00:00",
    session?.endsAt ?? "00:00",
    session?.weekday ?? -1
  );

  // null/undefined 안전 처리
  if (!session) {
    return null;
  }

  // 과목과 학생 정보 가져오기
  const subject = getSessionSubject(session, enrollments || [], subjects || []);
  const studentNames = getGroupStudentNames(
    session,
    enrollments || [],
    students || [],
    selectedStudentIds?.[0]
  );

  // colorBy에 따라 블록 색상 결정
  const blockColor = resolveSessionColor(
    session,
    colorBy,
    enrollments || [],
    subjects || [],
    students || [],
    teachers,
    selectedStudentIds
  );

  // 강사 정보
  const teacher = teachers.find((t) => t.id === session.teacherId);

  if (!subject) {
    logger.warn("SessionBlock: 과목 정보 없음", {
      sessionId: session.id,
      enrollmentIds: session.enrollmentIds || [],
      subjectsCount: subjects.length,
      enrollmentsCount: enrollments.length,
      studentsCount: students.length,
    });
  }

  const styles = getSessionBlockStyles(
    left,
    width,
    yOffset,
    blockColor,
    isDragging,
    session.id === draggedSessionId,
    isAnyDragging,
    height
  );

  // 롱프레스 핸들러 (300ms 터치 홀드 → 컨텍스트 메뉴)
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (isReadOnly) return;
      touchMovedRef.current = false;
      longPressTimerRef.current = setTimeout(() => {
        if (!touchMovedRef.current) {
          e.preventDefault();
          setContextMenuOpen(true);
        }
      }, 300);
    },
    [isReadOnly]
  );

  const handleTouchMove = useCallback(() => {
    touchMovedRef.current = true;
    if (longPressTimerRef.current !== null) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimerRef.current !== null) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handleContextMenuEdit = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.stopPropagation();
      setContextMenuOpen(false);
      onClick();
    },
    [onClick]
  );

  const handleContextMenuDelete = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.stopPropagation();
      setContextMenuOpen(false);
      if (onDelete) {
        onDelete();
      } else {
        onClick();
      }
    },
    [onClick, onDelete]
  );

  const handleClick = (e: React.MouseEvent) => {
    logger.info("SessionBlock clicked", {
      sessionId: session.id,
      subjectName: subject?.name,
      studentNames,
      startsAt: session.startsAt,
      endsAt: session.endsAt,
      left,
      width,
      yOffset,
    });
    e.stopPropagation();
    if (!isReadOnly && onClick) {
      onClick();
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    try {
      e.dataTransfer.setData("text/plain", `session:${session.id}`);
      e.dataTransfer.effectAllowed = "move";
      logger.info("드래그 데이터 설정 완료", { sessionId: session.id });
    } catch (error) {
      logger.error("드래그 데이터 설정 실패", undefined, error as Error);
    }
    try {
      e.dataTransfer.setDragImage(e.currentTarget, 0, 0);
    } catch (_) {
      // jsdom 등 setDragImage 미지원 환경에서 안전하게 무시
    }
    if (onDragStart) {
      onDragStart(e, session);
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    logger.info("SessionBlock 드래그 종료", {
      sessionId: session.id,
      dropEffect: e.dataTransfer?.dropEffect,
    });
    if (onDragEnd) {
      onDragEnd(e);
    }
  };

  const isDraggedSession = session.id === draggedSessionId;

  const weekdayLabel =
    ["월", "화", "수", "목", "금", "토", "일"][session.weekday] ?? "";
  const ariaLabel = [
    studentNames.length > 0 ? studentNames.join(", ") : "학생 없음",
    subject?.name ?? "과목 없음",
    weekdayLabel,
    `${session.startsAt}–${session.endsAt}`,
  ].join(" ");

  // 3-tone 파스텔 톤 (pastel bg + dark fg + accent)
  const tone = resolveSessionTone(blockColor);

  // 상태 레이어 (Phase 3 SSOT): 완료 = opacity 0.55. in-progress/conflict = borderLeft accent
  const isCompleted = sessionStatus === "completed" && !isAnyDragging && !isDragging;
  const isInProgress = sessionStatus === "in-progress" && !isAnyDragging && !isDragging;

  // 커서 클래스
  const cursorClassName =
    isDragging && isDraggedSession ? "cursor-grabbing" : "cursor-move";

  // When colorBy='student' but no chip is selected, treat as subject mode for labels
  const isStudentModeActive =
    colorBy === "student" &&
    selectedStudentIds != null &&
    selectedStudentIds.length > 0;

  // Dim/glow logic: only active when student mode is on and not dragging
  const sessionContainsSelectedStudent =
    isStudentModeActive &&
    (session.enrollmentIds ?? []).some((eid) => {
      const enrollment = enrollments.find((e) => e.id === eid);
      return enrollment != null && selectedStudentIds!.includes(enrollment.studentId);
    });

  const isDraggingAny = isAnyDragging || isDragging;

  const dimGlowStyle: React.CSSProperties = (() => {
    if (!isStudentModeActive || isDraggingAny) return {};
    if (sessionContainsSelectedStudent) {
      const hex = getStudentDeterministicColor(selectedStudentIds![0]);
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return {
        boxShadow: `0 0 0 1.5px rgba(${r}, ${g}, ${b}, 0.55), 0 1px 2px rgba(0,0,0,0.3)`,
      };
    }
    return { opacity: 0.25 };
  })();

  const wrapperStyle: React.CSSProperties = {
    position: "absolute",
    left: styles.left,
    top: styles.top,
    width: styles.width,
    height: styles.height,
    zIndex: styles.zIndex,
    transition: "opacity 0.2s ease, box-shadow 0.2s ease",
    ...dimGlowStyle,
  };

  const accentColor = hasConflict
    ? "#EF4444"
    : isInProgress
      ? tone.accent
      : undefined;

  const buttonStyle: React.CSSProperties = {
    backgroundColor: tone.bg,
    color: tone.fg,
    borderRadius: 4,
    borderLeft: accentColor ? `3px solid ${accentColor}` : undefined,
    padding: 0,
    fontSize: 12,
    display: "flex",
    alignItems: "stretch",
    overflow: "hidden",
    cursor: styles.cursor,
    pointerEvents: styles.pointerEvents,
    opacity: isCompleted ? 0.55 : styles.opacity,
    visibility: styles.visibility as React.CSSProperties["visibility"],
    transition: styles.transition,
    width: "100%",
    height: "100%",
    position: "relative",
  };

  // Primary label based on colorBy
  const primaryLabel =
    isStudentModeActive
      ? studentNames[0] || "학생 없음"
      : colorBy === "teacher"
        ? teacher?.name || "강사 없음"
        : subject?.name || "과목 없음";

  // Secondary info based on colorBy
  const secondaryLabel =
    isStudentModeActive
      ? subject?.name || ""
      : getImprovedStudentDisplayText(studentNames);

  const extraStudentCount = (() => {
    if (!isStudentModeActive) return 0;
    const allStudentIds = (session.enrollmentIds ?? []).flatMap((eid) => {
      const enrollment = enrollments.find((e) => e.id === eid);
      return enrollment ? [enrollment.studentId] : [];
    });
    const selectedInSession = allStudentIds.filter((id) => selectedStudentIds.includes(id));
    // Only show +N badge if at least one selected student is in this session
    if (selectedInSession.length === 0) return 0;
    return allStudentIds.length - selectedInSession.length;
  })();

  return (
    <div
      style={wrapperStyle}
      data-testid={`session-block-${session.id}`}
      data-session-id={session.id}
      data-starts-at={session.startsAt}
      data-ends-at={session.endsAt}
      data-status={sessionStatus}
      aria-label={ariaLabel}
    >
      <button
        type="button"
        draggable={!isMobile && !isReadOnly}
        onDragStart={!isMobile && !isReadOnly ? handleDragStart : undefined}
        onDragEnd={!isMobile && !isReadOnly ? handleDragEnd : undefined}
        style={buttonStyle}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={[
          "session-block",
          "hover:-translate-y-0.5 hover:shadow-md transition-all duration-150",
          cursorClassName,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {/* 충돌 경고 아이콘 */}
        {hasConflict && (
          <span
            className="absolute top-0.5 right-1 text-[10px] text-[#EF4444] leading-none"
            aria-label="시간 충돌"
          >
            ⚠
          </span>
        )}

        <div className="flex flex-col w-full h-full justify-center overflow-hidden px-1.5 py-0.5 text-left">
          <div className="font-semibold truncate text-[11px] leading-tight">
            {primaryLabel}
          </div>
          <div className="text-[10px] opacity-75 truncate leading-tight">
            {session.startsAt}-{session.endsAt}
          </div>
          {secondaryLabel && (
            <div className="text-[10px] opacity-80 truncate leading-tight">
              {secondaryLabel}
            </div>
          )}
        </div>
      </button>

      {extraStudentCount > 0 && (
        <span
          className="absolute top-0.5 right-0.5 text-[9px] font-bold text-white/80 bg-black/25 rounded-full px-1 leading-4 pointer-events-none"
          aria-label={`외 ${extraStudentCount}명`}
        >
          +{extraStudentCount}
        </span>
      )}

      {/* 롱프레스 컨텍스트 메뉴 */}
      {contextMenuOpen && !isReadOnly && (
        <>
          {/* 백드롭 — 외부 클릭 시 메뉴 닫기 */}
          <div
            className="fixed inset-0 z-[200]"
            onClick={() => setContextMenuOpen(false)}
            aria-hidden="true"
          />
          {/* 컨텍스트 메뉴 — wrapper div 기준 top-full left-0 */}
          <div
            role="menu"
            aria-label="세션 옵션"
            className="absolute top-full left-0 z-[201] min-w-[120px] rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] py-1 shadow-lg"
          >
            <button
              type="button"
              role="menuitem"
              className="w-full px-4 py-2 text-left text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)] active:bg-[var(--color-bg-secondary)]"
              onClick={handleContextMenuEdit}
            >
              편집
            </button>
            <button
              type="button"
              role="menuitem"
              className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-[var(--color-bg-secondary)] active:bg-[var(--color-bg-secondary)]"
              onClick={handleContextMenuDelete}
            >
              삭제
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default React.memo(SessionBlock);
