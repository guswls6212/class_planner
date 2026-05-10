/**
 * Subject 추가/편집 모달의 기본 색상 팔레트.
 *
 * UI_SPEC §2.5에 9색 팔레트가 명시돼 있으나 그동안 코드 상수가 부재.
 * SubjectAddDetailModal 도입(2026-05-10)과 함께 정식 노출.
 *
 * 강사 팔레트(DEFAULT_TEACHER_COLORS)와 의도적으로 다른 톤(차분한 saturation)
 * — 사용자가 시간표에서 강사·과목을 색으로 구분할 때 혼동을 줄이기 위함.
 */
export const DEFAULT_SUBJECT_COLORS = [
  "#3b82f6", // blue
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#14b8a6", // teal
  "#6366f1", // indigo
  "#f97316", // orange
];

export const SUBJECT_DEFAULT_COLOR = DEFAULT_SUBJECT_COLORS[0];
