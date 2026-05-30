import { SESSION_CELL_HEIGHT } from "@/shared/constants/sessionConstants";
import type { CSSProperties } from "react";
import type { Session, Subject } from "@/lib/planner";

// 여러 학생의 이름을 표시하는 함수
export const getGroupStudentNames = (
  session: Session,
  enrollments: Array<{ id: string; studentId: string; subjectId: string }>,
  students: Array<{ id: string; name: string }>,
  selectedStudentIds?: string[]
): string[] => {
  if (!session.enrollmentIds || session.enrollmentIds.length === 0) {
    return [];
  }

  // 필터링된 상태: 선택된 학생들 중 이 세션에 등록된 학생의 이름만 반환
  if (selectedStudentIds && selectedStudentIds.length > 0) {
    return session.enrollmentIds
      .map((eid) => enrollments?.find((e) => e.id === eid))
      .filter(
        (e): e is NonNullable<typeof e> =>
          e != null && selectedStudentIds.includes(e.studentId)
      )
      .map((e) => students?.find((s) => s.id === e.studentId)?.name)
      .filter((n): n is string => Boolean(n));
  }

  // 전체 학생 이름 반환 (비필터 모드)
  return session.enrollmentIds
    .map((eid) => enrollments?.find((e) => e.id === eid))
    .filter((e): e is NonNullable<typeof e> => e != null)
    .map((e) => students?.find((s) => s.id === e.studentId)?.name)
    .filter((n): n is string => Boolean(n));
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
  yPosition: number,
  subjectColor?: string,
  isDragging?: boolean,
  isDraggedSession?: boolean,
  isAnyDragging?: boolean,
  height?: number,
  /**
   * Ctrl/Meta+drag 복사 모드 — true이면 원본은 흐려지지 않음. 사용자가 "원본은 그대로,
   * preview는 어디에 복사될지 표시" UX를 기대함. 이동(false) 시엔 기존처럼 흐림.
   */
  isCopyMode?: boolean,
): CSSProperties => {
  // 투명도 및 pointer-events 계산 로직
  let opacity = 1.0;
  let visibility: "visible" | "hidden" = "visible";
  let pointerEvents: CSSProperties["pointerEvents"] = "auto";

  // 전역 드래그 상태 (학생 드래그 또는 세션 드래그) 처리
  if (isAnyDragging) {
    if (isDraggedSession) {
      // 드래그 중인 세션(원본): pointer-events auto 유지 (Chrome native drag 안전).
      // 복사 모드: 원본 그대로 (opacity 1) — 사용자 의도 "원본은 가만히".
      // 이동 모드: 반투명 (0.4) — 어디로 옮겨질지 시각적 피드백.
      opacity = isCopyMode ? 1 : 0.4;
      visibility = "visible";
      pointerEvents = "auto";
    } else {
      // 다른 세션들: 완전히 보이되, pointer-events는 none (drop target인 cell에 dragover 전달)
      opacity = 1;
      pointerEvents = "none";
    }
  } else if (isDragging) {
    // 세션 드래그 전용 로직 (isAnyDragging에 학생 드래그가 포함되지 않은 경우)
    if (isDraggedSession) {
      opacity = isCopyMode ? 1 : 0.4;
      visibility = "visible";
      pointerEvents = "auto";
    } else {
      opacity = 1;
      pointerEvents = "none";
    }
  }

  const background = subjectColor ?? "#888";

  return {
    position: "absolute",
    left,
    top: yOffset + 1, // 경계선과 겹치지 않도록 1px 여백 추가
    height: `${height ?? SESSION_CELL_HEIGHT}px`,
    width,
    background,
    color: "#fff",
    borderRadius: 4,
    padding: "0px",
    fontSize: 12,
    display: "flex",
    alignItems: "center",
    overflow: "hidden",
    // dragstart 이후 React 리렌더 시점 적용 → Chrome native drag 취소 없음 (pointer-events 불변 법칙 준수)
    zIndex: (isDraggedSession && isAnyDragging) ? 500 : 100 + yPosition,
    cursor: "pointer",
    opacity,
    visibility,
    pointerEvents,
    transition: "opacity 0.2s ease-in-out, visibility 0.2s ease-in-out",
  };
};

// ADR-020 R5: 학생 deterministic 색 + Q Pastel 팔레트 폐기 — 학생 색을 session 본체에 표시 X.
// `getStudentDeterministicColor` / `Q_PASTEL_PALETTE` / `hashStringToIndex` 삭제.

export type ColorByMode = "subject" | "student" | "teacher";

export const sessionContainsSelected = (
  session: Session,
  enrollments: Array<{ id: string; studentId: string; subjectId: string }>,
  selectedStudentIds: string[]
): boolean => {
  if (!selectedStudentIds.length || !session.enrollmentIds?.length) return false;
  return session.enrollmentIds.some((eid) => {
    const enrollment = enrollments.find((e) => e.id === eid);
    return enrollment ? selectedStudentIds.includes(enrollment.studentId) : false;
  });
};

export const sessionContainsSelectedSubject = (
  session: Session,
  enrollments: Array<{ id: string; studentId: string; subjectId: string }>,
  selectedSubjectIds: string[]
): boolean => {
  if (!selectedSubjectIds.length || !session.enrollmentIds?.length) return false;
  return session.enrollmentIds.some((eid) => {
    const enrollment = enrollments.find((e) => e.id === eid);
    return enrollment
      ? selectedSubjectIds.includes(enrollment.subjectId)
      : false;
  });
};

/**
 * 학생/과목/강사 필터의 AND 결합 — 활성 필터 type 모두를 만족하는 sessions만 매칭.
 * 비활성 type은 무시. 모두 비활성이면 모든 sessions 매칭. 강사 매칭은 session.teacherId
 * 단일 필드 비교 (enrollment 통하지 않음).
 */
export const sessionMatchesFilters = (
  session: Session,
  enrollments: Array<{ id: string; studentId: string; subjectId: string }>,
  selectedStudentIds: string[],
  selectedSubjectIds: string[],
  selectedTeacherIds: string[] = []
): boolean => {
  const studentActive = selectedStudentIds.length > 0;
  const subjectActive = selectedSubjectIds.length > 0;
  const teacherActive = selectedTeacherIds.length > 0;
  if (!studentActive && !subjectActive && !teacherActive) return true;
  if (studentActive && !sessionContainsSelected(session, enrollments, selectedStudentIds))
    return false;
  if (subjectActive && !sessionContainsSelectedSubject(session, enrollments, selectedSubjectIds))
    return false;
  if (
    teacherActive &&
    !(session.teacherId != null && selectedTeacherIds.includes(session.teacherId))
  )
    return false;
  return true;
};

/**
 * Session 본체 색 결정 — ADR-020 R5.
 *   - colorBy="teacher" : session.teacher_id 의 강사 색
 *   - colorBy="subject" (default, "student" 입력 시도 동일) : firstEnrollment.subjectId 의 과목 색
 *
 * 필터 매칭 시각화는 ring 이 아닌 dim contrast 만 사용 (SessionBlock 에서 처리).
 * 본 함수는 session 본체 색만 반환. selectedStudentIds 등은 더 이상 영향 X (호환 인자).
 *
 * Migration 노트:
 *   - 이전 spec (ADR-003 + PR #284): colorBy="student" + chip 선택 → firstEnrollment 학생의 deterministic 색.
 *     → ADR-020 D1 으로 폐기. 학생 색은 session 본체에 표시 X.
 *   - `pickRingHex` 함수: ADR-020 R5 에서 ring 자체 제거 → 삭제됨.
 */
export const resolveSessionColor = (
  session: Session,
  colorBy: ColorByMode,
  enrollments: Array<{ id: string; studentId: string; subjectId: string }>,
  subjects: Subject[],
  _students: Array<{ id: string; name: string }>,
  teachers: Array<{ id: string; name: string; color: string }>,
  _selectedStudentIds?: string[]
): string => {
  if (colorBy === "teacher") {
    const teacher = teachers.find((t) => t.id === session.teacherId);
    return teacher?.color ?? "#888";
  }
  // colorBy === "subject" 또는 (legacy) "student" 모두 과목 색으로 폴백
  const firstEnrollment = enrollments.find(
    (e) => e.id === session.enrollmentIds?.[0]
  );
  const subject = subjects.find((s) => s.id === firstEnrollment?.subjectId);
  return subject?.color ?? "#888";
};
