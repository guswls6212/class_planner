/**
 * PDF 유틸리티 기본 테스트
 */

import { describe, expect, it, vi } from "vitest";

// Mock jsPDF
vi.mock("jspdf", () => ({
  default: vi.fn().mockImplementation(() => ({
    text: vi.fn(),
    setFontSize: vi.fn(),
    setFont: vi.fn(),
    addPage: vi.fn(),
    save: vi.fn(),
    internal: {
      pageSize: {
        getWidth: vi.fn(() => 210),
        getHeight: vi.fn(() => 297),
      },
    },
  })),
}));

describe("PDF 유틸리티", () => {
  it("PDF 유틸리티 모듈이 로드되어야 한다", async () => {
    const module = await import("../pdf-utils");
    expect(module).toBeDefined();
  });

  it("timeToMinutes 함수가 올바르게 작동해야 한다", async () => {
    const { timeToMinutes } = await import("../pdf-utils");

    expect(timeToMinutes("09:00")).toBe(540);
    expect(timeToMinutes("10:30")).toBe(630);
  });

  it("minutesToTime 함수가 올바르게 작동해야 한다", async () => {
    const { minutesToTime } = await import("../pdf-utils");

    expect(minutesToTime(540)).toBe("09:00");
    expect(minutesToTime(630)).toBe("10:30");
  });

  it("calculateSessionTimeRange 함수가 존재해야 한다", async () => {
    const { calculateSessionTimeRange } = await import("../pdf-utils");

    expect(typeof calculateSessionTimeRange).toBe("function");
  });

  it("extractTimeHeaders 함수가 존재해야 한다", async () => {
    const { extractTimeHeaders } = await import("../pdf-utils");

    expect(typeof extractTimeHeaders).toBe("function");
  });

  // 핵심 시간 변환 테스트들만 유지
  it("시간 변환이 양방향으로 정확해야 한다", async () => {
    const { timeToMinutes, minutesToTime } = await import("../pdf-utils");

    const testCases = [
      { time: "09:00", minutes: 540 },
      { time: "12:30", minutes: 750 },
      { time: "18:45", minutes: 1125 },
    ];

    testCases.forEach(({ time, minutes }) => {
      expect(timeToMinutes(time)).toBe(minutes);
      expect(minutesToTime(minutes)).toBe(time);
    });
  });

  it("세션 시간 범위 계산이 올바르게 작동해야 한다", async () => {
    const { calculateSessionTimeRange } = await import("../pdf-utils");

    // Mock DOM element
    const mockElement = {
      querySelectorAll: vi.fn(() => []),
    } as any;

    expect(() => {
      calculateSessionTimeRange(mockElement);
    }).not.toThrow();
  });
});
