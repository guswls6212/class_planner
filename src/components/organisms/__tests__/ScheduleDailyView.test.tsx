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
  weekStartDate: "",
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
};

describe("ScheduleDailyView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("최상위 컨테이너가 렌더링된다", () => {
    const { container } = render(<ScheduleDailyView {...defaultProps} />);
    expect(container.firstChild).not.toBeNull();
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

// --- colorBy + selectedStudentIds parity tests ---

const student2 = makeStudent("stu-2", "이영희");
const enrollment2 = makeEnrollment("enr-2", "stu-2", "subj-1");
const session2 = makeSession("sess-2", ["enr-2"], 1, "10:00", "11:00");

const twoSessionProps = {
  sessions: new Map([[1, [session1, session2]]]),
  subjects: [subject1],
  students: [student1, student2],
  enrollments: [enrollment1, enrollment2],
  teachers: [] as Teacher[],
  selectedWeekday: 1,
  colorBy: "student" as const,
  onSessionClick: vi.fn(),
};

describe("ScheduleDailyView — colorBy + selectedStudentIds parity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("colorBy='student', selectedStudentIds=['stu-1']: 해당 세션의 row wrapper는 dim되지 않는다", () => {
    const { container } = render(
      <ScheduleDailyView
        {...twoSessionProps}
        selectedStudentIds={["stu-1"]}
      />
    );
    const sessionEl = container.querySelector('[data-testid="daily-session-sess-1"]');
    expect(sessionEl).not.toBeNull();
    // wrapper div has data-variant="row"; its style.opacity should not be "0.25"
    const wrapperDiv = sessionEl!.closest('[data-variant="row"]')?.parentElement ?? sessionEl;
    // The row element itself carries the wrapper style
    const rowEl = sessionEl!.querySelector('[data-variant="row"]') ?? sessionEl!.closest('[data-variant="row"]');
    expect(rowEl).not.toBeNull();
    // opacity should NOT be 0.25 for the highlighted session
    expect((rowEl as HTMLElement).style.opacity).not.toBe("0.25");
  });

  it("colorBy='student', selectedStudentIds=['stu-1']: 비포함 세션의 row wrapper는 opacity 0.25(dimmed)", () => {
    const { container } = render(
      <ScheduleDailyView
        {...twoSessionProps}
        selectedStudentIds={["stu-1"]}
      />
    );
    // sess-2 contains stu-2, not stu-1 → should be dimmed
    const rowEl = container.querySelector('[data-testid="daily-session-sess-2"]')
      ?.closest('[data-variant="row"]');
    expect(rowEl).not.toBeNull();
    expect((rowEl as HTMLElement).style.opacity).toBe("0.25");
  });
});
