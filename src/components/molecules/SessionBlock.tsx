import React, { useCallback, useMemo, useRef, useState } from "react";
import { Users } from "lucide-react";
import { useDraggable } from "@dnd-kit/core";
import { logger } from "../../lib/logger";
import { useSessionStatus } from "../../hooks/useSessionStatus";
import type { Session, Subject } from "@/lib/planner";
import {
  type ColorByMode,
  getGroupStudentNames,
  getImprovedStudentDisplayText,
  getSessionBlockStyles,
  getSessionSubject,
  resolveSessionColor,
  sessionMatchesFilters,
} from "./SessionBlock.utils";
import { tintFromHex } from "@/lib/colors/tintFromHex";
import { resolveSessionTone } from "./SessionCard.utils";

/**
 * 세션 블록 표시 모드.
 * - "edit": 기본. 모든 기능 + drag + cursor:pointer.
 * - "share": 공유 view. cursor:default + 시간 HH:MM. 학생 정보/사람 chip 유지 (강사 공유 등).
 * - "filtered-share": 학생 본인 공유 (filter_student_id 있음). share + 학생 이름/사람 chip 제거 + 강사 이름 chip 표시.
 */
export type PresentationMode = "edit" | "share" | "filtered-share";

function formatSessionTime(time: string, shorten: boolean): string {
  if (!shorten) return time;
  // "HH:MM:SS" -> "HH:MM". 더 짧은 형식은 그대로 (이미 정상).
  return time.length >= 5 ? time.slice(0, 5) : time;
}

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
  /** 평클릭 핸들러. modifier(Shift/Ctrl/Meta) 클릭은 onSelectToggle로 분기됨. */
  onClick: () => void;
  selectedStudentIds?: string[];
  /** 과목 필터 — 학생과 AND 결합 + 매칭 시 ring glow / 비매칭 시 dim. */
  selectedSubjectIds?: string[];
  /** 강사 필터 — 위와 동일 패턴. session.teacherId로 매칭. */
  selectedTeacherIds?: string[];
  isMobile?: boolean;
  isDragging?: boolean;
  draggedSessionId?: string;
  isAnyDragging?: boolean;
  /**
   * Ctrl/Meta+drag 복사 모드 — true이면 dragged session 원본을 흐리게 하지 않음
   * (사용자 멘탈 모델: "원본은 그대로, preview만 위치 표시"). 일반 이동은 false.
   */
  isCopyMode?: boolean;
  /** 시간 범위 lower bound를 넘어 위쪽으로 잘린 세션 — 상단에 그라데이션 cap 표시 */
  overflowsTop?: boolean;
  /** 시간 범위 upper bound를 넘어 아래쪽으로 잘린 세션 — 하단에 그라데이션 cap 표시 */
  overflowsBottom?: boolean;
  /**
   * 같은 row에 lane overflow `+N` chip(TimeTableRow가 z-index:115로 그림)이 표시되고
   * 이 세션이 마지막 visible lane(yPosition===effectiveLanes)에 있어 chip과 우상단이
   * 시각 충돌하는 경우 true. 학생수 배지를 시간 라인 inline으로 자동 이동.
   */
  hasLaneOverflowChip?: boolean;
  hasConflict?: boolean;
  onDelete?: () => void;
  isReadOnly?: boolean;
  /** 다중 선택 상태 — true이면 amber outline + ✓ 체크마크 */
  selected?: boolean;
  /** Shift/Ctrl/Meta + click 시 호출. undefined이면 modifier click도 onClick으로 fall through. */
  onSelectToggle?: () => void;
  /**
   * 모바일 long-press 메뉴 확장 — "이 세션 복사" 항목.
   * 데스크톱은 Ctrl/Meta+drag로 충분. 모바일은 modifier 키 없으므로 menu에서.
   */
  onContextMenuCopy?: () => void;
  /**
   * 모바일 long-press 메뉴 확장 — "선택 시작" 항목.
   * 모드 진입 + 이 세션이 즉시 selected 상태로.
   */
  onContextMenuStartSelect?: () => void;
  /**
   * 표시 모드 — share view에서 학생 정보/cursor/시간 format 분기.
   * Default "edit" (기존 동작 그대로).
   */
  presentationMode?: PresentationMode;
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
  selectedStudentIds,
  selectedSubjectIds,
  selectedTeacherIds,
  isMobile = false,
  isDragging = false,
  draggedSessionId,
  isAnyDragging = false,
  isCopyMode = false,
  overflowsTop = false,
  overflowsBottom = false,
  hasLaneOverflowChip = false,
  hasConflict = false,
  onDelete,
  isReadOnly = false,
  selected = false,
  onSelectToggle,
  onContextMenuCopy,
  onContextMenuStartSelect,
  presentationMode = "edit",
}: SessionBlockProps) {
  const isShareView = presentationMode !== "edit";
  const isFilteredShare = presentationMode === "filtered-share";
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchMovedRef = useRef(false);

  const isShareViewEarly = presentationMode !== "edit";
  const { attributes, listeners, setNodeRef: setDragRef } = useDraggable({
    id: session?.id ?? "__null__",
    disabled: isReadOnly || isShareViewEarly || !session,
    data: { session },
  });

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

  // 과목과 학생 정보 가져오기 — props 변경 시만 재계산 (drag jitter 핫패스)
  const subject = useMemo(
    () => getSessionSubject(session, enrollments || [], subjects || []),
    [session, enrollments, subjects],
  );
  const studentNames = useMemo(
    () =>
      getGroupStudentNames(
        session,
        enrollments || [],
        students || [],
        selectedStudentIds,
      ),
    [session, enrollments, students, selectedStudentIds],
  );

  // colorBy에 따라 블록 색상 결정
  const blockColor = useMemo(
    () =>
      resolveSessionColor(
        session,
        colorBy,
        enrollments || [],
        subjects || [],
        students || [],
        teachers,
        selectedStudentIds,
      ),
    [session, colorBy, enrollments, subjects, students, teachers, selectedStudentIds],
  );

  // 강사 정보
  const teacher = useMemo(
    () => teachers.find((t) => t.id === session.teacherId),
    [teachers, session.teacherId],
  );

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
    height,
    isCopyMode,
  );

  // 롱프레스 핸들러 (300ms 터치 홀드 → 컨텍스트 메뉴)
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (isReadOnly || isShareViewEarly) return;
      touchMovedRef.current = false;
      longPressTimerRef.current = setTimeout(() => {
        if (!touchMovedRef.current) {
          e.preventDefault();
          setContextMenuOpen(true);
        }
      }, 300);
    },
    [isReadOnly, isShareViewEarly]
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
    e.stopPropagation();
    if (isReadOnly || isShareViewEarly) return;
    // Shift/Ctrl/Cmd + click → 다중 선택 toggle (Edit modal 안 열림)
    if ((e.shiftKey || e.ctrlKey || e.metaKey) && onSelectToggle) {
      onSelectToggle();
      return;
    }
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
    if (onClick) {
      onClick();
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

  // 3-tone 파스텔 톤 (pastel bg + dark fg + accent) — blockColor 변경 시만
  const tone = useMemo(() => resolveSessionTone(blockColor), [blockColor]);

  // 상태 레이어 (Phase 3 SSOT): 완료 = opacity 0.55. in-progress/conflict = borderLeft accent
  const isCompleted = sessionStatus === "completed" && !isAnyDragging && !isDragging;
  const isInProgress = sessionStatus === "in-progress" && !isAnyDragging && !isDragging;

  // 커서 클래스
  const cursorClassName =
    isDragging && isDraggedSession ? "cursor-grabbing" : "cursor-move";

  // ADR-020 R5: "학생" 모드 selector 폐기. label/뱃지 의미는 학생 chip 활성으로 결정.
  // (colorBy === "student" 입력은 useColorBy 가 subject 로 정규화하므로 사실상 dead path)
  const isStudentModeActive =
    (selectedStudentIds?.length ?? 0) > 0;

  // 필터 매칭 dim 일반화 — 학생/과목/강사 중 하나라도 활성이면 매칭/비매칭에 따라 opacity 대비.
  // ADR-020 R5: ring 표시 폐기 → 비매칭만 opacity 0.25 dim. 매칭은 본체 색 그대로 유지.
  const isAnyFilterActive =
    (selectedStudentIds?.length ?? 0) > 0 ||
    (selectedSubjectIds?.length ?? 0) > 0 ||
    (selectedTeacherIds?.length ?? 0) > 0;

  const sessionMatchesAllFilters =
    isAnyFilterActive &&
    sessionMatchesFilters(
      session,
      enrollments ?? [],
      selectedStudentIds ?? [],
      selectedSubjectIds ?? [],
      selectedTeacherIds ?? [],
    );

  const isDragActive = isAnyDragging || isDragging;

  // 비매칭만 dim. 매칭/필터 없음 → 본체 색 + opacity 1 그대로.
  // Combined with completed session's 0.55 inner opacity, non-matching completed sessions
  // fade to ~0.14 — intentional.
  const dimGlowStyle: React.CSSProperties =
    isAnyFilterActive && !isDragActive && !sessionMatchesAllFilters
      ? { opacity: 0.25 }
      : {};

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
    cursor: isShareView ? "default" : styles.cursor,
    pointerEvents: styles.pointerEvents,
    // ADR-020 R5 보강 (UAT 2026-05-21): 필터 매칭 session 은 completed status 의 0.55 dim 도
    // override. 사용자가 chip 으로 명시 선택한 session 은 시간 dim 없이 또렷하게 표시.
    opacity:
      isCompleted && !sessionMatchesAllFilters ? 0.55 : styles.opacity,
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

  const totalStudentCount = useMemo(() => {
    const allStudentIds = (session.enrollmentIds ?? []).flatMap((eid) => {
      const enrollment = enrollments.find((e) => e.id === eid);
      return enrollment ? [enrollment.studentId] : [];
    });
    // 학생 필터 활성 + 비매칭 세션은 dim 처리되므로 배지도 숨김(0 반환).
    // 평소(필터 비활성)에는 전체 학생 수 노출 — Variant A 항시 표시.
    if (isStudentModeActive && selectedStudentIds?.length) {
      const hasSelectedInSession = allStudentIds.some((id) =>
        selectedStudentIds.includes(id),
      );
      if (!hasSelectedInSession) return 0;
    }
    return allStudentIds.length;
  }, [isStudentModeActive, selectedStudentIds, session.enrollmentIds, enrollments]);

  // 동적 회피 — 우상단 배지가 가려질 수 있는 두 케이스에서 시간 라인 옆 inline으로 이동:
  //   1) overflowsTop: 잘려서 visible 영역 밖
  //   2) hasLaneOverflowChip: TimeTableRow의 +N chip(z-index:115)과 같은 좌표
  // hasConflict ⚠는 같은 button 내부 z-layer라 right 오프셋만으로 분리 가능.
  const showStudentBadgeInline =
    (overflowsTop || hasLaneOverflowChip) && totalStudentCount >= 2;

  return (
    <div
      ref={setDragRef}
      style={wrapperStyle}
      data-testid={`session-block-${session.id}`}
      data-session-id={session.id}
      data-starts-at={session.startsAt}
      data-ends-at={session.endsAt}
      data-status={sessionStatus}
      data-selected={selected ? "true" : undefined}
      data-overflows-top={overflowsTop ? "true" : undefined}
      data-overflows-bottom={overflowsBottom ? "true" : undefined}
      aria-label={ariaLabel}
      aria-pressed={selected ? true : undefined}
    >
      {/* Bug2 fix: setNodeRef(setDragRef)는 outer wrapper에 — dnd-kit이 전체 블록 rect를 충돌 감지에 사용.
          grip div는 listeners만 보유(activation handle). attributes는 grip에 유지(aria 접근성). */}
      <button
        type="button"
        style={buttonStyle}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={[
          "session-block group",
          "hover:-translate-y-0.5 hover:shadow-md hover:ring-1 hover:ring-white/30 transition-all duration-150",
          selected ? "ring-2 ring-amber-400 ring-offset-1 ring-offset-transparent" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {selected && (
          <span
            aria-hidden="true"
            data-testid="session-selected-check"
            className="absolute -top-1 -right-1 z-[3] flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[10px] font-bold text-amber-950 shadow-sm"
          >
            ✓
          </span>
        )}
        {/* 드래그 핸들 — listeners + attributes만. setNodeRef는 outer div에.
            share view (presentationMode !== "edit")에서도 숨김 (cursor-grab 노출 방지) */}
        {!isReadOnly && !isShareViewEarly && (
          <div
            {...attributes}
            {...listeners}
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

        {/* 시간 범위 경계 overflow 표지 — 잘린 끝에 그라데이션 cap으로 "이어짐" 시각화. */}
        {overflowsTop && (
          <span
            aria-hidden="true"
            data-testid="session-overflow-top"
            className="session-overflow-top absolute top-0 left-0 right-0 h-2 pointer-events-none rounded-t-[4px] z-[1]"
          />
        )}
        {overflowsBottom && (
          <span
            aria-hidden="true"
            data-testid="session-overflow-bottom"
            className="session-overflow-bottom absolute bottom-0 left-0 right-0 h-2 pointer-events-none rounded-b-[4px] z-[1]"
          />
        )}

        <div className="flex flex-col w-full h-full justify-center overflow-hidden px-1.5 py-0.5 text-left">
          <div className="font-semibold truncate text-[13px] leading-tight">
            {primaryLabel}
          </div>
          <div
            className={[
              "text-[10px] opacity-75 leading-tight [font-feature-settings:'tnum']",
              showStudentBadgeInline ? "flex items-center gap-1.5" : "truncate",
            ].join(" ")}
          >
            <span className={showStudentBadgeInline ? "truncate" : undefined}>
              {formatSessionTime(session.startsAt, isShareView)}-{formatSessionTime(session.endsAt, isShareView)}
            </span>
            {showStudentBadgeInline && !isFilteredShare && (
              <span
                aria-label={`총 ${totalStudentCount}명`}
                className="inline-flex flex-shrink-0 items-center gap-0.5 rounded-sm session-overlay-pill backdrop-blur-sm px-1 py-px text-[9px] font-semibold text-white"
              >
                <Users className="h-2 w-2" strokeWidth={2.5} aria-hidden="true" />
                {totalStudentCount}
              </span>
            )}
          </div>
          {secondaryLabel && !isFilteredShare && (
            <div className="text-[10px] opacity-[0.85] truncate leading-tight">
              {secondaryLabel}
            </div>
          )}
        </div>
      </button>

      {totalStudentCount >= 2 && !showStudentBadgeInline && !isFilteredShare && (
        <span
          className={[
            "absolute top-1 inline-flex items-center gap-0.5 rounded-md session-overlay-pill backdrop-blur-sm px-1 py-px text-[10px] font-semibold text-white pointer-events-none",
            hasConflict ? "right-[18px]" : "right-1",
          ].join(" ")}
          aria-label={`총 ${totalStudentCount}명`}
        >
          <Users className="h-2.5 w-2.5" strokeWidth={2.5} aria-hidden="true" />
          {totalStudentCount}
        </span>
      )}

      {/* 학생 본인 공유 (filtered-share) — 사람 chip 자리에 강사 이름 chip */}
      {isFilteredShare && teacher && (
        <span
          className={[
            "absolute top-1 inline-flex items-center rounded-md session-overlay-pill backdrop-blur-sm px-1.5 py-px text-[10px] font-semibold text-white pointer-events-none max-w-[60%] truncate",
            hasConflict ? "right-[18px]" : "right-1",
          ].join(" ")}
          aria-label={`강사: ${teacher.name}`}
        >
          {teacher.name}
        </span>
      )}

      {/* 롱프레스 컨텍스트 메뉴 */}
      {contextMenuOpen && !isReadOnly && !isShareViewEarly && (
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
            {onContextMenuCopy && (
              <button
                type="button"
                role="menuitem"
                className="w-full px-4 py-2 text-left text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)] active:bg-[var(--color-bg-secondary)]"
                onClick={(e) => {
                  e.stopPropagation();
                  setContextMenuOpen(false);
                  onContextMenuCopy();
                }}
                data-testid="session-context-copy"
              >
                복사
              </button>
            )}
            {onContextMenuStartSelect && (
              <button
                type="button"
                role="menuitem"
                className="w-full px-4 py-2 text-left text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)] active:bg-[var(--color-bg-secondary)]"
                onClick={(e) => {
                  e.stopPropagation();
                  setContextMenuOpen(false);
                  onContextMenuStartSelect();
                }}
                data-testid="session-context-select"
              >
                선택 시작
              </button>
            )}
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
