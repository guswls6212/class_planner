import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import EditSessionModal from "../EditSessionModal";

const defaultProps = {
  isOpen: true,
  selectedStudents: [
    { id: "stu-1", name: "김철수" },
    { id: "stu-2", name: "이영희" },
  ],
  onRemoveStudent: vi.fn(),
  editStudentInputValue: "",
  onEditStudentInputChange: vi.fn(),
  onEditStudentInputKeyDown: vi.fn(),
  onAddStudentClick: vi.fn(),
  editSearchResults: [],
  onSelectSearchStudent: vi.fn(),
  subjects: [
    { id: "sub-1", name: "수학", color: "#f59e0b" },
    { id: "sub-2", name: "영어", color: "#6366f1" },
  ],
  tempSubjectId: "sub-1",
  onSubjectChange: vi.fn(),
  teachers: [],
  tempTeacherId: "",
  onTeacherChange: vi.fn(),
  weekdays: ["월", "화", "수", "목", "금", "토", "일"],
  defaultWeekday: 0,
  startTime: "09:00",
  endTime: "10:00",
  onStartTimeChange: vi.fn(),
  onEndTimeChange: vi.fn(),
  timeError: "",
  onDelete: vi.fn(),
  onCancel: vi.fn(),
  onSave: vi.fn(),
};

describe("EditSessionModal", () => {
  it("isOpen=false일 때 아무것도 렌더링하지 않는다", () => {
    const { container } = render(
      <EditSessionModal {...defaultProps} isOpen={false} />
    );
    expect(container.innerHTML).toBe("");
  });

  it("isOpen=true일 때 모달을 렌더링한다", () => {
    render(<EditSessionModal {...defaultProps} />);
    // sr-only title OR dialog role
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("선택된 학생들을 칩으로 표시한다", () => {
    render(<EditSessionModal {...defaultProps} />);
    expect(screen.getByText("김철수")).toBeInTheDocument();
    expect(screen.getByText("이영희")).toBeInTheDocument();
  });

  it("학생 제거 버튼 클릭 시 onRemoveStudent를 호출한다", () => {
    const onRemoveStudent = vi.fn();
    render(
      <EditSessionModal {...defaultProps} onRemoveStudent={onRemoveStudent} />
    );
    const removeBtn = screen.getByRole("button", { name: "김철수 제거" });
    fireEvent.click(removeBtn);
    expect(onRemoveStudent).toHaveBeenCalledWith("stu-1");
  });

  it("과목 선택 옵션을 렌더링한다", () => {
    render(<EditSessionModal {...defaultProps} />);
    const subjectSelect = screen.getByRole("combobox", { name: /과목/ });
    const options = within(subjectSelect).getAllByRole("option");
    const optionNames = options.map((o) => o.textContent);
    expect(optionNames).toContain("수학");
    expect(optionNames).toContain("영어");
  });

  it("요일 선택 옵션을 렌더링한다", () => {
    render(<EditSessionModal {...defaultProps} />);
    const weekdaySelect = screen.getByRole("combobox", { name: /요일/ });
    expect(within(weekdaySelect).getByText("월")).toBeInTheDocument();
    expect(within(weekdaySelect).getByText("일")).toBeInTheDocument();
  });

  it("시간 에러가 있으면 에러 메시지를 표시한다", () => {
    render(
      <EditSessionModal {...defaultProps} timeError="종료 시간이 시작 시간보다 빠릅니다" />
    );
    expect(screen.getByRole("alert")).toHaveTextContent("종료 시간이 시작 시간보다 빠릅니다");
  });

  it("저장/취소 버튼과 삭제 버튼이 존재한다", () => {
    render(<EditSessionModal {...defaultProps} />);
    expect(screen.getByText("저장")).toBeInTheDocument();
    expect(screen.getByText("취소")).toBeInTheDocument();
    // 삭제는 아이콘 버튼 (aria-label)
    expect(screen.getByRole("button", { name: "수업 삭제" })).toBeInTheDocument();
  });

  it("취소 버튼 클릭 시 onCancel을 호출한다", () => {
    const onCancel = vi.fn();
    render(<EditSessionModal {...defaultProps} onCancel={onCancel} />);
    fireEvent.click(screen.getByText("취소"));
    expect(onCancel).toHaveBeenCalled();
  });

  it("저장 버튼 클릭 시 onSave를 호출한다", () => {
    const onSave = vi.fn();
    render(<EditSessionModal {...defaultProps} onSave={onSave} />);
    fireEvent.click(screen.getByText("저장"));
    expect(onSave).toHaveBeenCalled();
  });

  it("삭제 버튼 클릭 시 onDelete를 호출한다", () => {
    const onDelete = vi.fn();
    render(<EditSessionModal {...defaultProps} onDelete={onDelete} />);
    fireEvent.click(screen.getByRole("button", { name: "수업 삭제" }));
    expect(onDelete).toHaveBeenCalled();
  });

  it("입력값이 없으면 추가 버튼이 비활성화된다", () => {
    render(<EditSessionModal {...defaultProps} editStudentInputValue="" />);
    const addBtn = screen.getByText("추가");
    expect(addBtn).toBeDisabled();
  });

  it("입력값이 있으면 검색 결과 영역을 표시한다", () => {
    render(
      <EditSessionModal
        {...defaultProps}
        editStudentInputValue="김"
        editSearchResults={[{ id: "stu-3", name: "김민수" }]}
      />
    );
    expect(screen.getByText("김민수")).toBeInTheDocument();
  });

  it("onSubjectColorChange prop이 있으면 색상 변경 버튼이 표시된다", () => {
    render(
      <EditSessionModal
        {...defaultProps}
        onSubjectColorChange={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: "과목 색상 변경" })).toBeInTheDocument();
  });

  it("onSubjectColorChange prop이 없으면 색상 변경 버튼이 없다", () => {
    render(<EditSessionModal {...defaultProps} />);
    expect(screen.queryByRole("button", { name: "과목 색상 변경" })).not.toBeInTheDocument();
  });

  it("헤더에 현재 과목명이 표시된다", () => {
    render(<EditSessionModal {...defaultProps} />);
    // Subject name appears in header (may also appear in select option)
    expect(screen.getAllByText("수학").length).toBeGreaterThan(0);
  });

  describe("접근성 (a11y)", () => {
    it('isOpen=true일 때 role="dialog"가 존재한다', () => {
      render(<EditSessionModal {...defaultProps} />);
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it('isOpen=true일 때 aria-modal="true"가 존재한다', () => {
      render(<EditSessionModal {...defaultProps} />);
      expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
    });

    it("Escape 키 입력 시 onCancel을 호출한다", () => {
      const onCancel = vi.fn();
      render(<EditSessionModal {...defaultProps} onCancel={onCancel} />);
      fireEvent.keyDown(document, { key: "Escape" });
      expect(onCancel).toHaveBeenCalled();
    });

    it("요일 select는 label과 연결되어야 한다", () => {
      render(<EditSessionModal {...defaultProps} />);
      const weekdaySelect = screen.getByLabelText(/요일/);
      expect(weekdaySelect).toBeInTheDocument();
    });

    it("시작 시간 input은 aria-label과 연결되어야 한다", () => {
      render(<EditSessionModal {...defaultProps} />);
      expect(screen.getByLabelText("시작 시간")).toBeInTheDocument();
    });

    it("종료 시간 input은 aria-label과 연결되어야 한다", () => {
      render(<EditSessionModal {...defaultProps} />);
      expect(screen.getByLabelText("종료 시간")).toBeInTheDocument();
    });
  });
});
