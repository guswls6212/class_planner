import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ScheduleDailyView } from "../ScheduleDailyView";
import type { Session, Subject, Student, Enrollment, Teacher } from "@/lib/planner";

// --- Fixtures ---

const makeSubject = (id: string, name: string, color: string): Subject => ({
  id,
  name,
  color,
});

const makeStudent = (id: string, name: string): Student => ({
  id,
  name,
});

const makeEnrollment = (id: string, studentId: string, subjectId: string): Enrollment => ({
  id,
  studentId,
  subjectId,
});

const makeSession = (
  id: string,
  enrollmentIds: string[],
  weekday: number,
  startsAt = "09:00",
  endsAt = "10:00"
): Session => ({
  id,
  enrollmentIds,
  weekday,
  startsAt,
  endsAt,
  yPosition: 0,
});

const subject1 = makeSubject("subj-1", "수학", "#e74c3c");
const student1 = makeStudent("stu-1", "김철수");
const enrollment1 = makeEnrollment("enr-1", "stu-1", "subj-1");
const session1 = makeSession("sess-1", ["enr-1"], 1, "09:00", "10:00");

const defaultProps = {
  sessions: new Map([[1, [session1]]]),
  subjects: [subject1],
  students: [student1],
  enrollments: [enrollment1],
  teachers: [] as Teacher[],
  selectedWeekday: 1,
  colorBy: "subject" as const,
  onSessionClick: vi.fn(),
  onAddSession: vi.fn(),
};

describe("ScheduleDailyView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("최상위 컨테이너에 data-surface='surface'가 있다", () => {
    const { container } = render(<ScheduleDailyView {...defaultProps} />);
    expect(container.querySelector('[data-surface="surface"]')).not.toBeNull();
  });

  it("세션이 없으면 '수업이 없습니다' 메시지를 표시한다", () => {
    render(
      <ScheduleDailyView
        {...defaultProps}
        sessions={new Map()}
      />
    );
    expect(screen.getByText("수업이 없습니다")).toBeInTheDocument();
  });

  it("세션의 과목명을 SessionCard row를 통해 렌더링한다", () => {
    render(<ScheduleDailyView {...defaultProps} />);
    expect(screen.getByText("수학")).toBeInTheDocument();
  });

  it("SessionCard row가 data-variant='row'로 렌더된다", () => {
    const { container } = render(<ScheduleDailyView {...defaultProps} />);
    const rowEl = container.querySelector('[data-variant="row"]');
    expect(rowEl).not.toBeNull();
    expect(rowEl!.getAttribute("data-state")).toBe("default");
  });

  it("수업 시작 시각을 표시한다", () => {
    render(<ScheduleDailyView {...defaultProps} />);
    // startsAt appears in both the time label and the time range span
    const timeEls = screen.getAllByText("09:00");
    expect(timeEls.length).toBeGreaterThanOrEqual(1);
  });
});
