import React, { useCallback, useRef, useState } from "react";
import { Users } from "lucide-react";
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
import { hexToRgba } from "@/lib/colors/hexToRgba";
import { tintFromHex } from "@/lib/colors/tintFromHex";
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
  yPosition?: number;
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
  yPosition = 1,
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
  const cardRef = useRef<HTMLButtonElement>(null);

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
    selectedStudentIds
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
    yPosition,
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
      // 2C: drag image = whole card (cardRef), not the grip handle element
      const imageEl: HTMLElement = cardRef.current ?? (e.currentTarget as HTMLElement);
      e.dataTransfer.setDragImage(imageEl, 0, 0);
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

  const isDragActive = isAnyDragging || isDragging;

  let dimGlowStyle: React.CSSProperties = {};
  if (isStudentModeActive && !isDragActive) {
    if (sessionContainsSelectedStudent) {
      // Color from first chip — multi-chip selection uses first selected student's color
      const hex = getStudentDeterministicColor(selectedStudentIds![0]);
      dimGlowStyle = {
        boxShadow: `0 0 0 1.5px ${hexToRgba(hex, 0.55)}, 0 1px 2px rgba(0,0,0,0.3)`,
      };
    } else {
      // Combined with completed session's 0.55 inner opacity this results in ~0.14 total
      // visual opacity — intentional: completed non-matching sessions fade further.
      dimGlowStyle = { opacity: 0.25 };
    }
  }

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

  // Gradient background for session button
  const buttonBg = (() => {
    const isValidHex6 = /^#[0-9a-fA-F]{6}$/.test(tone.bg);
    if (!isValidHex6) return tone.bg;
    return `linear-gradient(180deg, ${tintFromHex(tone.bg, 0.08)} 0%, ${tone.bg} 100%)`;
  })();

  const buttonStyle: React.CSSProperties = {
    background: buttonBg,
    color: tone.fg,
    borderRadius: 4,
    borderLeft: accentColor
      ? `3px solid ${accentColor}`
      : /^#[0-9a-fA-F]{6}$/.test(tone.bg) ? "3px solid rgba(0,0,0,0.2)" : undefined,
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

  const totalStudentCount = (() => {
    if (!isStudentModeActive || !selectedStudentIds?.length) return 0;
    const allStudentIds = (session.enrollmentIds ?? []).flatMap((eid) => {
      const enrollment = enrollments.find((e) => e.id === eid);
      return enrollment ? [enrollment.studentId] : [];
    });
    // 게이트: 선택된 학생이 이 세션에 없으면 표시 안 함 (비매칭 dim 블록)
    const hasSelectedInSession = allStudentIds.some((id) =>
      selectedStudentIds.includes(id)
    );
    if (!hasSelectedInSession) return 0;
    return allStudentIds.length;
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
        ref={cardRef}
        type="button"
        style={buttonStyle}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={[
          "session-block group",
          "hover:-translate-y-0.5 hover:shadow-md hover:ring-1 hover:ring-white/30 transition-all duration-150",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {/* 2C: 드래그 핸들 — grip 영역만 draggable. 카드 전체 클릭(=모달)과 분리. */}
        {!isMobile && !isReadOnly && (
          <div
            draggable={true}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onClick={(e) => e.stopPropagation()}
            data-testid="session-drag-handle"
            className="absolute top-1 left-0.5 z-[2] flex flex-col gap-[2px] p-0.5 rounded opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
            aria-label="드래그하여 이동"
          >
            {/* 6-dot grip icon */}
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex gap-[2px]">
                {[0, 1].map((col) => (
                  <div key={col} className="w-[3px] h-[3px] rounded-full bg-current opacity-80" />
                ))}
              </div>
            ))}
          </div>
        )}

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
          <div className="font-semibold truncate text-[13px] leading-tight">
            {primaryLabel}
          </div>
          <div className="text-[10px] opacity-75 truncate leading-tight [font-feature-settings:'tnum']">
            {session.startsAt}-{session.endsAt}
          </div>
          {secondaryLabel && (
            <div className="text-[10px] opacity-[0.85] truncate leading-tight">
              {secondaryLabel}
            </div>
          )}
        </div>
      </button>

      {totalStudentCount >= 2 && (
        <span
          className="absolute top-1 right-1 inline-flex items-center gap-0.5 rounded-md session-overlay-pill backdrop-blur-sm px-1 py-px text-[10px] font-semibold text-white pointer-events-none"
          aria-label={`총 ${totalStudentCount}명`}
        >
          <Users className="h-2.5 w-2.5" strokeWidth={2.5} aria-hidden="true" />
          {totalStudentCount}
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
