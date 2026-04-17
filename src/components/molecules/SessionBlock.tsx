import React, { useCallback, useRef, useState } from "react";
import { logger } from "../../lib/logger";
import { useSessionStatus } from "../../hooks/useSessionStatus";
import SubjectChip from "@/components/common/SubjectChip";
import type { Session, Subject } from "@/lib/planner";
import {
  type ColorByMode,
  getGroupStudentNames,
  getImprovedStudentDisplayText,
  getSessionBlockStyles,
  getSessionSubject,
  resolveSessionColor,
} from "./SessionBlock.utils";

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
    teachers
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
    isAnyDragging
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

  const isFiltered =
    selectedStudentIds != null &&
    selectedStudentIds.length > 0 &&
    !(session.enrollmentIds ?? []).some((eid) => {
      const enrollment = enrollments.find((e) => e.id === eid);
      return enrollment != null && selectedStudentIds.includes(enrollment.studentId);
    });

  const weekdayLabel =
    ["월", "화", "수", "목", "금", "토", "일"][session.weekday] ?? "";
  const ariaLabel = [
    studentNames.length > 0 ? studentNames.join(", ") : "학생 없음",
    subject?.name ?? "과목 없음",
    weekdayLabel,
    `${session.startsAt}–${session.endsAt}`,
  ].join(" ");

  // 상태 레이어 Tailwind 클래스 계산
  const statusClassName = (() => {
    if (isAnyDragging || isDragging) return "";
    if (sessionStatus === "completed") return "opacity-[0.55]";
    if (sessionStatus === "in-progress")
      return "ring-1 ring-amber-400/50 shadow-[0_0_8px_rgba(251,191,36,0.35)]";
    return "";
  })();

  // 충돌 상태 클래스
  const conflictClassName = hasConflict
    ? "border-l-[3px] border-l-[#EF4444]"
    : "";

  // 커서 클래스
  const cursorClassName =
    isDragging && isDraggedSession ? "cursor-grabbing" : "cursor-move";

  const wrapperStyle: React.CSSProperties = {
    position: "absolute",
    left: styles.left,
    top: styles.top,
    width: styles.width,
    height: styles.height,
    zIndex: styles.zIndex,
  };

  const buttonStyle: React.CSSProperties = {
    background: styles.background,
    color: styles.color,
    borderRadius: styles.borderRadius,
    padding: styles.padding,
    fontSize: styles.fontSize,
    display: styles.display,
    alignItems: styles.alignItems,
    overflow: styles.overflow,
    border: styles.border,
    cursor: styles.cursor,
    pointerEvents: styles.pointerEvents,
    opacity: styles.opacity,
    visibility: styles.visibility as React.CSSProperties["visibility"],
    transition: styles.transition,
    width: "100%",
    height: "100%",
    position: "relative",
  };

  // SubjectChip label — primary label based on colorBy
  const primaryLabel =
    colorBy === "student"
      ? studentNames[0] || "학생 없음"
      : colorBy === "teacher"
        ? teacher?.name || "강사 없음"
        : subject?.name || "과목 없음";

  // SubjectChip subLabel — secondary info based on colorBy
  const secondaryLabel =
    colorBy === "student"
      ? subject?.name || ""
      : getImprovedStudentDisplayText(studentNames);

  // SubjectChip badge — in-progress glow indicator dot
  const statusBadge =
    sessionStatus === "in-progress" && !hasConflict ? (
      <span
        className="w-1.5 h-1.5 rounded-full bg-white/80 shadow animate-pulse flex-shrink-0"
        aria-label="진행 중"
      />
    ) : undefined;

  const extraStudentCount = (() => {
    if (colorBy !== "student" || !selectedStudentIds || selectedStudentIds.length === 0) return 0;
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
      draggable={!isMobile && !isReadOnly}
      onDragStart={!isMobile && !isReadOnly ? handleDragStart : undefined}
      onDragEnd={!isMobile && !isReadOnly ? handleDragEnd : undefined}
      className={isFiltered ? "opacity-30" : ""}
    >
      <button
        type="button"
        style={buttonStyle}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={[
          "session-block",
          "hover:-translate-y-0.5 hover:shadow-lg transition-all duration-150",
          statusClassName,
          conflictClassName,
          cursorClassName,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {/* 충돌 경고 아이콘 */}
        {hasConflict && (
          <span
            className="absolute top-0.5 right-0.5 text-[10px] text-red-500 leading-none"
            aria-label="시간 충돌"
          >
            ⚠️
          </span>
        )}

        {/* SubjectChip — visual primitive for label/color rendering */}
        <div className="flex flex-col w-full h-full justify-between overflow-hidden p-0">
          <SubjectChip
            label={primaryLabel}
            color={blockColor}
            variant="fill"
            size="sm"
            subLabel={`${session.startsAt}-${session.endsAt}`}
            badge={statusBadge}
            className="!flex-col w-full h-full justify-center !items-start !rounded-[6px] overflow-hidden"
          />
          {secondaryLabel && (
            <div className="text-white/90 text-right text-[12px] tracking-[-0.3px] leading-[1.1] overflow-hidden text-ellipsis whitespace-nowrap px-1 pb-0.5">
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
