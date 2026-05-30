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

  it("cell.height >= 6 이면 [시작 - 마침] 시간 텍스트를 그린다 (ADR-020 보강)", () => {
    // 30분 이상 (≥ 6mm) → 시간 표시
    const cell: CellPosition = { x: 25, y: 35, width: 37, height: 10.7 };
    drawSessionBlock(mockDoc, cell, baseData);
    const textCalls = (textMock.mock.calls as [string][]).map(([t]) => t);
    expect(textCalls).toContain("10:00 - 11:00");
  });

  it("cell.height < 6 이면 시간 텍스트 hidden (30분 미만)", () => {
    // 30분 미만 (< 6mm) — 제목 + 강사만, 시간 hidden
    const cell: CellPosition = { x: 25, y: 35, width: 37, height: 5.4 };
    drawSessionBlock(mockDoc, cell, baseData);
    const textCalls = (textMock.mock.calls as [string][]).map(([t]) => t);
    expect(textCalls).not.toContain("10:00 - 11:00");
  });

  it("항상 과목 이름을 그린다", () => {
    const cell: CellPosition = { x: 25, y: 35, width: 37, height: 10.7 };
    drawSessionBlock(mockDoc, cell, { ...baseData, subjectName: "고등국어" });
    const textCalls = (textMock.mock.calls as [string][]).map(([t]) => t);
    expect(textCalls).toContain("고등국어");
  });
});

describe("drawSessionBlock — 강사 이름 (plain text)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("teacherName이 있으면 plain text로 강사 이름을 그린다", () => {
    const cell: CellPosition = { x: 25, y: 35, width: 37, height: 10.7 };
    drawSessionBlock(mockDoc, cell, {
      ...baseData,
      teacherName: "이강사",
    });
    const textCalls = (textMock.mock.calls as [string][]).map(([t]) => t);
    expect(textCalls).toContain("이강사");
  });

  it("teacherName을 그릴 때 컬러 도트(circle)는 그리지 않는다", () => {
    const cell: CellPosition = { x: 25, y: 35, width: 37, height: 10.7 };
    drawSessionBlock(mockDoc, cell, {
      ...baseData,
      teacherName: "이강사",
    });
    expect(circleMock).not.toHaveBeenCalled();
  });

  it("teacherName을 그릴 때 화살표(▸)를 붙이지 않는다", () => {
    const cell: CellPosition = { x: 25, y: 35, width: 37, height: 10.7 };
    drawSessionBlock(mockDoc, cell, {
      ...baseData,
      teacherName: "이강사",
    });
    const textCalls = (textMock.mock.calls as [string][]).map(([t]) => t);
    expect(textCalls).not.toContain("▸ 이강사");
  });

  it("teacherName 은 cell.height 무관 항상 우상단에 그린다 (ADR-020 보강)", () => {
    // 새 spec: 강사 우상단 = 항상 표시 (subject 좌상단과 같은 y, right-align)
    // 옛 spec (cell.height > 7 일 때만) 폐기 — block 안 정보 우선순위는 시간/학생 에만 적용.
    const cell: CellPosition = { x: 25, y: 35, width: 37, height: 5 };
    drawSessionBlock(mockDoc, cell, {
      ...baseData,
      teacherName: "이강사",
    });
    const textCalls = (textMock.mock.calls as [string][]).map(([t]) => t);
    expect(textCalls).toContain("이강사");
  });
});
