import React from "react";
import {
  getGroupStudentDisplayText,
  getGroupStudentNames,
  getSessionBlockStyles,
  getSessionSubject,
} from "./SessionBlock.utils";

// 로컬 타입 정의 (SessionBlock.utils.ts와 동일)
type Session = {
  id: string;
  enrollmentIds: string[];
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
  left,
  width,
  yOffset,
  onClick,
  onDragStart, // 🆕 드래그 시작 핸들러
  onDragEnd, // 🆕 드래그 종료 핸들러
  selectedStudentId, // 🆕 선택된 학생 ID 추가
  isDragging = false, // 🆕 드래그 상태
  draggedSessionId, // 🆕 드래그된 세션 ID
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
    session.id === draggedSessionId // 🆕 현재 세션이 드래그된 세션인지
  );

  const handleClick = (e: React.MouseEvent) => {
    console.log("🖱️ SessionBlock clicked!", {
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
    console.log("🔄 SessionBlock 드래그 시작:", {
      sessionId: session.id,
      subjectName: subject?.name,
      studentNames,
      startsAt: session.startsAt,
      endsAt: session.endsAt,
    });

    // 드래그 데이터 설정
    try {
      e.dataTransfer.setData("text/plain", `session:${session.id}`);
      e.dataTransfer.effectAllowed = "move";
      console.log("✅ 드래그 데이터 설정 완료:", `session:${session.id}`);
    } catch (error) {
      console.error("❌ 드래그 데이터 설정 실패:", error);
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
    console.log("🔄 SessionBlock 드래그 종료:", {
      sessionId: session.id,
      dropEffect: e.dataTransfer.dropEffect,
    });

    // 부모 컴포넌트에 드래그 종료 알림
    if (onDragEnd) {
      onDragEnd(e);
    }
  };

  return (
    <div
      style={{
        ...styles,
        cursor: "move", // 🆕 드래그 가능함을 나타내는 커서
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
          padding: "4px", // 🆕 패딩을 줄여서 내용이 잘리지 않도록
        }}
      >
        {/* 첫 번째 줄: 과목명 - 왼쪽 위 배치 */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "flex-start",
            height: "13px", // 🆕 과목 이름이 잘리지 않도록 높이 증가
            overflow: "hidden",
          }}
        >
          <span
            style={{
              color: "#fff",
              fontWeight: "600",
              fontSize: "11px",
              textAlign: "left",
              letterSpacing: "-0.5px",
              lineHeight: "1.1",
            }}
          >
            {subject?.name || "과목 없음"}
          </span>
        </div>

        {/* 두 번째 줄: 학생명 - 중간 오른쪽 정렬 */}
        {studentNames.length > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              height: "12px", // 🆕 16px에서 12px로 되돌려서 1줄로만 표시
              overflow: "hidden",
              marginTop: "1px", // 🆕 위쪽 margin 1px
              marginBottom: "1px", // 🆕 아래쪽 margin 1px 추가
            }}
          >
            <span
              style={{
                color: "rgba(255, 255, 255, 0.9)",
                fontSize: "10px",
                textAlign: "right",
                letterSpacing: "-0.3px",
                lineHeight: "1.1",
              }}
            >
              {getGroupStudentDisplayText(studentNames)}
            </span>
          </div>
        )}

        {/* 세 번째 줄: 시간 정보 - 하단 중앙 정렬 */}
        <div
          style={{
            fontSize: "9px",
            color: "rgba(255, 255, 255, 0.8)",
            marginTop: "1px", // 🆕 auto 대신 1px로 변경
            textAlign: "center",
            height: "9px", // 🆕 폰트 크기와 동일하게 설정
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            letterSpacing: "-0.2px",
            lineHeight: "1.1",
          }}
        >
          {session.startsAt} - {session.endsAt}
        </div>
      </div>
    </div>
  );
}

export default React.memo(SessionBlock);
