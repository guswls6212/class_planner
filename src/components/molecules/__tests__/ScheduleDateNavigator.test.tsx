import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ScheduleDateNavigator } from "../ScheduleDateNavigator";

const defaultProps = {
  label: "2026년 4월 27일 (월)",
  onPrev: vi.fn(),
  onNext: vi.fn(),
  onToday: vi.fn(),
  prevAriaLabel: "이전 날",
  nextAriaLabel: "다음 날",
};

describe("ScheduleDateNavigator", () => {
  beforeEach(() => vi.clearAllMocks());

  it("라벨 텍스트가 렌더된다", () => {
    render(<ScheduleDateNavigator {...defaultProps} />);
    expect(screen.getByText("2026년 4월 27일 (월)")).toBeInTheDocument();
  });

  it("이전 버튼 클릭 시 onPrev가 호출된다", () => {
    render(<ScheduleDateNavigator {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: "이전 날" }));
    expect(defaultProps.onPrev).toHaveBeenCalledTimes(1);
  });

  it("다음 버튼 클릭 시 onNext가 호출된다", () => {
    render(<ScheduleDateNavigator {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: "다음 날" }));
    expect(defaultProps.onNext).toHaveBeenCalledTimes(1);
  });

  it("오늘 버튼 클릭 시 onToday가 호출된다", () => {
    render(<ScheduleDateNavigator {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: "오늘" }));
    expect(defaultProps.onToday).toHaveBeenCalledTimes(1);
  });

  it("prevAriaLabel이 이전 버튼의 aria-label로 적용된다", () => {
    render(<ScheduleDateNavigator {...defaultProps} prevAriaLabel="이전 주" />);
    expect(screen.getByRole("button", { name: "이전 주" })).toBeInTheDocument();
  });

  it("nextAriaLabel이 다음 버튼의 aria-label로 적용된다", () => {
    render(<ScheduleDateNavigator {...defaultProps} nextAriaLabel="다음 달" />);
    expect(screen.getByRole("button", { name: "다음 달" })).toBeInTheDocument();
  });

  it("라벨이 변경되면 새 라벨이 표시된다", () => {
    const { rerender } = render(<ScheduleDateNavigator {...defaultProps} />);
    rerender(<ScheduleDateNavigator {...defaultProps} label="2026년 5월" />);
    expect(screen.getByText("2026년 5월")).toBeInTheDocument();
  });
});
