import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { TeacherDetailPanel } from "../TeacherDetailPanel";

const teacher = { id: "1", name: "김선생", color: "#6366f1" };

const sessions = [
  { id: "s1", teacherId: "1", weekday: 0, startsAt: "10:00", endsAt: "11:00", weekStartDate: "", enrollmentIds: ["e1"] },
  { id: "s2", teacherId: "1", weekday: 2, startsAt: "14:00", endsAt: "15:00", weekStartDate: "", enrollmentIds: ["e2"] },
  { id: "s3", teacherId: "2", weekday: 1, startsAt: "09:00", endsAt: "10:00", weekStartDate: "", enrollmentIds: [] },
];

const enrollments = [
  { id: "e1", studentId: "st1", subjectId: "sub1" },
  { id: "e2", studentId: "st2", subjectId: "sub1" },
];

const subjects = [{ id: "sub1", name: "수학", color: "#f59e0b" }];
const students = [
  { id: "st1", name: "홍길동" },
  { id: "st2", name: "이순신" },
];

const baseProps = {
  teacher,
  sessions,
  enrollments,
  subjects,
  students,
  onUpdate: vi.fn(),
  onDelete: vi.fn(),
  onBack: vi.fn(),
};

describe("TeacherDetailPanel", () => {
  beforeEach(() => vi.clearAllMocks());

  it("강사 이름과 메타 정보가 표시된다", () => {
    render(<TeacherDetailPanel {...baseProps} />);
    expect(screen.getAllByText("김선생").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/주간 2회/)).toBeInTheDocument();
    expect(screen.getByText(/담당 2명/)).toBeInTheDocument();
  });

  it("Summary Cards에 집계값이 정확히 표시된다", () => {
    render(<TeacherDetailPanel {...baseProps} />);
    expect(screen.getByText("2명")).toBeInTheDocument();
    expect(screen.getByText("2회")).toBeInTheDocument();
  });

  it("수업 일정에 과목명이 표시된다", () => {
    render(<TeacherDetailPanel {...baseProps} />);
    expect(screen.getAllByText("수학").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/월 10:00/)).toBeInTheDocument();
    expect(screen.getByText(/수 14:00/)).toBeInTheDocument();
  });

  it("편집 버튼 클릭 시 편집 모드로 전환된다", () => {
    render(<TeacherDetailPanel {...baseProps} />);
    fireEvent.click(screen.getByLabelText("편집"));
    expect(screen.getByDisplayValue("김선생")).toBeInTheDocument();
    expect(screen.getByText("저장")).toBeInTheDocument();
    expect(screen.getByText("취소")).toBeInTheDocument();
  });

  it("저장 버튼 클릭 시 onUpdate가 호출된다", () => {
    render(<TeacherDetailPanel {...baseProps} />);
    fireEvent.click(screen.getByLabelText("편집"));
    const nameInput = screen.getByDisplayValue("김선생");
    fireEvent.change(nameInput, { target: { value: "박선생" } });
    fireEvent.click(screen.getByText("저장"));
    expect(baseProps.onUpdate).toHaveBeenCalledWith("1", "박선생", "#6366f1");
  });

  it("취소 버튼 클릭 시 편집 모드가 닫힌다", () => {
    render(<TeacherDetailPanel {...baseProps} />);
    fireEvent.click(screen.getByLabelText("편집"));
    fireEvent.click(screen.getByText("취소"));
    expect(screen.queryByText("저장")).not.toBeInTheDocument();
  });

  it("삭제 버튼 클릭 시 onDelete가 호출된다", () => {
    render(<TeacherDetailPanel {...baseProps} />);
    fireEvent.click(screen.getByLabelText("삭제"));
    expect(baseProps.onDelete).toHaveBeenCalledWith("1");
  });

  it("담당 수업이 없을 때 빈 메시지가 표시된다", () => {
    render(<TeacherDetailPanel {...baseProps} sessions={[]} />);
    expect(screen.getByText("담당 수업이 없습니다.")).toBeInTheDocument();
  });
});
