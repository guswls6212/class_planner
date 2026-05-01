import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CellPosition } from "../PdfGridLayout";

const textMock = vi.fn();
const rectMock = vi.fn();
const setFillColorMock = vi.fn();
const setTextColorMock = vi.fn();
const setFontMock = vi.fn();
const setFontSizeMock = vi.fn();

const circleMock = vi.fn();

const mockDoc = {
  text: textMock,
  rect: rectMock,
  setFillColor: setFillColorMock,
  setTextColor: setTextColorMock,
  setFont: setFontMock,
  setFontSize: setFontSizeMock,
  circle: circleMock,
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

describe("drawSessionBlock — 강사 컬러 도트 (필터 모드)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("teacherColor 있으면 강사 컬러 도트(circle)를 그린다", () => {
    const cell: CellPosition = { x: 25, y: 35, width: 37, height: 10.7 };
    drawSessionBlock(mockDoc, cell, {
      ...baseData,
      teacherName: "이강사",
      teacherColor: "#7c3aed",
    });
    expect(circleMock).toHaveBeenCalled();
  });

  it("teacherColor 없으면 circle을 그리지 않는다 (기존 ▸ 방식)", () => {
    const cell: CellPosition = { x: 25, y: 35, width: 37, height: 10.7 };
    drawSessionBlock(mockDoc, cell, {
      ...baseData,
      teacherName: "이강사",
      teacherColor: undefined,
    });
    expect(circleMock).not.toHaveBeenCalled();
  });

  it("teacherColor 있을 때 강사 이름도 텍스트로 그린다", () => {
    const cell: CellPosition = { x: 25, y: 35, width: 37, height: 10.7 };
    drawSessionBlock(mockDoc, cell, {
      ...baseData,
      teacherName: "이강사",
      teacherColor: "#7c3aed",
    });
    const textCalls = (textMock.mock.calls as [string][]).map(([t]) => t);
    expect(textCalls).toContain("이강사");
  });

  it("teacherColor 있으면 '▸ 이강사' 형식이 아니라 이름만 출력된다", () => {
    const cell: CellPosition = { x: 25, y: 35, width: 37, height: 10.7 };
    drawSessionBlock(mockDoc, cell, {
      ...baseData,
      teacherName: "이강사",
      teacherColor: "#7c3aed",
    });
    const textCalls = (textMock.mock.calls as [string][]).map(([t]) => t);
    expect(textCalls).not.toContain("▸ 이강사");
    expect(textCalls).toContain("이강사");
  });
});
