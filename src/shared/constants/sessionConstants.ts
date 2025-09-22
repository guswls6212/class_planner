/**
 * 세션 관련 상수 정의
 * Clean Architecture - Shared 계층
 */

// 세션 셀 높이 (픽셀)
export const SESSION_CELL_HEIGHT = 47;

// 세션 셀 너비 (30분 단위)
export const SESSION_CELL_WIDTH = 100;

// 시간표 관련 상수
export const TIMETABLE_CONSTANTS = {
  // 세션 셀 크기
  CELL_HEIGHT: SESSION_CELL_HEIGHT,
  CELL_WIDTH: SESSION_CELL_WIDTH,

  // 시간 범위
  START_HOUR: 9,
  END_HOUR: 23,

  // 시간 간격 (분)
  TIME_INTERVAL: 30,

  // 요일 수
  WEEKDAYS_COUNT: 7,
} as const;

// 세션 관련 상수
export const SESSION_CONSTANTS = {
  // 기본 세션 높이
  HEIGHT: SESSION_CELL_HEIGHT,

  // 최소 세션 높이
  MIN_HEIGHT: SESSION_CELL_HEIGHT,

  // 세션 간격
  MARGIN: 2,

  // 세션 패딩
  PADDING: 4,
} as const;

// 드래그 앤 드롭 관련 상수
export const DRAG_DROP_CONSTANTS = {
  // 드롭존 높이
  DROPZONE_HEIGHT: SESSION_CELL_HEIGHT,

  // 드래그 프리뷰 높이
  PREVIEW_HEIGHT: SESSION_CELL_HEIGHT,

  // 드래그 임계값
  DRAG_THRESHOLD: 5,
} as const;
