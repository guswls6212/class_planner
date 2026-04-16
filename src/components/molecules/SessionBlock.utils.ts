import { SESSION_CELL_HEIGHT } from "@/shared/constants/sessionConstants";
import type { CSSProperties } from "react";

// 타입을 직접 정의하여 import 의존성 제거
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
  color: string | undefined; // 🆕 planner.ts와 일치하도록 수정
};

// 🆕 여러 학생의 이름을 표시하는 함수
export const getGroupStudentNames = (
  session: Session,
  enrollments: Array<{ id: string; studentId: string; subjectId: string }>,
  students: Array<{ id: string; name: string }>,
  selectedStudentId?: string // 🆕 선택된 학생 ID 추가
): string[] => {
  // enrollmentIds가 undefined이거나 비어있는 경우 처리
  if (!session.enrollmentIds || session.enrollmentIds.length === 0) {
    return [];
  }

  // 🆕 필터링된 상태에서는 선택된 학생의 이름만 반환
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

// 🆕 그룹 학생 이름을 표시하는 함수 (최대 3명까지 표시)
export const getGroupStudentDisplayText = (studentNames: string[]): string => {
  if (studentNames.length === 0) return "";
  if (studentNames.length === 1) return studentNames[0];
  if (studentNames.length === 2) return studentNames.join(", ");
  if (studentNames.length === 3) return studentNames.join(", ");
  // 4명 이상인 경우: 첫 3명 + 외 N명
  return `${studentNames.slice(0, 3).join(", ")} 외 ${
    studentNames.length - 3
  }명`;
};

// 학생이름 표시 로직 — 최대 8명까지 표시, 초과 시 '외 N명'
export const getImprovedStudentDisplayText = (studentNames: string[]): string => {
  if (studentNames.length <= 8) {
    return studentNames.join(", ");
  }
  return `${studentNames.slice(0, 8).join(", ")} 외 ${
    studentNames.length - 8
  }명`;
};

// 🆕 세션 셀 높이를 동적으로 조정하는 스타일
export const getSessionBlockStyles = (
  left: number,
  width: number,
  yOffset: number,
  subjectColor?: string,
  isDragging?: boolean, // 🆕 드래그 상태
  isDraggedSession?: boolean, // 🆕 현재 세션이 드래그된 세션인지
  isAnyDragging?: boolean // 🆕 전역 드래그 상태 (학생 드래그와 세션 드래그 모두 포함)
): CSSProperties => {
  // 🆕 투명도 및 pointer-events 계산 로직
  let opacity = 1.0; // 기본 투명도
  let visibility: "visible" | "hidden" = "visible"; // 기본 표시
  let pointerEvents: CSSProperties["pointerEvents"] = "auto"; // 기본값

  // 🆕 전역 드래그 상태 (학생 드래그 또는 세션 드래그) 처리
  if (isAnyDragging) {
    if (isDraggedSession) {
      // 드래그된 세션: 보이지 않게 하지만 공간은 유지 (드래그 이벤트는 정상 처리)
      opacity = 0;
      visibility = "hidden";
      pointerEvents = "auto"; // 드래그 이벤트는 받음
    } else {
      // 다른 세션들: 투명하게 (0.3) + 마우스 이벤트 통과
      opacity = 0.3;
      pointerEvents = "none"; // 🆕 마우스 이벤트를 하위 DropZone으로 통과
    }
  } else if (isDragging) {
    // 기존 세션 드래그 로직 (호환성 유지)
    if (isDraggedSession) {
      opacity = 0;
      visibility = "hidden";
      pointerEvents = "auto"; // 드래그 이벤트는 받음
    } else {
      opacity = 0.3;
      pointerEvents = "none"; // 마우스 이벤트를 하위 DropZone으로 통과
    }
  }

  return {
    position: "absolute",
    left,
    top: yOffset + 1, // 🆕 요일 경계선과 겹치지 않도록 1px 여백 추가
    height: `${SESSION_CELL_HEIGHT}px`, // 🆕 과목 이름이 잘리지 않도록 높이 증가
    width,
    background: subjectColor ?? "#888",
    color: "#fff",
    borderRadius: 4,
    padding: "0px", // 🆕 padding을 완전히 제거
    fontSize: 12,
    display: "flex", // 항상 flex로 유지
    alignItems: "center",
    overflow: "hidden",
    zIndex: isDragging && !isDraggedSession ? 0 : 100 + yOffset, // 🆕 footer(z-index: 1000)보다 낮게 설정
    border: "1px solid rgba(255,255,255,0.2)",
    cursor: "pointer",
    opacity, // 🆕 투명도 적용
    visibility, // 🆕 드래그 중인 세션은 숨김
    pointerEvents, // 🆕 pointer-events 적용
    transition: "opacity 0.2s ease-in-out, visibility 0.2s ease-in-out", // 🆕 부드러운 투명도 및 표시 전환
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
