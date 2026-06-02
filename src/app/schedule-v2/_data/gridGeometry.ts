/**
 * schedule-v2 그리드(StudyRoomGrid) 좌표 계산 — 순수 함수(DOM 비의존, 단위 테스트 대상).
 *
 * 가독성 결정(2026-06-02, mockup grid-block-readability — S1+S3 픽):
 *   - 고정 px/시 스케일 → 블록폭이 시간 길이에 비례하되 학생이름이 보이는 폭 확보.
 *     운영시간이 길면 트랙폭이 컨테이너를 넘어 → 가로 스크롤(요일 라벨은 sticky 고정).
 *   - 모바일(≤767px)은 과목 숨김(이름만)으로 좁은 폭에 이름 확보. 색=과목은 상단 과목필터(범례).
 * 측정 근거: text-10px·한글 1자 ≈ 10px → 이름 6자 ≈ 60px.
 *   데스크톱 과목+이름 ≈ 96px/시(1시간 블록 ≈ 96px) · 모바일 이름만 ≈ 72px/시.
 */

import { axisOf, type ViewBlock } from "./scheduleViewModel";

/** 요일 라벨 칼럼 폭(px) — 가로 스크롤 시 sticky 고정. */
export const GRID_LABEL_W = 32;
/** 레인(겹침 줄) 높이(px). */
export const GRID_LANE_H = 24;
export const PX_PER_HOUR_DESKTOP = 96;
export const PX_PER_HOUR_MOBILE = 72;
/** 아주 짧은 수업(30분 미만)도 클릭 가능하게 최소 폭(px). */
export const MIN_BLOCK_W = 10;

export interface GridAxis {
  /** 분(09:00 = 540). */
  start: number;
  end: number;
}

/** range(운영시간) 지정 시 시→분 고정, 미지정이면 데이터 자동맞춤(axisOf). */
export function resolveAxis(
  blocks: ViewBlock[],
  range?: { startHour: number; endHour: number },
): GridAxis {
  return range
    ? { start: range.startHour * 60, end: range.endHour * 60 }
    : axisOf(blocks);
}

/** 분당 px — 모바일/데스크톱 고정 스케일. */
export function pxPerMinute(isMobile: boolean): number {
  return (isMobile ? PX_PER_HOUR_MOBILE : PX_PER_HOUR_DESKTOP) / 60;
}

/** 시간 트랙 전체 폭(px). 컨테이너보다 크면 가로 스크롤이 생긴다. */
export function trackWidthPx(axis: GridAxis, pxPerMin: number): number {
  return Math.max((axis.end - axis.start) * pxPerMin, 1);
}

/** 블록의 좌/폭(px) — 운영시간 창 밖으로 삐져나간 부분은 클램프. */
export function blockGeometry(
  block: { start: number; end: number },
  axis: GridAxis,
  pxPerMin: number,
): { left: number; width: number } {
  const trackW = trackWidthPx(axis, pxPerMin);
  const left = Math.max(0, (block.start - axis.start) * pxPerMin);
  const right = Math.min(trackW, (block.end - axis.start) * pxPerMin);
  return { left, width: Math.max(right - left, MIN_BLOCK_W) };
}

/** 정시 눈금 시각(시) 목록. */
export function hourTicks(axis: GridAxis): number[] {
  const ticks: number[] = [];
  for (let h = Math.ceil(axis.start / 60); h <= Math.floor(axis.end / 60); h++) {
    ticks.push(h);
  }
  return ticks;
}

/** S3: 모바일이면 과목 숨김(이름만 표시). */
export function showSubjectLabel(isMobile: boolean): boolean {
  return !isMobile;
}
