import { describe, it, expect } from "vitest";
import { calculateGridDimensions, getCellPosition } from "../PdfGridLayout";

describe("calculateGridDimensions", () => {
  it("produces correct dayColWidth for 5 weekdays", () => {
    const dims = calculateGridDimensions(5, 9, 23);
    expect(dims.pageWidth).toBe(297);
    expect(dims.pageHeight).toBe(210);
    // availableWidth = 297 - 10 - 10 - 15 = 262; dayColWidth = 262/5 = 52.4
    expect(dims.dayColWidth).toBeCloseTo(52.4);
  });

  it("calculates slotHeight for 28 slots (14 hours * 2)", () => {
    const dims = calculateGridDimensions(5, 9, 23);
    // gridTop = 15 + 20 = 35; gridBottom = 210 - 15 - 10 = 185; range = 150
    // totalSlots = (23-9)*2 = 28; slotHeight = 150/28
    expect(dims.slotHeight).toBeCloseTo(150 / 28);
  });
});

describe("getCellPosition", () => {
  it("returns correct position for first slot (weekday 0, 9:00-10:00)", () => {
    const dims = calculateGridDimensions(5, 9, 23);
    const cell = getCellPosition(dims, 0, "09:00", "10:00", 9);
    expect(cell.x).toBeCloseTo(dims.margin.left + dims.timeColWidth);
    expect(cell.y).toBeCloseTo(dims.gridTop);
    expect(cell.width).toBeCloseTo(dims.dayColWidth);
    expect(cell.height).toBeCloseTo(dims.slotHeight * 2); // 2 slots = 1 hour
  });

  it("offsets correctly for weekday 2 (Wednesday)", () => {
    const dims = calculateGridDimensions(5, 9, 23);
    const cell = getCellPosition(dims, 2, "14:00", "15:00", 9);
    expect(cell.x).toBeCloseTo(
      dims.margin.left + dims.timeColWidth + 2 * dims.dayColWidth
    );
  });

  it("calculates correct y for 14:30 start", () => {
    const dims = calculateGridDimensions(5, 9, 23);
    const cell = getCellPosition(dims, 0, "14:30", "15:00", 9);
    // [14, 30] → startSlot = (14-9)*2 + 30/30 = 10 + 1 = 11
    expect(cell.y).toBeCloseTo(dims.gridTop + 11 * dims.slotHeight);
  });
});
