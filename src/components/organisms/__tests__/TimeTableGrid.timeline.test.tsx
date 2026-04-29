import { render, screen } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import type { Session, Subject } from "../../../lib/planner";
import TimeTableGrid from "../TimeTableGrid";

// 2026-04-29 is a Wednesday (getDay()=3 → (3+6)%7=2 → weekday index 2 = Wed)
// The week containing 2026-04-29: Mon 04-27, Tue 04-28, Wed 04-29, ...
// We pick 14:07 so minutesSince9 = (14-9)*60+7 = 307, within 0..870
// 14:07 is not a slot boundary (slots are on :00 and :30) — no collision with time labels
const MOCK_NOW = new Date("2026-04-29T14:07:00.000");

const mockSubjects: Subject[] = [{ id: "1", name: "수학", color: "#ff0000" }];
const mockSessions = new Map<number, Session[]>();
const mockEnrollments: { id: string; studentId: string; subjectId: string }[] = [];
const mockStudents: { id: string; name: string }[] = [];

const defaultProps = {
  sessions: mockSessions,
  subjects: mockSubjects,
  enrollments: mockEnrollments,
  students: mockStudents,
  onSessionClick: vi.fn(),
  onDrop: vi.fn(),
  onEmptySpaceClick: vi.fn(),
  isAnyDragging: false,
  isStudentDragging: false,
};

describe("TimeTableGrid — real-time timeline", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(MOCK_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("현재 시각 선 래퍼가 zIndex 150으로 렌더링된다", () => {
    render(<TimeTableGrid {...defaultProps} />);

    const indicator = screen.getByLabelText("현재 시각");
    expect(indicator).toBeInTheDocument();
    expect(indicator).toHaveStyle({ zIndex: "150" });
  });

  it("HH:MM pill이 현재 시각 텍스트를 포함한다", () => {
    render(<TimeTableGrid {...defaultProps} />);

    // 14:07 is not a slot boundary so it won't collide with time-label column text
    expect(screen.getByText("14:07")).toBeInTheDocument();
  });

  it("현재 시각 선 래퍼에 transition 스타일이 있다", () => {
    render(<TimeTableGrid {...defaultProps} />);

    const indicator = screen.getByLabelText("현재 시각");
    expect(indicator).toHaveStyle({ transition: "top 0.5s ease-out" });
  });

  it("09:00 이전 시각에는 현재 시각 선이 렌더링되지 않는다", () => {
    // Mock useNowMinute to return 08:30 (before 09:00)
    vi.setSystemTime(new Date("2026-04-29T08:30:00.000"));

    render(<TimeTableGrid {...defaultProps} />);

    // Verify no aria-label="현재 시각" element in DOM
    expect(screen.queryByLabelText("현재 시각")).not.toBeInTheDocument();
  });
});
