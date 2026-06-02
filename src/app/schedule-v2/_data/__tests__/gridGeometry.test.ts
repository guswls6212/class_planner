import { describe, it, expect } from "vitest";
import {
  PX_PER_HOUR_DESKTOP,
  PX_PER_HOUR_MOBILE,
  blockGeometry,
  hourTicks,
  pxPerMinute,
  resolveAxis,
  showSubjectLabel,
  trackWidthPx,
  type GridAxis,
} from "../gridGeometry";
import type { ViewBlock } from "../scheduleViewModel";

const blk = (start: number, end: number): ViewBlock => ({
  id: "x",
  weekday: 0,
  studentName: "김민준",
  subjectName: "수학",
  teacherName: null,
  color: "#ef4444",
  start,
  end,
});

describe("gridGeometry", () => {
  describe("resolveAxis", () => {
    it("range 지정 시 시(hour)→분 고정", () => {
      expect(resolveAxis([], { startHour: 9, endHour: 23 })).toEqual({ start: 540, end: 1380 });
    });
    it("range 없으면 데이터 자동맞춤(axisOf, 정시 라운딩)", () => {
      // 9:30~10:30 → floor(570/60)*60=540, ceil(630/60)*60=660
      expect(resolveAxis([blk(570, 630)])).toEqual({ start: 540, end: 660 });
    });
  });

  describe("pxPerMinute", () => {
    it("데스크톱/모바일 고정 스케일 — 데스크톱이 더 넓다", () => {
      expect(pxPerMinute(false)).toBeCloseTo(PX_PER_HOUR_DESKTOP / 60);
      expect(pxPerMinute(true)).toBeCloseTo(PX_PER_HOUR_MOBILE / 60);
      expect(pxPerMinute(false)).toBeGreaterThan(pxPerMinute(true));
    });
  });

  describe("trackWidthPx", () => {
    it("9-23시 데스크톱 = 14h × 96 = 1344px", () => {
      expect(trackWidthPx({ start: 540, end: 1380 }, pxPerMinute(false))).toBe(1344);
    });
    it("운영시간 길수록 트랙이 넓다(→ 가로 스크롤 유발)", () => {
      const wide = trackWidthPx({ start: 540, end: 1380 }, pxPerMinute(false)); // 14h
      const narrow = trackWidthPx({ start: 540, end: 780 }, pxPerMinute(false)); // 4h
      expect(wide).toBeGreaterThan(narrow);
    });
  });

  describe("blockGeometry", () => {
    const axis: GridAxis = { start: 540, end: 1380 }; // 9-23
    const ppm = pxPerMinute(false); // 1.6 px/min

    it("1시간 블록 = 96px (이름 풀표시 가능 폭)", () => {
      expect(blockGeometry(blk(600, 660), axis, ppm).width).toBe(96);
    });
    it("축 시작 이전은 left=0 클램프", () => {
      expect(blockGeometry(blk(480, 600), axis, ppm).left).toBe(0); // 8:00 시작
    });
    it("축 끝 이후는 트랙폭으로 클램프(삐져나가지 않음)", () => {
      const trackW = trackWidthPx(axis, ppm);
      const { left, width } = blockGeometry(blk(1320, 1500), axis, ppm); // 22:00~25:00
      expect(left + width).toBeLessThanOrEqual(trackW + 0.5);
    });
    it("0폭(시작=끝)도 최소폭 보장", () => {
      expect(blockGeometry(blk(600, 600), axis, ppm).width).toBeGreaterThanOrEqual(10);
    });
  });

  describe("hourTicks", () => {
    it("정시 눈금 목록", () => {
      expect(hourTicks({ start: 540, end: 720 })).toEqual([9, 10, 11, 12]);
    });
  });

  describe("showSubjectLabel (S3 모바일 과목 숨김)", () => {
    it("데스크톱은 과목 표시, 모바일은 숨김", () => {
      expect(showSubjectLabel(false)).toBe(true);
      expect(showSubjectLabel(true)).toBe(false);
    });
  });
});
