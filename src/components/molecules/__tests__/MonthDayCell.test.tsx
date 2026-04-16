import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MonthDayCell from "../MonthDayCell";
import type { Enrollment, Session, Subject } from "../../../lib/planner";

const makeSession = (id: string, enrollmentId: string): Session => ({
  id,
  enrollmentIds: [enrollmentId],
  weekday: 1,
  startsAt: "09:00",
  endsAt: "10:00",
  yPosition: 0,
});

const makeEnrollment = (id: string, subjectId: string): Enrollment => ({
  id,
  studentId: "student-1",
  subjectId,
});

const makeSubject = (id: string, name: string, color: string): Subject => ({
  id,
  name,
  color,
});

const today = new Date("2026-04-17T12:00:00");
const defaultProps = {
  date: today,
  sessions: [] as Session[],
  subjects: [] as Subject[],
  enrollments: [] as Enrollment[],
  isToday: false,
  isCurrentMonth: true,
  onDayClick: vi.fn(),
};

describe("MonthDayCell", () => {
  it("날짜 숫자를 렌더링한다", () => {
    render(<MonthDayCell {...defaultProps} />);
    expect(screen.getByText("17")).toBeInTheDocument();
  });

  it("세션이 없으면 칩을 렌더링하지 않는다", () => {
    render(<MonthDayCell {...defaultProps} />);
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
  });

  it("세션 3개 이하면 모두 칩으로 렌더링한다", () => {
    const subj = makeSubject("s1", "수학", "#ff0000");
    const enrollments = [
      makeEnrollment("e1", "s1"),
      makeEnrollment("e2", "s1"),
      makeEnrollment("e3", "s1"),
    ];
    const sessions = [
      makeSession("a", "e1"),
      makeSession("b", "e2"),
      makeSession("c", "e3"),
    ];
    render(
      <MonthDayCell
        {...defaultProps}
        sessions={sessions}
        subjects={[subj]}
        enrollments={enrollments}
      />
    );
    const chips = screen.getAllByRole("listitem");
    expect(chips).toHaveLength(3);
  });

  it("세션 4개면 3개 칩 + '+1' 뱃지를 표시한다", () => {
    const subj = makeSubject("s1", "수학", "#ff0000");
    const enrollments = [
      makeEnrollment("e1", "s1"),
      makeEnrollment("e2", "s1"),
      makeEnrollment("e3", "s1"),
      makeEnrollment("e4", "s1"),
    ];
    const sessions = [
      makeSession("a", "e1"),
      makeSession("b", "e2"),
      makeSession("c", "e3"),
      makeSession("d", "e4"),
    ];
    render(
      <MonthDayCell
        {...defaultProps}
        sessions={sessions}
        subjects={[subj]}
        enrollments={enrollments}
      />
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByText("+1")).toBeInTheDocument();
  });

  it("셀 클릭 시 onDayClick(date)가 호출된다", () => {
    const onDayClick = vi.fn();
    render(<MonthDayCell {...defaultProps} onDayClick={onDayClick} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onDayClick).toHaveBeenCalledWith(today);
  });

  it("isToday=true이면 오늘 강조 스타일이 적용된다", () => {
    render(<MonthDayCell {...defaultProps} isToday={true} />);
    const btn = screen.getByRole("button");
    expect(btn.querySelector("[data-today]")).not.toBeNull();
  });

  it("isCurrentMonth=false이면 날짜가 흐리게 표시된다", () => {
    render(<MonthDayCell {...defaultProps} isCurrentMonth={false} />);
    const btn = screen.getByRole("button");
    expect(btn.querySelector("[data-outside-month]")).not.toBeNull();
  });
});
