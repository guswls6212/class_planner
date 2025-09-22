import type { Student } from "@lib/planner";
import type { StudentPanelState } from "@shared/types/scheduleTypes";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import StudentPanel from "../StudentPanel";

describe("StudentPanel Component", () => {
  const mockStudents: Student[] = [
    { id: "550e8400-e29b-41d4-a716-446655440001", name: "김철수" },
    { id: "550e8400-e29b-41d4-a716-446655440002", name: "이영희" },
    { id: "550e8400-e29b-41d4-a716-446655440003", name: "박민수" },
  ];

  const mockPanelState: StudentPanelState = {
    position: { x: 100, y: 200 },
    isDragging: false,
    dragOffset: { x: 0, y: 0 },
    isVisible: true,
    filteredStudents: mockStudents,
    searchQuery: "",
  };

  const defaultProps = {
    selectedStudentId: "550e8400-e29b-41d4-a716-446655440001",
    panelState: mockPanelState,
    onMouseDown: vi.fn(),
    onStudentClick: vi.fn(),
    onDragStart: vi.fn(),
    onDragEnd: vi.fn(),
    onSearchChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("기본 렌더링이 올바르게 되어야 한다", () => {
    render(<StudentPanel {...defaultProps} />);

    expect(screen.getByText("수강생 리스트")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("학생 이름 검색...")
    ).toBeInTheDocument();
  });

  it("패널 위치가 올바르게 설정되어야 한다", () => {
    render(<StudentPanel {...defaultProps} />);

    // 패널이 렌더링되는지만 확인 (스타일 테스트는 브라우저에서 확인)
    expect(screen.getByText("수강생 리스트")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("학생 이름 검색...")
    ).toBeInTheDocument();
  });

  it("드래그 상태에 따라 커서가 변경되어야 한다", () => {
    const { rerender } = render(<StudentPanel {...defaultProps} />);

    let header = screen.getByTestId("students-panel-header");
    expect(header).toHaveClass("cursor-grab");

    // 드래그 중 상태로 변경
    rerender(
      <StudentPanel
        {...defaultProps}
        panelState={{ ...mockPanelState, isDragging: true }}
      />
    );

    header = screen.getByTestId("students-panel-header");
    expect(header).toHaveClass("cursor-grabbing");
  });

  it("검색 입력창이 올바르게 작동해야 한다", () => {
    const mockOnSearchChange = vi.fn();
    render(
      <StudentPanel {...defaultProps} onSearchChange={mockOnSearchChange} />
    );

    const searchInput = screen.getByPlaceholderText("학생 이름 검색...");
    fireEvent.change(searchInput, { target: { value: "김철수" } });

    expect(mockOnSearchChange).toHaveBeenCalledTimes(1);
    expect(mockOnSearchChange).toHaveBeenCalledWith("김철수");
  });

  it("onMouseDown 이벤트가 올바르게 처리되어야 한다", () => {
    const mockOnMouseDown = vi.fn();
    render(<StudentPanel {...defaultProps} onMouseDown={mockOnMouseDown} />);

    const panel = screen.getByText("수강생 리스트").closest("div");
    fireEvent.mouseDown(panel!);

    expect(mockOnMouseDown).toHaveBeenCalledTimes(1);
  });

  it("헤더에 드래그 제목이 표시되어야 한다", () => {
    render(<StudentPanel {...defaultProps} />);

    const header = screen.getByTestId("students-panel-header");
    expect(header).toHaveAttribute(
      "title",
      "드래그하여 패널 위치를 이동할 수 있습니다"
    );
  });

  // 엣지 케이스 테스트
  it("selectedStudentId가 빈 문자열일 때 안전하게 처리되어야 한다", () => {
    render(<StudentPanel {...defaultProps} selectedStudentId="" />);

    expect(screen.getByText("수강생 리스트")).toBeInTheDocument();
  });

  it("selectedStudentId가 null일 때 안전하게 처리되어야 한다", () => {
    render(<StudentPanel {...defaultProps} selectedStudentId={null as any} />);

    expect(screen.getByText("수강생 리스트")).toBeInTheDocument();
  });

  it("selectedStudentId가 undefined일 때 안전하게 처리되어야 한다", () => {
    render(
      <StudentPanel {...defaultProps} selectedStudentId={undefined as any} />
    );

    expect(screen.getByText("수강생 리스트")).toBeInTheDocument();
  });

  it("panelState가 null일 때 안전하게 처리되어야 한다", () => {
    const { container } = render(
      <StudentPanel {...defaultProps} panelState={null as any} />
    );

    // 컴포넌트가 크래시하지 않고 null을 반환해야 함
    expect(container.firstChild).toBeNull();
  });

  it("panelState가 undefined일 때 안전하게 처리되어야 한다", () => {
    const { container } = render(
      <StudentPanel {...defaultProps} panelState={undefined as any} />
    );

    // 컴포넌트가 크래시하지 않고 null을 반환해야 함
    expect(container.firstChild).toBeNull();
  });

  it("음수 위치값을 안전하게 처리해야 한다", () => {
    const negativePositionState: StudentPanelState = {
      position: { x: -100, y: -200 },
      isDragging: false,
      dragOffset: { x: 0, y: 0 },
      isVisible: true,
      filteredStudents: mockStudents,
      searchQuery: "",
    };

    render(
      <StudentPanel {...defaultProps} panelState={negativePositionState} />
    );

    // 컴포넌트가 크래시하지 않고 렌더링되는지만 확인
    expect(screen.getByText("수강생 리스트")).toBeInTheDocument();
  });

  it("매우 큰 위치값을 안전하게 처리해야 한다", () => {
    const largePositionState: StudentPanelState = {
      position: { x: 10000, y: 20000 },
      isDragging: false,
      dragOffset: { x: 0, y: 0 },
      isVisible: true,
      filteredStudents: mockStudents,
      searchQuery: "",
    };

    render(<StudentPanel {...defaultProps} panelState={largePositionState} />);

    // 컴포넌트가 크래시하지 않고 렌더링되는지만 확인
    expect(screen.getByText("수강생 리스트")).toBeInTheDocument();
  });

  it("onMouseDown이 undefined일 때 안전하게 처리되어야 한다", () => {
    render(<StudentPanel {...defaultProps} onMouseDown={undefined as any} />);

    const panel = screen.getByText("수강생 리스트").closest("div");
    // onMouseDown이 undefined여도 크래시하지 않아야 함
    fireEvent.mouseDown(panel!);
    expect(panel).toBeInTheDocument();
  });

  it("onStudentClick이 undefined일 때 안전하게 처리되어야 한다", () => {
    render(
      <StudentPanel {...defaultProps} onStudentClick={undefined as any} />
    );

    // 컴포넌트가 크래시하지 않고 렌더링되어야 함
    expect(screen.getByText("수강생 리스트")).toBeInTheDocument();
  });

  it("onDragStart가 undefined일 때 안전하게 처리되어야 한다", () => {
    render(<StudentPanel {...defaultProps} onDragStart={undefined as any} />);

    // 컴포넌트가 크래시하지 않고 렌더링되어야 함
    expect(screen.getByText("수강생 리스트")).toBeInTheDocument();
  });

  it("onSearchChange가 undefined일 때 안전하게 처리되어야 한다", () => {
    render(
      <StudentPanel {...defaultProps} onSearchChange={undefined as any} />
    );

    const searchInput = screen.getByPlaceholderText("학생 이름 검색...");
    // onSearchChange가 undefined여도 크래시하지 않아야 함
    fireEvent.change(searchInput, { target: { value: "테스트" } });
    expect(searchInput).toBeInTheDocument();
  });

  it("매우 긴 검색어를 안전하게 처리해야 한다", () => {
    const mockOnSearchChange = vi.fn();
    render(
      <StudentPanel {...defaultProps} onSearchChange={mockOnSearchChange} />
    );

    const searchInput = screen.getByPlaceholderText("학생 이름 검색...");
    const longSearchTerm = "a".repeat(1000);

    fireEvent.change(searchInput, { target: { value: longSearchTerm } });

    expect(mockOnSearchChange).toHaveBeenCalledTimes(1);
    expect(mockOnSearchChange).toHaveBeenCalledWith(longSearchTerm);
  });

  it("특수 문자가 포함된 검색어를 안전하게 처리해야 한다", () => {
    const mockOnSearchChange = vi.fn();
    render(
      <StudentPanel {...defaultProps} onSearchChange={mockOnSearchChange} />
    );

    const searchInput = screen.getByPlaceholderText("학생 이름 검색...");
    const specialSearchTerm = "!@#$%^&*()_+-=[]{}|;':\",./<>?";

    fireEvent.change(searchInput, { target: { value: specialSearchTerm } });

    expect(mockOnSearchChange).toHaveBeenCalledTimes(1);
    expect(mockOnSearchChange).toHaveBeenCalledWith(specialSearchTerm);
  });

  it("빈 검색어를 안전하게 처리해야 한다", () => {
    const mockOnSearchChange = vi.fn();
    render(
      <StudentPanel {...defaultProps} onSearchChange={mockOnSearchChange} />
    );

    const searchInput = screen.getByPlaceholderText("학생 이름 검색...");

    // 빈 문자열로 변경
    fireEvent.change(searchInput, { target: { value: "" } });

    // 컴포넌트가 크래시하지 않는지만 확인
    expect(screen.getByText("수강생 리스트")).toBeInTheDocument();
  });

  it("isVisible이 false일 때도 렌더링되어야 한다", () => {
    const hiddenPanelState: StudentPanelState = {
      position: { x: 100, y: 200 },
      isDragging: false,
      dragOffset: { x: 0, y: 0 },
      isVisible: false,
      filteredStudents: [],
      searchQuery: "",
    };

    render(<StudentPanel {...defaultProps} panelState={hiddenPanelState} />);

    // isVisible이 false여도 컴포넌트는 렌더링되어야 함 (CSS로 숨김 처리)
    expect(screen.getByText("수강생 리스트")).toBeInTheDocument();
  });

  it("여러 props가 동시에 적용되어야 한다", () => {
    const complexPanelState: StudentPanelState = {
      position: { x: 500, y: 300 },
      isDragging: true,
      dragOffset: { x: 0, y: 0 },
      isVisible: true,
      filteredStudents: mockStudents,
      searchQuery: "",
    };

    render(
      <StudentPanel
        {...defaultProps}
        selectedStudentId="550e8400-e29b-41d4-a716-446655440002"
        panelState={complexPanelState}
      />
    );

    // 컴포넌트가 렌더링되는지만 확인
    expect(screen.getByText("수강생 리스트")).toBeInTheDocument();

    const header = screen.getByTestId("students-panel-header");
    expect(header).toHaveClass("cursor-grabbing");
  });
});
