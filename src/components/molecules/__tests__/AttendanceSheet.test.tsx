import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AttendanceSheet from "../AttendanceSheet";

const STUDENTS = [
  { id: "stu-1", name: "김철수" },
  { id: "stu-2", name: "이영희" },
];

const DEFAULT_PROPS = {
  isOpen: true,
  onClose: vi.fn(),
  sessionId: "sess-1",
  date: "2026-04-17",
  students: STUDENTS,
  attendance: {} as Record<string, { status: string; notes?: string }>,
  onMarkAttendance: vi.fn(),
  onMarkAllPresent: vi.fn(),
};

describe("AttendanceSheet", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("isOpen=false 이면 렌더링되지 않는다", () => {
    render(<AttendanceSheet {...DEFAULT_PROPS} isOpen={false} />);
    expect(screen.queryByText("출석 체크")).not.toBeInTheDocument();
  });

  it("학생 목록이 표시된다", () => {
    render(<AttendanceSheet {...DEFAULT_PROPS} />);
    expect(screen.getByText("김철수")).toBeInTheDocument();
    expect(screen.getByText("이영희")).toBeInTheDocument();
  });

  it("각 학생에게 출석 상태 버튼이 표시된다", () => {
    render(<AttendanceSheet {...DEFAULT_PROPS} />);
    // 2명이므로 "출석" 버튼이 2개
    const presentButtons = screen.getAllByRole("button", { name: "출석" });
    expect(presentButtons).toHaveLength(2);
  });

  it("출석 버튼 클릭 시 onMarkAttendance가 호출된다", () => {
    render(<AttendanceSheet {...DEFAULT_PROPS} />);
    const presentButtons = screen.getAllByRole("button", { name: "출석" });
    fireEvent.click(presentButtons[0]);
    expect(DEFAULT_PROPS.onMarkAttendance).toHaveBeenCalledWith("stu-1", "present");
  });

  it("'전체 출석' 버튼 클릭 시 onMarkAllPresent가 호출된다", () => {
    render(<AttendanceSheet {...DEFAULT_PROPS} />);
    const allPresentBtn = screen.getByRole("button", { name: "전체 출석" });
    fireEvent.click(allPresentBtn);
    expect(DEFAULT_PROPS.onMarkAllPresent).toHaveBeenCalledTimes(1);
  });

  it("기존 출석 상태가 있으면 해당 버튼이 활성화 표시된다", () => {
    render(
      <AttendanceSheet
        {...DEFAULT_PROPS}
        attendance={{ "stu-1": { status: "absent" } }}
      />
    );
    const absentBtn = screen.getAllByRole("button", { name: "결석" })[0];
    expect(absentBtn).toHaveAttribute("aria-pressed", "true");
  });

  it("닫기 버튼 클릭 시 onClose가 호출된다", () => {
    render(<AttendanceSheet {...DEFAULT_PROPS} />);
    const closeBtn = screen.getByRole("button", { name: "닫기" });
    fireEvent.click(closeBtn);
    expect(DEFAULT_PROPS.onClose).toHaveBeenCalledTimes(1);
  });
});
