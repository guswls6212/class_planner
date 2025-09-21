/**
 * 상수 테스트
 */

import { describe, expect, it } from "vitest";

describe("세션 상수들", () => {
  it("세션 상수들이 올바르게 export되어야 한다", async () => {
    const module = await import("../constants/sessionConstants");

    expect(module).toBeDefined();
    expect(typeof module.SESSION_CELL_HEIGHT).toBe("number");
    expect(typeof module.SESSION_CELL_WIDTH).toBe("number");
  });

  it("TIMETABLE_CONSTANTS가 올바른 값을 가져야 한다", async () => {
    const { TIMETABLE_CONSTANTS } = await import(
      "../constants/sessionConstants"
    );

    expect(TIMETABLE_CONSTANTS.CELL_HEIGHT).toBe(47);
    expect(TIMETABLE_CONSTANTS.START_HOUR).toBe(9);
    expect(TIMETABLE_CONSTANTS.END_HOUR).toBe(23);
    expect(TIMETABLE_CONSTANTS.WEEKDAYS_COUNT).toBe(7);
  });

  it("SESSION_CONSTANTS가 올바른 값을 가져야 한다", async () => {
    const { SESSION_CONSTANTS } = await import("../constants/sessionConstants");

    expect(SESSION_CONSTANTS.HEIGHT).toBe(47);
    expect(SESSION_CONSTANTS.MIN_HEIGHT).toBe(47);
    expect(typeof SESSION_CONSTANTS.MARGIN).toBe("number");
    expect(typeof SESSION_CONSTANTS.PADDING).toBe("number");
  });

  it("DRAG_DROP_CONSTANTS가 올바른 값을 가져야 한다", async () => {
    const { DRAG_DROP_CONSTANTS } = await import(
      "../constants/sessionConstants"
    );

    expect(DRAG_DROP_CONSTANTS.DROPZONE_HEIGHT).toBe(47);
    expect(DRAG_DROP_CONSTANTS.PREVIEW_HEIGHT).toBe(47);
    expect(typeof DRAG_DROP_CONSTANTS.DRAG_THRESHOLD).toBe("number");
  });
});
