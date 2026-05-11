import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { TeacherDetailPanel } from "../TeacherDetailPanel";
import type { Teacher } from "@/lib/planner";

const teacher: Teacher = {
  id: "1",
  name: "김선생",
  color: "#6366f1",
  email: "kim@example.com",
  phone: "010-1234-5678",
  role: "admin",
  notes: "메모 내용",
  subjectIds: ["sub1"],
};

const sessions = [
  { id: "s1", teacherId: "1", weekday: 0, startsAt: "10:00", endsAt: "11:00", weekStartDate: "", enrollmentIds: ["e1"] },
  { id: "s2", teacherId: "1", weekday: 2, startsAt: "14:00", endsAt: "15:00", weekStartDate: "", enrollmentIds: ["e2"] },
  { id: "s3", teacherId: "2", weekday: 1, startsAt: "09:00", endsAt: "10:00", weekStartDate: "", enrollmentIds: [] },
];

const enrollments = [
  { id: "e1", studentId: "st1", subjectId: "sub1" },
  { id: "e2", studentId: "st2", subjectId: "sub1" },
];

const subjects = [
  { id: "sub1", name: "수학", color: "#f59e0b" },
  { id: "sub2", name: "영어", color: "#10b981" },
];

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
  onAddSubject: vi.fn(),
  onRemoveSubject: vi.fn(),
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
    expect(screen.getByText(/월 10:00/)).toBeInTheDocument();
    expect(screen.getByText(/수 14:00/)).toBeInTheDocument();
  });

  it("view 모드(default)에서는 담당으로 등록된 과목만 표시된다", () => {
    render(<TeacherDetailPanel {...baseProps} />);
    // sub1(수학)은 담당이라 표시. sub2(영어)는 미배정이라 숨김.
    expect(screen.getAllByText("수학").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("영어")).not.toBeInTheDocument();
  });

  it("편집 모드 진입 시 모든 아카데미 과목이 토글 가능 칩으로 렌더된다", () => {
    render(<TeacherDetailPanel {...baseProps} />);
    fireEvent.click(screen.getByLabelText("편집"));
    expect(screen.getAllByText("수학").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("영어")).toBeInTheDocument();
  });

  it("편집 모드에서 미배정 과목 칩 클릭 시 onAddSubject가 호출된다", () => {
    render(<TeacherDetailPanel {...baseProps} />);
    fireEvent.click(screen.getByLabelText("편집"));
    const englishChip = screen.getByRole("button", { name: /영어/ });
    fireEvent.click(englishChip);
    expect(baseProps.onAddSubject).toHaveBeenCalledWith("1", "sub2");
  });

  it("편집 모드에서 배정된 과목 칩 클릭 시 onRemoveSubject가 호출된다", () => {
    render(<TeacherDetailPanel {...baseProps} />);
    fireEvent.click(screen.getByLabelText("편집"));
    const mathChips = screen.getAllByRole("button", { name: /수학/ });
    const assignedChip = mathChips.find(
      (btn) => btn.getAttribute("aria-pressed") === "true"
    );
    expect(assignedChip).toBeDefined();
    fireEvent.click(assignedChip!);
    expect(baseProps.onRemoveSubject).toHaveBeenCalledWith("1", "sub1");
  });

  it("편집 버튼 클릭 시 편집 모드로 전환되고 이메일/전화/역할/메모 필드가 표시된다", () => {
    render(<TeacherDetailPanel {...baseProps} />);
    fireEvent.click(screen.getByLabelText("편집"));
    expect(screen.getByDisplayValue("김선생")).toBeInTheDocument();
    expect(screen.getByDisplayValue("kim@example.com")).toBeInTheDocument();
    expect(screen.getByDisplayValue("010-1234-5678")).toBeInTheDocument();
    expect(screen.getByDisplayValue("메모 내용")).toBeInTheDocument();
    expect(screen.getByText("저장")).toBeInTheDocument();
    expect(screen.getByText("취소")).toBeInTheDocument();
  });

  it("저장 버튼 클릭 시 onUpdate가 모든 필드(이름·이메일·전화·메모·색상)를 포함하여 호출된다", () => {
    // ADR-015: 색상은 폼 안에 통합돼 저장 버튼 클릭 시 함께 commit.
    // role은 detail에서 변경 불가 (settings membership flow가 SSOT) — onUpdate에 포함 X.
    render(<TeacherDetailPanel {...baseProps} />);
    fireEvent.click(screen.getByLabelText("편집"));
    const nameInput = screen.getByDisplayValue("김선생");
    fireEvent.change(nameInput, { target: { value: "박선생" } });
    fireEvent.click(screen.getByText("저장"));
    expect(baseProps.onUpdate).toHaveBeenCalledWith("1", {
      name: "박선생",
      color: "#6366f1",
      email: "kim@example.com",
      phone: "010-1234-5678",
      notes: "메모 내용",
    });
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

  it("색상 swatch 클릭은 preview만 — onUpdate는 저장 버튼 클릭 시 commit (ADR-015)", () => {
    render(<TeacherDetailPanel {...baseProps} />);
    fireEvent.click(screen.getByLabelText("편집"));
    const colorButtons = screen.getAllByLabelText(/#[0-9a-fA-F]{6}/);
    fireEvent.click(colorButtons[0]);
    // autosave 제거됨 — swatch 클릭만으로는 onUpdate 호출 X
    expect(baseProps.onUpdate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("저장"));
    expect(baseProps.onUpdate).toHaveBeenCalledWith(
      "1",
      expect.objectContaining({ color: expect.any(String) }),
    );
  });
});
