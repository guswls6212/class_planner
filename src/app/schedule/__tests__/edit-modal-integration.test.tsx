import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Student, Subject } from "../../../lib/planner";
import EditSessionModal from "../_components/EditSessionModal";

// Mock CSS modules
vi.mock("../Schedule.module.css", () => ({
  default: {
    modalOverlay: "modal-overlay",
    modalContent: "modal-content",
    modalTitle: "modal-title",
    modalForm: "modal-form",
    studentTagsContainer: "student-tags-container",
    studentTag: "student-tag",
    removeStudentBtn: "remove-student-btn",
    studentInputContainer: "student-input-container",
    addStudentBtn: "add-student-btn",
    searchResults: "search-results",
    searchResult: "search-result",
    formGroup: "form-group",
    formInput: "form-input",
    formSelect: "form-select",
    timeError: "time-error",
    modalActions: "modal-actions",
    btnGroup: "btn-group",
    btn: "btn",
    btnSecondary: "btn-secondary",
    btnDanger: "btn-danger",
  },
}));

describe("EditSessionModal Integration Tests", () => {
  const mockStudents: Student[] = [
    { id: "student-1", name: "김철수" },
    { id: "student-2", name: "이영희" },
    { id: "student-3", name: "박민수" },
  ];

  const mockSubjects: Subject[] = [
    { id: "subject-1", name: "수학" },
    { id: "subject-2", name: "영어" },
  ];

  const mockSelectedStudents = [{ id: "student-1", name: "김철수" }];

  const defaultProps = {
    isOpen: true,
    selectedStudents: mockSelectedStudents,
    onRemoveStudent: vi.fn(),
    editStudentInputValue: "",
    onEditStudentInputChange: vi.fn(),
    onEditStudentInputKeyDown: vi.fn(),
    onAddStudentClick: vi.fn(),
    editSearchResults: [],
    onSelectSearchStudent: vi.fn(),
    subjects: mockSubjects.map((s) => ({ id: s.id, name: s.name })),
    tempSubjectId: "subject-1",
    onSubjectChange: vi.fn(),
    teachers: [],
    tempTeacherId: "",
    onTeacherChange: vi.fn(),
    weekdays: ["월", "화", "수", "목", "금"],
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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("편집 모달이 열렸을 때 선택된 학생들이 표시되어야 한다", () => {
    render(<EditSessionModal {...defaultProps} />);

    // 학생이 칩 또는 헤더에 1회 이상 표시됨
    expect(screen.getAllByText("김철수").length).toBeGreaterThan(0);
    // 수업 편집 타이틀 (sr-only h4 또는 BottomSheet title)
    expect(screen.getByText("수업 편집")).toBeInTheDocument();
  });

  it("학생 입력창에 값을 입력할 때 onEditStudentInputChange가 호출되어야 한다", () => {
    const onEditStudentInputChange = vi.fn();
    render(
      <EditSessionModal
        {...defaultProps}
        onEditStudentInputChange={onEditStudentInputChange}
      />
    );

    const input = screen.getByPlaceholderText(/학생 검색|검색…/);
    fireEvent.change(input, { target: { value: "이영희" } });

    expect(onEditStudentInputChange).toHaveBeenCalledWith("이영희");
  });

  it("검색어 + 매칭 결과 0 시 새 학생 추가 CTA 클릭이 onAddStudentClick을 호출한다", () => {
    const onAddStudentClick = vi.fn();
    render(
      <EditSessionModal
        {...defaultProps}
        editStudentInputValue="이영희"
        editSearchResults={[]}
        onAddStudentClick={onAddStudentClick}
      />
    );

    const ctaButton = screen.getByRole("button", { name: /새 학생으로 추가/ });
    fireEvent.click(ctaButton);

    expect(onAddStudentClick).toHaveBeenCalled();
  });

  it("학생 입력창이 비어있을 때 새 학생 추가 CTA 가 보이지 않는다", () => {
    render(<EditSessionModal {...defaultProps} editStudentInputValue="" />);

    expect(
      screen.queryByRole("button", { name: /새 학생으로 추가/ }),
    ).not.toBeInTheDocument();
  });

  it("검색어가 있고 매칭 결과 0 시 새 학생 추가 CTA 가 표시된다", () => {
    render(
      <EditSessionModal
        {...defaultProps}
        editStudentInputValue="이영희"
        editSearchResults={[]}
      />
    );

    expect(
      screen.getByRole("button", { name: /새 학생으로 추가/ }),
    ).toBeInTheDocument();
  });

  it("Enter 키를 눌렀을 때 onEditStudentInputKeyDown이 호출되어야 한다", () => {
    const onEditStudentInputKeyDown = vi.fn();
    render(
      <EditSessionModal
        {...defaultProps}
        onEditStudentInputKeyDown={onEditStudentInputKeyDown}
      />
    );

    const input = screen.getByPlaceholderText(/학생 검색|검색…/);
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onEditStudentInputKeyDown).toHaveBeenCalledWith(
      expect.objectContaining({ key: "Enter" })
    );
  });

  it("검색 결과가 있을 때 목록이 표시되어야 한다", () => {
    const searchResults = [
      { id: "student-2", name: "이영희" },
      { id: "student-3", name: "박민수" },
    ];

    render(
      <EditSessionModal
        {...defaultProps}
        editStudentInputValue="이"
        editSearchResults={searchResults}
      />
    );

    expect(screen.getByText("이영희")).toBeInTheDocument();
    expect(screen.getByText("박민수")).toBeInTheDocument();
  });

  it("검색 결과를 클릭할 때 onSelectSearchStudent가 호출되어야 한다", () => {
    const onSelectSearchStudent = vi.fn();
    const searchResults = [{ id: "student-2", name: "이영희" }];

    render(
      <EditSessionModal
        {...defaultProps}
        editStudentInputValue="이"
        editSearchResults={searchResults}
        onSelectSearchStudent={onSelectSearchStudent}
      />
    );

    const searchResult = screen.getByText("이영희");
    fireEvent.click(searchResult);

    expect(onSelectSearchStudent).toHaveBeenCalledWith("student-2");
  });

  it("학생 제거 버튼을 클릭할 때 onRemoveStudent가 호출되어야 한다", () => {
    const onRemoveStudent = vi.fn();
    render(
      <EditSessionModal {...defaultProps} onRemoveStudent={onRemoveStudent} />
    );

    const removeButton = screen.getByRole("button", { name: "김철수 제거" });
    fireEvent.click(removeButton);

    expect(onRemoveStudent).toHaveBeenCalledWith("student-1");
  });

  it("저장 버튼을 클릭할 때 onSave가 호출되어야 한다", () => {
    const onSave = vi.fn();
    render(<EditSessionModal {...defaultProps} onSave={onSave} />);

    const saveButton = screen.getByRole("button", { name: /저장/i });
    fireEvent.click(saveButton);

    expect(onSave).toHaveBeenCalled();
  });

  it("취소 버튼을 클릭할 때 onCancel이 호출되어야 한다", () => {
    const onCancel = vi.fn();
    render(<EditSessionModal {...defaultProps} onCancel={onCancel} />);

    const cancelButton = screen.getByRole("button", { name: /취소/i });
    fireEvent.click(cancelButton);

    expect(onCancel).toHaveBeenCalled();
  });

  it("삭제 버튼을 클릭할 때 onDelete가 호출되어야 한다", () => {
    const onDelete = vi.fn();
    render(<EditSessionModal {...defaultProps} onDelete={onDelete} />);

    const deleteButton = screen.getByRole("button", { name: /삭제/i });
    fireEvent.click(deleteButton);

    expect(onDelete).toHaveBeenCalled();
  });

  it("시간 에러가 있을 때 에러 메시지가 표시되어야 한다", () => {
    const timeError = "시간이 올바르지 않습니다.";
    render(<EditSessionModal {...defaultProps} timeError={timeError} />);

    expect(screen.getByText(timeError)).toBeInTheDocument();
  });

  it("isOpen이 false일 때 모달이 렌더링되지 않아야 한다", () => {
    render(<EditSessionModal {...defaultProps} isOpen={false} />);

    expect(screen.queryByText("수업 편집")).not.toBeInTheDocument();
  });

  it("선택된 학생이 여러 명일 때 모두 표시되어야 한다", () => {
    const multipleStudents = [
      { id: "student-1", name: "김철수" },
      { id: "student-2", name: "이영희" },
      { id: "student-3", name: "박민수" },
    ];

    render(
      <EditSessionModal {...defaultProps} selectedStudents={multipleStudents} />
    );

    expect(screen.getByText("김철수")).toBeInTheDocument();
    expect(screen.getByText("이영희")).toBeInTheDocument();
    expect(screen.getByText("박민수")).toBeInTheDocument();
  });

  it("과목 선택 드롭다운이 올바르게 렌더링되어야 한다", () => {
    render(<EditSessionModal {...defaultProps} />);

    const subjectSelect = screen.getByDisplayValue("수학");
    expect(subjectSelect).toBeInTheDocument();
  });

  it("요일 선택 드롭다운이 올바르게 렌더링되어야 한다", () => {
    render(<EditSessionModal {...defaultProps} />);

    const weekdaySelect = screen.getByDisplayValue("월");
    expect(weekdaySelect).toBeInTheDocument();
  });

  it("시작 시간과 종료 시간 입력이 올바르게 렌더링되어야 한다", () => {
    render(<EditSessionModal {...defaultProps} />);

    const startTimeInput = screen.getByDisplayValue("09:00");
    const endTimeInput = screen.getByDisplayValue("10:00");

    expect(startTimeInput).toBeInTheDocument();
    expect(endTimeInput).toBeInTheDocument();
  });
});
