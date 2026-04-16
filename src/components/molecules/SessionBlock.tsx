import React from "react";
import { logger } from "../../lib/logger";
import { useSessionStatus } from "../../hooks/useSessionStatus";
import {
  type ColorByMode,
  getGroupStudentNames,
  getSessionBlockStyles,
  getSessionSubject,
  resolveSessionColor,
} from "./SessionBlock.utils";

// 🆕 다이나믹 글자크기 함수 - 학생이름 4글자 기준으로 최적화
const getDynamicFontSize = (studentCount: number): string => {
  // 학생이름이 모두 4글자라고 가정하고 계산
  // 세션 셀 가로길이 약 72px (80px - 8px 패딩) 기준

  if (studentCount <= 3) return "14px"; // 3명까지: 14px
  if (studentCount <= 4) return "12px"; // 4명: 12px
  if (studentCount <= 5) return "9px"; // 5명: 약 45px (충분)
  if (studentCount <= 6) return "8px"; // 6명: 약 48px (충분)
  return "8px"; // 가독성 보장: 8px 미만 폰트는 밀집된 셀에서도 판독 불가 (Phase 3에서 레이아웃 개선 예정)
};

// 🆕 학생이름 표시 로직 개선 - 더 많은 학생 표시 가능
const getImprovedStudentDisplayText = (studentNames: string[]): string => {
  // 학생이름이 모두 4글자라고 가정하고 세션 셀 너비에 맞춰 최대한 표시
  if (studentNames.length <= 8) {
    return studentNames.join(", ");
  }
  return `${studentNames.slice(0, 8).join(", ")} 외 ${
    studentNames.length - 8
  }명`;
};

// 로컬 타입 정의 (SessionBlock.utils.ts와 동일)
type Session = {
  id: string;
  enrollmentIds?: string[];
  weekday: number;
  startsAt: string;
  endsAt: string;
  room?: string;
  teacherId?: string;
};

type Subject = {
  id: string;
  name: string;
  color: string;
};

interface SessionBlockProps {
  session: Session;
  subjects: Subject[];
  enrollments: Array<{ id: string; studentId: string; subjectId: string }>;
  students: Array<{ id: string; name: string }>;
  teachers?: Array<{ id: string; name: string; color: string }>;
  colorBy?: ColorByMode;
  yPosition: number;
  left: number;
  width: number;
  yOffset: number;
  onClick: () => void;
  onDragStart?: (e: React.DragEvent, session: Session) => void; // 🆕 드래그 시작 핸들러
  onDragEnd?: (e: React.DragEvent) => void; // 🆕 드래그 종료 핸들러
  style?: React.CSSProperties;
  selectedStudentId?: string; // 🆕 선택된 학생 ID 추가
  // 🆕 드래그 상태 props
  isDragging?: boolean; // 드래그 중인지 여부
  draggedSessionId?: string; // 드래그된 세션 ID
  isAnyDragging?: boolean; // 🆕 전역 드래그 상태 (학생 드래그와 세션 드래그 모두 포함)
  hasConflict?: boolean; // 시간 충돌 여부
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
  yPosition,
  left,
  width,
  yOffset,
  onClick,
  onDragStart, // 🆕 드래그 시작 핸들러
  onDragEnd, // 🆕 드래그 종료 핸들러
  selectedStudentId, // 🆕 선택된 학생 ID 추가
  isDragging = false, // 🆕 드래그 상태
  draggedSessionId, // 🆕 드래그된 세션 ID
  isAnyDragging = false, // 🆕 전역 드래그 상태 추가
  hasConflict = false,
}: SessionBlockProps) {
  // 세션 진행 상태 계산 (upcoming / in-progress / completed)
  // Hook must be called before any early return (Rules of Hooks).
  // session is validated below — we use fallback values when session is null.
  const sessionStatus = useSessionStatus(
    session?.startsAt ?? "00:00",
    session?.endsAt ?? "00:00",
    session?.weekday ?? -1
  );

  // null/undefined 안전 처리
  if (!session) {
    return null;
  }

  // 🆕 과목과 학생 정보 가져오기
  const subject = getSessionSubject(session, enrollments || [], subjects || []);
  const studentNames = getGroupStudentNames(
    session,
    enrollments || [],
    students || [],
    selectedStudentId
  );

  // 🆕 colorBy에 따라 블록 색상 결정
  const blockColor = resolveSessionColor(
    session,
    colorBy,
    enrollments || [],
    subjects || [],
    students || [],
    teachers
  );

  // 🆕 강사 정보
  const teacher = teachers.find((t) => t.id === session.teacherId);

  // 🆕 디버깅 정보 추가
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
    isDragging, // 🆕 드래그 상태 전달
    session.id === draggedSessionId, // 🆕 현재 세션이 드래그된 세션인지
    isAnyDragging // 🆕 전역 드래그 상태 전달
  );

  const handleClick = (e: React.MouseEvent) => {
    logger.info("🖱️ SessionBlock clicked!", {
      sessionId: session.id,
      subjectName: subject?.name,
      studentNames,
      startsAt: session.startsAt,
      endsAt: session.endsAt,
      left,
      width,
      yOffset,
    });
    e.stopPropagation(); // 이벤트 버블링 방지
    if (onClick) {
      onClick();
    }
  };

  // 🆕 드래그 시작 핸들러
  const handleDragStart = (e: React.DragEvent) => {
    // 드래그 데이터 설정
    try {
      e.dataTransfer.setData("text/plain", `session:${session.id}`);
      e.dataTransfer.effectAllowed = "move";
      logger.info("✅ 드래그 데이터 설정 완료", { sessionId: session.id });
    } catch (error) {
      logger.error("❌ 드래그 데이터 설정 실패:", undefined, error as Error);
    }

    // 드래그 이미지 설정 (선택사항)
    e.dataTransfer.setDragImage(e.currentTarget, 0, 0);

    // 부모 컴포넌트에 드래그 시작 알림
    if (onDragStart) {
      onDragStart(e, session);
    }
  };

  // 🆕 드래그 종료 핸들러
  const handleDragEnd = (e: React.DragEvent) => {
    logger.info("🔄 SessionBlock 드래그 종료", {
      sessionId: session.id,
      dropEffect: e.dataTransfer.dropEffect,
    });

    // 부모 컴포넌트에 드래그 종료 알림
    if (onDragEnd) {
      onDragEnd(e);
    }
  };

  // 🆕 드래그 중인 세션인지 확인
  const isDraggedSession = session.id === draggedSessionId;

  const weekdayLabel =
    ["월", "화", "수", "목", "금", "토", "일"][session.weekday] ?? "";
  const ariaLabel = [
    studentNames.length > 0 ? studentNames.join(", ") : "학생 없음",
    subject?.name ?? "과목 없음",
    weekdayLabel,
    `${session.startsAt}–${session.endsAt}`,
  ].join(" ");

  // 상태 레이어 Tailwind 클래스 계산 (drag 중에는 dimming/glow 비활성화)
  const statusClassName = (() => {
    if (isAnyDragging || isDragging) return "";
    if (sessionStatus === "completed") return "opacity-[0.55]";
    if (sessionStatus === "in-progress")
      return "ring-1 ring-amber-400/50 shadow-[0_0_8px_rgba(251,191,36,0.35)]";
    return "";
  })();

  // 충돌 상태 클래스 (충돌: 빨간 왼쪽 테두리 / 정상: 투명 왼쪽 테두리 유지)
  const conflictClassName = hasConflict ? "border-l-[3px] border-l-[#EF4444]" : "";

  // 커서 클래스 (드래그 중 세션: grabbing / 그 외: move)
  const cursorClassName =
    isDragging && isDraggedSession ? "cursor-grabbing" : "cursor-move";

  return (
    <button
      type="button"
      style={styles}
      aria-label={ariaLabel}
      onClick={handleClick}
      draggable={true} // 드래그 가능하도록 설정
      onDragStart={handleDragStart} // 드래그 시작 이벤트
      onDragEnd={handleDragEnd} // 드래그 종료 이벤트
      data-testid={`session-block-${session.id}`}
      data-session-id={session.id}
      data-starts-at={session.startsAt}
      data-ends-at={session.endsAt}
      data-status={sessionStatus}
      className={[
        "session-block", // focus-visible ring defined in globals.css
        "hover:-translate-y-0.5 hover:shadow-lg transition-all duration-150", // hover elevation
        statusClassName,
        conflictClassName,
        cursorClassName,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* 진행 중 배지 */}
      {sessionStatus === "in-progress" && !hasConflict && (
        <span
          className="absolute top-0.5 right-0.5 rounded-sm px-1 font-semibold leading-tight"
          style={{
            background: "#FBBF24",
            color: "#1a1a1a",
            fontSize: "8px",
          }}
          aria-label="진행 중"
        >
          진행중
        </span>
      )}

      {/* 충돌 경고 아이콘 */}
      {hasConflict && (
        <span
          className="absolute top-0.5 right-0.5"
          style={{ fontSize: "10px", color: "#EF4444", lineHeight: 1 }}
          aria-label="시간 충돌"
        >
          ⚠️
        </span>
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          padding: "4px",
          justifyContent: "space-between", // 🆕 상하 공간 분배
        }}
      >
        {/* 첫 번째 줄: 주요 레이블(왼쪽) + 시간(오른쪽) */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            height: "15px",
            overflow: "hidden",
          }}
        >
          {/* Top-left: colorBy에 따라 과목명 | 학생명 | 강사명 */}
          <span
            style={{
              color: "white",
              fontWeight: "600",
              fontSize: "13px",
              textAlign: "left",
              letterSpacing: "-0.5px",
              lineHeight: "1.1",
              flex: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {colorBy === "student"
              ? studentNames[0] || "학생 없음"
              : colorBy === "teacher"
                ? teacher?.name || "강사 없음"
                : subject?.name || "과목 없음"}
          </span>

          {/* 시간 - 오른쪽 */}
          <span
            style={{
              color: "rgba(255, 255, 255, 0.8)",
              fontSize: "11px",
              textAlign: "right",
              letterSpacing: "-0.2px",
              lineHeight: "1.1",
              marginLeft: "4px",
              flexShrink: 0,
            }}
          >
            {session.startsAt}-{session.endsAt}
          </span>
        </div>

        {/* 두 번째 줄: Bottom-right - colorBy에 따라 학생명 | 과목명 | 학생명 */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "flex-end",
            height: "14px",
            overflow: "hidden",
          }}
        >
          <span
            style={{
              color: "rgba(255, 255, 255, 0.9)",
              fontSize: getDynamicFontSize(studentNames.length),
              textAlign: "right",
              letterSpacing: "-0.3px",
              lineHeight: "1.1",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {colorBy === "student"
              ? subject?.name || ""
              : getImprovedStudentDisplayText(studentNames)}
          </span>
        </div>
      </div>
    </button>
  );
}

export default React.memo(SessionBlock);
