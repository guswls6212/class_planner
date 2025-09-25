import React from "react";
import { logger } from "../../lib/logger";
import {
  getGroupStudentNames,
  getSessionBlockStyles,
  getSessionSubject,
} from "./SessionBlock.utils";

// 🆕 다이나믹 글자크기 함수 - 학생이름 4글자 기준으로 최적화
const getDynamicFontSize = (studentCount: number): string => {
  // 학생이름이 모두 4글자라고 가정하고 계산
  // 세션 셀 가로길이 약 72px (80px - 8px 패딩) 기준

  if (studentCount <= 3) return "14px"; // 3명까지: 14px
  if (studentCount <= 4) return "12px"; // 4명: 12px
  if (studentCount <= 5) return "9px"; // 5명: 약 45px (충분)
  if (studentCount <= 6) return "8px"; // 6명: 약 48px (충분)
  if (studentCount <= 7) return "7px"; // 7명: 약 49px (충분)
  if (studentCount <= 8) return "6px"; // 8명: 약 48px (충분)
  return "5px"; // 9명 이상: 더 작은 글자로 최대한 표시
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
}: SessionBlockProps) {
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

  // 🆕 디버깅 정보 추가
  if (!subject) {
    console.warn("🔍 SessionBlock 렌더링: 과목 정보 없음", {
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
    subject?.color,
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
    const actualYPosition = yPosition || 1; // 기본값 1 설정

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

  return (
    <div
      style={{
        ...styles,
        cursor: "move", // 🆕 드래그 가능함을 나타내는 커서
        // 🆕 드래그 중인 세션에 직접 투명도 적용
        ...(isDragging &&
          isDraggedSession && {
            opacity: 0.5,
          }),
      }}
      onClick={handleClick}
      draggable={true} // 🆕 드래그 가능하도록 설정
      onDragStart={handleDragStart} // 🆕 드래그 시작 이벤트
      onDragEnd={handleDragEnd} // 🆕 드래그 종료 이벤트
      data-testid={`session-block-${session.id}`}
      data-session-id={session.id}
      data-starts-at={session.startsAt}
      data-ends-at={session.endsAt}
      className="session-block"
    >
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
        {/* 첫 번째 줄: 과목명(왼쪽) + 시간(오른쪽) */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            height: "15px",
            overflow: "hidden",
          }}
        >
          {/* 과목명 - 왼쪽 */}
          <span
            style={{
              color: "#fff",
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
            {subject?.name || "과목 없음"}
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

        {/* 두 번째 줄: 학생명 - 오른쪽 아래 */}
        {studentNames.length > 0 && (
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
              {getImprovedStudentDisplayText(studentNames)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default React.memo(SessionBlock);
