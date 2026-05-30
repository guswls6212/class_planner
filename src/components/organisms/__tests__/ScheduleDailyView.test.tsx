import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ScheduleDailyView } from "../ScheduleDailyView";
import type { Session, Subject, Student, Enrollment, Teacher } from "@/lib/planner";

// --- Fixtures (격리 — sess-1/stu-1/subj-1 hardcoded OK) ---

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
  endsAt = "10:00",
): Session => ({
  id,
  enrollmentIds,
  weekday,
  startsAt,
  endsAt,
  weekStartDate: "2026-05-18",
  yPosition: 1,
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

describe("ScheduleDailyView (A+C 혼합)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("최상위 컨테이너가 렌더링된다", () => {
    render(<ScheduleDailyView {...defaultProps} />);
    expect(
      screen.getByTestId("schedule-daily-view"),
    ).toBeInTheDocument();
  });

  it("세션이 없으면 '수업이 없습니다' 메시지를 표시한다", () => {
    render(<ScheduleDailyView {...defaultProps} sessions={new Map()} />);
    expect(screen.getByText("수업이 없습니다")).toBeInTheDocument();
  });

  it("Timeline 에 session button 이 data-testid 로 렌더된다", () => {
    render(<ScheduleDailyView {...defaultProps} />);
    expect(screen.getByTestId("daily-session-sess-1")).toBeInTheDocument();
  });

  it("session button 에 과목명과 시작 시각이 표시된다", () => {
    render(<ScheduleDailyView {...defaultProps} />);
    const btn = screen.getByTestId("daily-session-sess-1");
    expect(btn).toHaveTextContent("수학");
    expect(btn).toHaveTextContent("09:00");
  });

  it("자동 선택된 session 의 detail panel 이 표시된다 (subject 제목)", () => {
    render(<ScheduleDailyView {...defaultProps} />);
    // 첫 진입 시 sess-1 자동 선택 (단일 session)
    expect(screen.getByTestId("detail-subject-name")).toHaveTextContent("수학");
  });

  it("detail panel 의 '편집' 버튼 클릭 시 onSessionClick 호출", () => {
    const onSessionClick = vi.fn();
    render(
      <ScheduleDailyView {...defaultProps} onSessionClick={onSessionClick} />,
    );
    fireEvent.click(screen.getByTestId("detail-edit-btn"));
    expect(onSessionClick).toHaveBeenCalledWith(session1);
  });
});

// --- 필터 dim parity (ADR-020 R5 Full Parity) ---

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
  colorBy: "subject" as const,
  onSessionClick: vi.fn(),
};

describe("ScheduleDailyView — 필터 dim parity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("selectedStudentIds=['stu-1']: 매칭 session 의 opacity 는 0.25 아님", () => {
    render(
      <ScheduleDailyView
        {...twoSessionProps}
        selectedStudentIds={["stu-1"]}
      />,
    );
    const btn = screen.getByTestId("daily-session-sess-1");
    expect(btn.style.opacity).not.toBe("0.25");
  });

  it("selectedStudentIds=['stu-1']: 비매칭 session 의 opacity 는 0.25 dim", () => {
    render(
      <ScheduleDailyView
        {...twoSessionProps}
        selectedStudentIds={["stu-1"]}
      />,
    );
    // sess-2 has stu-2 only → 비매칭
    const btn = screen.getByTestId("daily-session-sess-2");
    expect(btn.style.opacity).toBe("0.25");
  });

  it("필터 없음: 모든 session 의 opacity 는 1 (dim X)", () => {
    render(<ScheduleDailyView {...twoSessionProps} />);
    expect(
      screen.getByTestId("daily-session-sess-1").style.opacity,
    ).not.toBe("0.25");
    expect(
      screen.getByTestId("daily-session-sess-2").style.opacity,
    ).not.toBe("0.25");
  });
});

// --- read-only 출결 진입 (teacher-schedule, allowReadOnlySessionClick) ---

describe("ScheduleDailyView — read-only 출결 진입", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("readOnly + allowReadOnlySessionClick: '출결 체크' 버튼 노출 + 클릭 시 onSessionClick", () => {
    const onSessionClick = vi.fn();
    render(
      <ScheduleDailyView
        {...defaultProps}
        onSessionClick={onSessionClick}
        readOnly
        allowReadOnlySessionClick
      />,
    );
    const btn = screen.getByTestId("detail-attendance-btn");
    expect(btn).toHaveTextContent("출결 체크");
    expect(screen.queryByTestId("detail-edit-btn")).not.toBeInTheDocument();
    fireEvent.click(btn);
    expect(onSessionClick).toHaveBeenCalledWith(session1);
  });

  it("readOnly (allow 없음): footer 액션 버튼 없음 (공유 view)", () => {
    render(<ScheduleDailyView {...defaultProps} readOnly />);
    expect(
      screen.queryByTestId("detail-attendance-btn"),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId("detail-edit-btn")).not.toBeInTheDocument();
  });

  it("readOnly: 내부 메모(internalNote)를 숨긴다 (강사/공유 view)", () => {
    const sessionWithNote: Session = {
      ...session1,
      internalNote: "운영자 전용 메모",
    };
    render(
      <ScheduleDailyView
        {...defaultProps}
        sessions={new Map([[1, [sessionWithNote]]])}
        readOnly
        allowReadOnlySessionClick
      />,
    );
    expect(
      screen.queryByTestId("detail-internal-note"),
    ).not.toBeInTheDocument();
  });

  it("비-readOnly: 내부 메모를 표시한다 (운영자)", () => {
    const sessionWithNote: Session = {
      ...session1,
      internalNote: "운영자 전용 메모",
    };
    render(
      <ScheduleDailyView
        {...defaultProps}
        sessions={new Map([[1, [sessionWithNote]]])}
      />,
    );
    expect(screen.getByTestId("detail-internal-note")).toHaveTextContent(
      "운영자 전용 메모",
    );
  });
});
