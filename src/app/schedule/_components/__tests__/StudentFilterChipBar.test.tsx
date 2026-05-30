import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import StudentFilterChipBar from "../StudentFilterChipBar";

const STUDENTS = [
  { id: "stu1", name: "김민준" },
  { id: "stu2", name: "이서연" },
  { id: "stu3", name: "박지호" },
];

const defaultProps = {
  students: STUDENTS,
  selectedStudentIds: [] as string[],
  onToggleStudent: vi.fn(),
  onClearFilter: vi.fn(),
  onDragStart: vi.fn(),
  onDragEnd: vi.fn(),
};

describe("StudentFilterChipBar", () => {
  it("학생 칩을 모두 렌더한다", () => {
    render(<StudentFilterChipBar {...defaultProps} />);
    expect(screen.getByText("김민준")).toBeInTheDocument();
    expect(screen.getByText("이서연")).toBeInTheDocument();
    expect(screen.getByText("박지호")).toBeInTheDocument();
  });

  it("칩 클릭 시 onToggleStudent(id) 호출", () => {
    const onToggle = vi.fn();
    render(<StudentFilterChipBar {...defaultProps} onToggleStudent={onToggle} />);
    fireEvent.click(screen.getByText("김민준"));
    expect(onToggle).toHaveBeenCalledWith("stu1");
  });

  it("선택된 학생 칩에 활성 스타일", () => {
    render(<StudentFilterChipBar {...defaultProps} selectedStudentIds={["stu1"]} />);
    const chip = screen.getByText("김민준").closest("button")!;
    expect(chip.className).toContain("bg-accent");
  });

  it("필터 활성화 시 '전체 해제' 버튼 표시", () => {
    render(<StudentFilterChipBar {...defaultProps} selectedStudentIds={["stu1"]} />);
    expect(screen.getByText("전체 해제")).toBeInTheDocument();
  });

  it("'전체 해제' 클릭 시 onClearFilter 호출", () => {
    const onClear = vi.fn();
    render(<StudentFilterChipBar {...defaultProps} selectedStudentIds={["stu1"]} onClearFilter={onClear} />);
    fireEvent.click(screen.getByText("전체 해제"));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("검색 버튼 클릭 시 검색 입력 노출", () => {
    render(<StudentFilterChipBar {...defaultProps} />);
    fireEvent.click(screen.getByLabelText("학생 검색"));
    expect(screen.getByPlaceholderText("학생 이름 검색...")).toBeInTheDocument();
  });

  describe("variant=active-only (P3)", () => {
    it("선택된 학생만 칩으로 표시 + '+N명 (검색)' chip", () => {
      render(
        <StudentFilterChipBar
          {...defaultProps}
          selectedStudentIds={["stu1"]}
          variant="active-only"
        />,
      );
      expect(screen.getByText("김민준")).toBeInTheDocument();
      expect(screen.queryByText("이서연")).not.toBeInTheDocument();
      expect(screen.queryByText("박지호")).not.toBeInTheDocument();
      expect(screen.getByText("+ 2명 (검색)")).toBeInTheDocument();
    });

    it("선택 0명일 때 chip 0개 + '+3명 (검색)' chip", () => {
      render(
        <StudentFilterChipBar {...defaultProps} variant="active-only" />,
      );
      expect(screen.queryByText("김민준")).not.toBeInTheDocument();
      expect(screen.getByText("+ 3명 (검색)")).toBeInTheDocument();
    });

    it("검색어 입력 시 매칭 학생 chip 추가 표시", () => {
      render(
        <StudentFilterChipBar
          {...defaultProps}
          selectedStudentIds={["stu1"]}
          variant="active-only"
        />,
      );
      fireEvent.click(screen.getByLabelText("학생 검색"));
      const input = screen.getByPlaceholderText("학생 이름 검색...");
      fireEvent.change(input, { target: { value: "이서" } });
      expect(screen.getByText("이서연")).toBeInTheDocument();
      expect(screen.queryByText("+ 2명 (검색)")).not.toBeInTheDocument();
    });
  });
});
