import { describe, expect, it, vi } from "vitest";

vi.mock("../logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import {
  pixelToLogicalPosition,
  logicalToPixelPosition,
  migrateSessionsToLogicalPosition,
  migrateSessionsToPixelPosition,
} from "../yPositionMigration";
import { SESSION_CELL_HEIGHT } from "../../shared/constants/sessionConstants";

describe("yPositionMigration", () => {
  describe("pixelToLogicalPosition", () => {
    it("0px → 1", () => {
      expect(pixelToLogicalPosition(0)).toBe(1);
    });

    it("SESSION_CELL_HEIGHT px → 2", () => {
      expect(pixelToLogicalPosition(SESSION_CELL_HEIGHT)).toBe(2);
    });

    it("SESSION_CELL_HEIGHT * 2 px → 3", () => {
      expect(pixelToLogicalPosition(SESSION_CELL_HEIGHT * 2)).toBe(3);
    });

    it("음수 → 1", () => {
      expect(pixelToLogicalPosition(-10)).toBe(1);
    });
  });

  describe("logicalToPixelPosition", () => {
    it("1 → 0px", () => {
      expect(logicalToPixelPosition(1)).toBe(0);
    });

    it("2 → SESSION_CELL_HEIGHT px", () => {
      expect(logicalToPixelPosition(2)).toBe(SESSION_CELL_HEIGHT);
    });

    it("3 → SESSION_CELL_HEIGHT * 2 px", () => {
      expect(logicalToPixelPosition(3)).toBe(SESSION_CELL_HEIGHT * 2);
    });

    it("0 이하 → 0px", () => {
      expect(logicalToPixelPosition(0)).toBe(0);
      expect(logicalToPixelPosition(-1)).toBe(0);
    });
  });

  describe("pixelToLogical ↔ logicalToPixel 왕복", () => {
    it("pixel → logical → pixel 왕복이 일치한다", () => {
      for (let i = 0; i < 5; i++) {
        const pixel = i * SESSION_CELL_HEIGHT;
        const logical = pixelToLogicalPosition(pixel);
        const backToPixel = logicalToPixelPosition(logical);
        expect(backToPixel).toBe(pixel);
      }
    });
  });

  describe("migrateSessionsToLogicalPosition", () => {
    it("47의 배수인 yPosition을 논리적 위치로 변환한다", () => {
      const sessions = [
        { id: "1", yPosition: 47, weekday: 1, startsAt: "09:00", endsAt: "10:00" },
        { id: "2", yPosition: 94, weekday: 1, startsAt: "10:00", endsAt: "11:00" },
      ] as any[];

      const result = migrateSessionsToLogicalPosition(sessions);
      expect(result[0].yPosition).toBe(2);
      expect(result[1].yPosition).toBe(3);
    });

    it("이미 논리적 위치인 세션은 그대로 유지한다", () => {
      const sessions = [
        { id: "1", yPosition: 1, weekday: 1, startsAt: "09:00", endsAt: "10:00" },
        { id: "2", yPosition: 3, weekday: 1, startsAt: "10:00", endsAt: "11:00" },
      ] as any[];

      const result = migrateSessionsToLogicalPosition(sessions);
      expect(result[0].yPosition).toBe(1);
      expect(result[1].yPosition).toBe(3);
    });

    it("yPosition이 없는 세션은 그대로 반환한다", () => {
      const sessions = [
        { id: "1", weekday: 1, startsAt: "09:00", endsAt: "10:00" },
      ] as any[];

      const result = migrateSessionsToLogicalPosition(sessions);
      expect(result[0].yPosition).toBeUndefined();
    });
  });

  describe("migrateSessionsToPixelPosition", () => {
    it("논리적 위치를 픽셀 위치로 변환한다", () => {
      const sessions = [
        { id: "1", yPosition: 1, weekday: 1, startsAt: "09:00", endsAt: "10:00" },
        { id: "2", yPosition: 2, weekday: 1, startsAt: "10:00", endsAt: "11:00" },
      ] as any[];

      const result = migrateSessionsToPixelPosition(sessions);
      expect(result[0].yPosition).toBe(0);
      expect(result[1].yPosition).toBe(SESSION_CELL_HEIGHT);
    });

    it("yPosition이 없는 세션은 그대로 반환한다", () => {
      const sessions = [
        { id: "1", weekday: 1, startsAt: "09:00", endsAt: "10:00" },
      ] as any[];

      const result = migrateSessionsToPixelPosition(sessions);
      expect(result[0].yPosition).toBeUndefined();
    });
  });
});
