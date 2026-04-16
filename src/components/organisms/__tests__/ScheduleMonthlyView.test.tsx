import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ScheduleMonthlyView from "../ScheduleMonthlyView";

const defaultProps = {
  sessions: new Map(),
  subjects: [],
  enrollments: [],
  currentDate: new Date("2026-04-01T12:00:00"),
  goToNextMonth: vi.fn(),
  goToPrevMonth: vi.fn(),
  goToToday: vi.fn(),
  onDayClick: vi.fn(),
};

describe("ScheduleMonthlyView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("월 레이블 '2026년 4월'을 표시한다", () => {
    render(<ScheduleMonthlyView {...defaultProps} />);
    expect(screen.getByText("2026년 4월")).toBeInTheDocument();
  });

  it("요일 헤더 7개(월~일)를 렌더링한다", () => {
    render(<ScheduleMonthlyView {...defaultProps} />);
    ["월", "화", "수", "목", "금", "토", "일"].forEach((day) => {
      expect(screen.getByText(day)).toBeInTheDocument();
    });
  });

  it("4월은 35개(5행×7열) 이상의 날짜 셀을 렌더링한다", () => {
    render(<ScheduleMonthlyView {...defaultProps} />);
    // April 2026: starts Wednesday (Wed=2 in Mon-based), 30 days → 5 rows = 35 cells
    const cells = screen.getAllByRole("button", { name: /^\d+$/ });
    expect(cells.length).toBeGreaterThanOrEqual(35);
  });

  it("이전 달 버튼 클릭 시 goToPrevMonth가 호출된다", () => {
    const goToPrevMonth = vi.fn();
    render(<ScheduleMonthlyView {...defaultProps} goToPrevMonth={goToPrevMonth} />);
    fireEvent.click(screen.getByRole("button", { name: "이전 달" }));
    expect(goToPrevMonth).toHaveBeenCalledTimes(1);
  });

  it("다음 달 버튼 클릭 시 goToNextMonth가 호출된다", () => {
    const goToNextMonth = vi.fn();
    render(<ScheduleMonthlyView {...defaultProps} goToNextMonth={goToNextMonth} />);
    fireEvent.click(screen.getByRole("button", { name: "다음 달" }));
    expect(goToNextMonth).toHaveBeenCalledTimes(1);
  });

  it("'오늘' 버튼 클릭 시 goToToday가 호출된다", () => {
    const goToToday = vi.fn();
    render(<ScheduleMonthlyView {...defaultProps} goToToday={goToToday} />);
    fireEvent.click(screen.getByRole("button", { name: "오늘" }));
    expect(goToToday).toHaveBeenCalledTimes(1);
  });

  it("날짜 셀 클릭 시 onDayClick(date)이 호출된다", () => {
    const onDayClick = vi.fn();
    render(<ScheduleMonthlyView {...defaultProps} onDayClick={onDayClick} />);
    // Click "15" (April 15)
    const cellButtons = screen.getAllByRole("button", { name: /^\d+$/ });
    // Find the button for day 15 - it's a date number button inside MonthDayCell
    const day15Btn = cellButtons.find((btn) => btn.textContent?.trim() === "15");
    expect(day15Btn).toBeDefined();
    fireEvent.click(day15Btn!);
    expect(onDayClick).toHaveBeenCalledTimes(1);
    const calledDate: Date = onDayClick.mock.calls[0][0];
    expect(calledDate.getDate()).toBe(15);
    expect(calledDate.getMonth()).toBe(3); // April = 3
  });
});
