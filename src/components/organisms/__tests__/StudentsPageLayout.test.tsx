import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import StudentsPageLayout from "../StudentsPageLayout";

// Mock props
const mockStudents = [
  { id: "1", name: "김철수" },
  { id: "2", name: "이영희" },
];

const mockProps = {
  students: mockStudents,
  subjects: [],
  enrollments: [],
  sessions: [],
  selectedStudentId: "1",
  onSelectStudent: vi.fn(),
  onAddStudent: vi.fn(),
  onDeleteStudent: vi.fn(),
  onUpdateStudent: vi.fn().mockResolvedValue(true),
  errorMessage: "",
  onClearError: vi.fn(),
};

describe("StudentsPageLayout Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("학생 페이지 레이아웃이 올바르게 렌더링되어야 한다", () => {
    render(<StudentsPageLayout {...mockProps} />);

    expect(screen.getByTestId("students-page")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("학생 이름 (검색 가능)")).toBeInTheDocument();
    // 선택된 학생(김철수)은 목록+상세 양쪽에 표시될 수 있으므로 getAllByText 사용
    expect(screen.getAllByText("김철수").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("이영희")).toBeInTheDocument();
  });

  it("학생 목록이 올바르게 표시되어야 한다", () => {
    render(<StudentsPageLayout {...mockProps} />);

    expect(screen.getAllByText("김철수").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("이영희")).toBeInTheDocument();
  });

  it("학생을 클릭하면 선택되어야 한다", async () => {
    render(<StudentsPageLayout {...mockProps} />);
    const studentButton = screen.getByText("이영희").closest("button");

    fireEvent.click(studentButton!);

    await waitFor(() => {
      expect(mockProps.onSelectStudent).toHaveBeenCalledWith("2");
    });
  });

  it("학생이 없을 때 빈 상태 메시지가 표시되어야 한다", () => {
    const emptyProps = { ...mockProps, students: [] };

    render(<StudentsPageLayout {...emptyProps} />);

    expect(screen.getByText(/학생을 추가해주세요/)).toBeInTheDocument();
  });

  it("에러 메시지가 표시되어야 한다", () => {
    const errorMessage = "이미 존재하는 학생 이름입니다.";
    const errorProps = { ...mockProps, errorMessage };

    render(<StudentsPageLayout {...errorProps} />);

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it("학생 추가 버튼이 렌더링되어야 한다", () => {
    render(<StudentsPageLayout {...mockProps} />);
    const addButton = screen.getByRole("button", { name: /학생 추가/ });

    expect(addButton).toBeInTheDocument();
  });

  it("학생 추가 — 입력 후 버튼 클릭 시 onAddStudent가 호출된다", async () => {
    render(<StudentsPageLayout {...mockProps} />);
    const input = screen.getByPlaceholderText("학생 이름 (검색 가능)");
    const addButton = screen.getByRole("button", { name: /학생 추가/ });

    fireEvent.change(input, { target: { value: "박민수" } });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(mockProps.onAddStudent).toHaveBeenCalledWith("박민수");
    });
  });

  it("학생 추가 — Enter 키 입력 시 onAddStudent가 호출된다", async () => {
    render(<StudentsPageLayout {...mockProps} />);
    const input = screen.getByPlaceholderText("학생 이름 (검색 가능)");

    fireEvent.change(input, { target: { value: "최지수" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(mockProps.onAddStudent).toHaveBeenCalledWith("최지수");
    });
  });

  it("검색창이 렌더링되어야 한다", () => {
    render(<StudentsPageLayout {...mockProps} />);

    expect(screen.getByPlaceholderText("이름으로 검색")).toBeInTheDocument();
  });

  it("검색어 입력 시 목록이 필터링된다", async () => {
    // 선택된 학생 없이 렌더링하여 상세 패널 노출 없음
    const noSelectionProps = { ...mockProps, selectedStudentId: "" };
    render(<StudentsPageLayout {...noSelectionProps} />);
    const searchInput = screen.getByPlaceholderText("이름으로 검색");

    fireEvent.change(searchInput, { target: { value: "김" } });

    await waitFor(() => {
      expect(screen.getByText("김철수")).toBeInTheDocument();
      expect(screen.queryByText("이영희")).not.toBeInTheDocument();
    });
  });

  it("컴포넌트가 올바르게 렌더링되어야 한다", () => {
    expect(() => {
      render(<StudentsPageLayout {...mockProps} />);
    }).not.toThrow();
  });
});
