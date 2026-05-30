import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DayChipBar } from "../DayChipBar";

// Monday of the week containing 2026-04-20
const baseDate = new Date("2026-04-20T12:00:00"); // Monday

describe("DayChipBar", () => {
  beforeEach(() => vi.clearAllMocks());

  it("7개의 요일 칩이 렌더된다", () => {
    render(<DayChipBar selectedWeekday={0} onSelectWeekday={vi.fn()} baseDate={baseDate} />);
    // Weekday labels: 월 화 수 목 금 토 일
    ["월", "화", "수", "목", "금", "토", "일"].forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it("각 칩에 날짜 숫자가 표시된다", () => {
    render(<DayChipBar selectedWeekday={0} onSelectWeekday={vi.fn()} baseDate={baseDate} />);
    // 2026-04-20 (Mon) week: 20,21,22,23,24,25,26
    expect(screen.getByText("20")).toBeInTheDocument();
    expect(screen.getByText("26")).toBeInTheDocument();
  });

  it("selectedWeekday 칩이 활성(active) 상태로 렌더된다", () => {
    render(<DayChipBar selectedWeekday={0} onSelectWeekday={vi.fn()} baseDate={baseDate} />);
    // Active chip should have bg-accent class
    const mondayBtn = screen.getByRole("button", { name: /월/ });
    expect(mondayBtn.className).toMatch(/bg-accent/);
  });

  it("다른 요일 칩은 활성 상태가 아니다", () => {
    render(<DayChipBar selectedWeekday={0} onSelectWeekday={vi.fn()} baseDate={baseDate} />);
    const tuesdayBtn = screen.getByRole("button", { name: /화/ });
    expect(tuesdayBtn.className).not.toMatch(/bg-accent/);
  });

  it("칩 클릭 시 onSelectWeekday(index)가 호출된다", () => {
    const onSelectWeekday = vi.fn();
    render(<DayChipBar selectedWeekday={0} onSelectWeekday={onSelectWeekday} baseDate={baseDate} />);
    // Click Wednesday chip (index 2)
    const wedBtn = screen.getByRole("button", { name: /수/ });
    fireEvent.click(wedBtn);
    expect(onSelectWeekday).toHaveBeenCalledWith(2);
  });

  it("월요일 칩 클릭 시 onSelectWeekday(0) 호출된다", () => {
    const onSelectWeekday = vi.fn();
    render(<DayChipBar selectedWeekday={3} onSelectWeekday={onSelectWeekday} baseDate={baseDate} />);
    const monBtn = screen.getByRole("button", { name: /월/ });
    fireEvent.click(monBtn);
    expect(onSelectWeekday).toHaveBeenCalledWith(0);
  });
});
