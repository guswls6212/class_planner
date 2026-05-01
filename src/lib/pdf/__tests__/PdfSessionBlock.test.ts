import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CellPosition } from "../PdfGridLayout";

const textMock = vi.fn();
const rectMock = vi.fn();
const setFillColorMock = vi.fn();
const setTextColorMock = vi.fn();
const setFontMock = vi.fn();
const setFontSizeMock = vi.fn();

const mockDoc = {
  text: textMock,
  rect: rectMock,
  setFillColor: setFillColorMock,
  setTextColor: setTextColorMock,
  setFont: setFontMock,
  setFontSize: setFontSizeMock,
} as unknown as import("jspdf").jsPDF;

vi.mock("@/lib/colors/tintFromHex", () => ({
  tintFromHex: () => "#cccccc",
}));

import { drawSessionBlock } from "../PdfSessionBlock";

const baseData = {
  subjectName: "중등수학",
  studentNames: [],
  color: "#a78bfa",
  startsAt: "10:00",
  endsAt: "11:00",
  teacherName: undefined,
};

describe("drawSessionBlock — 시각 표시 (A-4)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("cell.height > 8이면 시각 텍스트를 그린다 (1시간 수업 ~10.7mm)", () => {
    // 1시간 수업의 실제 height ≈ 10.7mm (150/28 * 2)
    const cell: CellPosition = { x: 25, y: 35, width: 37, height: 10.7 };
    drawSessionBlock(mockDoc, cell, baseData);
    const textCalls = (textMock.mock.calls as [string][]).map(([t]) => t);
    expect(textCalls).toContain("10:00–11:00");
  });

  it("cell.height ≤ 8이면 시각 텍스트를 그리지 않는다 (30분 수업)", () => {
    // 30분 수업의 height ≈ 5.4mm
    const cell: CellPosition = { x: 25, y: 35, width: 37, height: 5.4 };
    drawSessionBlock(mockDoc, cell, baseData);
    const textCalls = (textMock.mock.calls as [string][]).map(([t]) => t);
    expect(textCalls).not.toContain("10:00–11:00");
  });

  it("항상 과목 이름을 그린다", () => {
    const cell: CellPosition = { x: 25, y: 35, width: 37, height: 10.7 };
    drawSessionBlock(mockDoc, cell, { ...baseData, subjectName: "고등국어" });
    const textCalls = (textMock.mock.calls as [string][]).map(([t]) => t);
    expect(textCalls).toContain("고등국어");
  });
});
