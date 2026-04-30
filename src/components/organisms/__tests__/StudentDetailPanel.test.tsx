import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { StudentDetailPanel } from "../StudentDetailPanel";
import type { Student, Subject, Enrollment, Session } from "@/lib/planner";

const mockStudent: Student = {
  id: "s1",
  name: "김민준",
  grade: "중2",
  school: "서울중학교",
  phone: "010-1234-5678",
  gender: "남",
  birthDate: "2010-03-15",
};

const mockSubjects: Subject[] = [
  { id: "sub1", name: "수학", color: "#a78bfa" },
];

const mockEnrollments: Enrollment[] = [
  { id: "e1", studentId: "s1", subjectId: "sub1" },
];

const mockSessions: Session[] = [
  {
    id: "sess1",
    weekday: 0,
    startsAt: "14:00",
    endsAt: "15:00",
    weekStartDate: "",
    enrollmentIds: ["e1"],
  },
];

describe("StudentDetailPanel", () => {
  it("renders student name and profile info", () => {
    render(
      <StudentDetailPanel
        student={mockStudent}
        subjects={mockSubjects}
        enrollments={mockEnrollments}
        sessions={mockSessions}
        onUpdate={vi.fn().mockResolvedValue(true)}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getByText("김민준")).toBeInTheDocument();
    expect(screen.getAllByText(/중2/).length).toBeGreaterThanOrEqual(1);
  });

  it("shows stats cards with correct counts", () => {
    render(
      <StudentDetailPanel
        student={mockStudent}
        subjects={mockSubjects}
        enrollments={mockEnrollments}
        sessions={mockSessions}
        onUpdate={vi.fn().mockResolvedValue(true)}
        onDelete={vi.fn()}
      />
    );
    // 1 subject enrolled
    expect(screen.getByText("1")).toBeInTheDocument();
    // 1 session
    expect(screen.getByText("1회")).toBeInTheDocument();
  });

  it("shows session schedule with weekday and time", () => {
    render(
      <StudentDetailPanel
        student={mockStudent}
        subjects={mockSubjects}
        enrollments={mockEnrollments}
        sessions={mockSessions}
        onUpdate={vi.fn().mockResolvedValue(true)}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getAllByText(/월/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/14:00/)).toBeInTheDocument();
  });

  it("toggles edit mode on pencil button click", () => {
    render(
      <StudentDetailPanel
        student={mockStudent}
        subjects={mockSubjects}
        enrollments={mockEnrollments}
        sessions={mockSessions}
        onUpdate={vi.fn().mockResolvedValue(true)}
        onDelete={vi.fn()}
      />
    );
    const editBtn = screen.getByLabelText("편집");
    fireEvent.click(editBtn);
    expect(screen.getByDisplayValue("김민준")).toBeInTheDocument();
    expect(screen.getByDisplayValue("중2")).toBeInTheDocument();
  });

  it("calls onUpdate with edited fields on save", async () => {
    const onUpdate = vi.fn().mockResolvedValue(true);
    render(
      <StudentDetailPanel
        student={mockStudent}
        subjects={mockSubjects}
        enrollments={mockEnrollments}
        sessions={mockSessions}
        onUpdate={onUpdate}
        onDelete={vi.fn()}
      />
    );
    fireEvent.click(screen.getByLabelText("편집"));
    const gradeInput = screen.getByDisplayValue("중2");
    fireEvent.change(gradeInput, { target: { value: "중3" } });
    fireEvent.click(screen.getByText("저장"));
    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith(
        "s1",
        expect.objectContaining({ grade: "중3" })
      );
    });
  });

  it("calls onDelete when delete button is clicked", () => {
    const onDelete = vi.fn();
    render(
      <StudentDetailPanel
        student={mockStudent}
        subjects={mockSubjects}
        enrollments={mockEnrollments}
        sessions={mockSessions}
        onUpdate={vi.fn().mockResolvedValue(true)}
        onDelete={onDelete}
      />
    );
    fireEvent.click(screen.getByLabelText("삭제"));
    expect(onDelete).toHaveBeenCalledWith("s1");
  });

  it("shows back button when onBack is provided", () => {
    const onBack = vi.fn();
    render(
      <StudentDetailPanel
        student={mockStudent}
        subjects={mockSubjects}
        enrollments={mockEnrollments}
        sessions={mockSessions}
        onUpdate={vi.fn().mockResolvedValue(true)}
        onDelete={vi.fn()}
        onBack={onBack}
      />
    );
    const backBtn = screen.getByLabelText("목록으로");
    fireEvent.click(backBtn);
    expect(onBack).toHaveBeenCalled();
  });

  it("does not show back button when onBack is not provided", () => {
    render(
      <StudentDetailPanel
        student={mockStudent}
        subjects={mockSubjects}
        enrollments={mockEnrollments}
        sessions={mockSessions}
        onUpdate={vi.fn().mockResolvedValue(true)}
        onDelete={vi.fn()}
      />
    );
    expect(screen.queryByLabelText("목록으로")).not.toBeInTheDocument();
  });

  it("shows empty schedule message when student has no sessions", () => {
    render(
      <StudentDetailPanel
        student={mockStudent}
        subjects={mockSubjects}
        enrollments={[]}
        sessions={[]}
        onUpdate={vi.fn().mockResolvedValue(true)}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getByText("등록된 수업이 없습니다.")).toBeInTheDocument();
  });

  it("exits edit mode on cancel button click", () => {
    render(
      <StudentDetailPanel
        student={mockStudent}
        subjects={mockSubjects}
        enrollments={mockEnrollments}
        sessions={mockSessions}
        onUpdate={vi.fn().mockResolvedValue(true)}
        onDelete={vi.fn()}
      />
    );
    fireEvent.click(screen.getByLabelText("편집"));
    expect(screen.getByDisplayValue("김민준")).toBeInTheDocument();
    fireEvent.click(screen.getByText("취소"));
    expect(screen.queryByDisplayValue("김민준")).not.toBeInTheDocument();
  });
});
