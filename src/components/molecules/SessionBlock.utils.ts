import { SESSION_CELL_HEIGHT } from "@/shared/constants/sessionConstants";
import type { CSSProperties } from "react";
import type { Session, Subject } from "@/lib/planner";

// 여러 학생의 이름을 표시하는 함수
export const getGroupStudentNames = (
  session: Session,
  enrollments: Array<{ id: string; studentId: string; subjectId: string }>,
  students: Array<{ id: string; name: string }>,
  selectedStudentId?: string
): string[] => {
  // enrollmentIds가 undefined이거나 비어있는 경우 처리
  if (!session.enrollmentIds || session.enrollmentIds.length === 0) {
    return [];
  }

  // 필터링된 상태에서는 선택된 학생의 이름만 반환
  if (selectedStudentId) {
    const selectedStudentEnrollment = session.enrollmentIds.find(
      (enrollmentId) => {
        const enrollment = enrollments?.find((e) => e.id === enrollmentId);
        return enrollment?.studentId === selectedStudentId;
      }
    );

    if (selectedStudentEnrollment) {
      const enrollment = enrollments?.find(
        (e) => e.id === selectedStudentEnrollment
      );
      const student = students?.find((s) => s.id === enrollment?.studentId);
      return student?.name ? [student.name] : [];
    }
    return [];
  }

  // 전체 학생 이름 반환 (기존 로직)
  return session.enrollmentIds
    .map((enrollmentId) => {
      const enrollment = enrollments?.find((e) => e.id === enrollmentId);
      if (!enrollment) return null;

      const student = students?.find((s) => s.id === enrollment.studentId);
      return student?.name;
    })
    .filter(Boolean) as string[];
};

// 과목 정보를 가져오는 함수 — src/lib/schedule/getSessionSubject.ts로 승격됨 (Phase 5-B)
export { getSessionSubject } from "@/lib/schedule/getSessionSubject";

// 학생이름 표시 로직 — 최대 8명까지 표시, 초과 시 '외 N명'
export const getImprovedStudentDisplayText = (studentNames: string[]): string => {
  if (studentNames.length <= 8) {
    return studentNames.join(", ");
  }
  return `${studentNames.slice(0, 8).join(", ")} 외 ${
    studentNames.length - 8
  }명`;
};

// 세션 셀 크기를 동적으로 조정하는 스타일
// B2 이전: height가 SESSION_CELL_HEIGHT 고정, width는 duration 기반
// B2 이후: height는 duration 기반 (caller 결정), width는 lane 기반
export const getSessionBlockStyles = (
  left: number,
  width: number,
  yOffset: number,
  subjectColor?: string,
  isDragging?: boolean,
  isDraggedSession?: boolean,
  isAnyDragging?: boolean,
  height?: number
): CSSProperties => {
  // 투명도 및 pointer-events 계산 로직
  let opacity = 1.0;
  let visibility: "visible" | "hidden" = "visible";
  let pointerEvents: CSSProperties["pointerEvents"] = "auto";

  // 전역 드래그 상태 (학생 드래그 또는 세션 드래그) 처리
  if (isAnyDragging) {
    if (isDraggedSession) {
      // 드래그 중인 세션: ghost처럼 반투명 표시.
      // pointer-events:none — dragstart 이후에 변경하므로 Chrome 드래그 취소 없음.
      // computeTentativeLayout이 이 블록을 target 위치로 이동시키므로
      // pointer-events:auto 상태라면 cell의 native drop을 가로채는 문제가 발생.
      opacity = 0.65;
      visibility = "visible";
      pointerEvents = "none";
    } else {
      // 다른 세션들: 완전히 보이되, pointer-events는 none (drop target인 cell에 dragover 전달)
      opacity = 1;
      pointerEvents = "none";
    }
  } else if (isDragging) {
    // 세션 드래그 전용 로직 (isAnyDragging에 학생 드래그가 포함되지 않은 경우)
    if (isDraggedSession) {
      opacity = 0.65;
      visibility = "visible";
      pointerEvents = "none";
    } else {
      opacity = 1;
      pointerEvents = "none";
    }
  }

  return {
    position: "absolute",
    left,
    top: yOffset + 1, // 경계선과 겹치지 않도록 1px 여백 추가
    height: `${height ?? SESSION_CELL_HEIGHT}px`,
    width,
    background: subjectColor ?? "#888",
    color: "#fff",
    borderRadius: 4,
    padding: "0px",
    fontSize: 12,
    display: "flex",
    alignItems: "center",
    overflow: "hidden",
    zIndex: 100 + yOffset,
    border: "1px solid rgba(255,255,255,0.2)",
    cursor: "pointer",
    opacity,
    visibility,
    pointerEvents,
    transition: "opacity 0.2s ease-in-out, visibility 0.2s ease-in-out",
  };
};

// Q Pastel 팔레트 — 학생 결정론적 색상에 사용
const Q_PASTEL_PALETTE = [
  "#f87171",
  "#fb923c",
  "#facc15",
  "#4ade80",
  "#60a5fa",
  "#a78bfa",
  "#f472b6",
  "#94a3b8",
];

// 문자열을 팔레트 인덱스로 해시
function hashStringToIndex(str: string, length: number): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % length;
}

export const getStudentDeterministicColor = (studentId: string): string => {
  return Q_PASTEL_PALETTE[hashStringToIndex(studentId, Q_PASTEL_PALETTE.length)];
};

export type ColorByMode = "subject" | "student" | "teacher";

export const resolveSessionColor = (
  session: Session,
  colorBy: ColorByMode,
  enrollments: Array<{ id: string; studentId: string; subjectId: string }>,
  subjects: Subject[],
  _students: Array<{ id: string; name: string }>,
  teachers: Array<{ id: string; name: string; color: string }>
): string => {
  const firstEnrollment = enrollments.find(
    (e) => e.id === session.enrollmentIds?.[0]
  );

  if (colorBy === "student") {
    const studentId = firstEnrollment?.studentId;
    if (studentId) return getStudentDeterministicColor(studentId);
    return "#888";
  }

  if (colorBy === "teacher") {
    const teacher = teachers.find((t) => t.id === session.teacherId);
    return teacher?.color ?? "#888";
  }

  // default: subject
  const subject = subjects.find((s) => s.id === firstEnrollment?.subjectId);
  return subject?.color ?? "#888";
};
