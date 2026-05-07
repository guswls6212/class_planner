import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TeacherFilterChipBar from "../TeacherFilterChipBar";

const TEACHERS = [
  { id: "tch1", name: "김선생", color: "#FF5733" },
  { id: "tch2", name: "이선생", color: "#33FF57" },
  { id: "tch3", name: "박선생", color: "#3357FF" },
];

const defaultProps = {
  teachers: TEACHERS,
  selectedTeacherIds: [] as string[],
  onToggleTeacher: vi.fn(),
  onClearFilter: vi.fn(),
};

describe("TeacherFilterChipBar", () => {
  it("강사 칩을 모두 렌더한다", () => {
    render(<TeacherFilterChipBar {...defaultProps} />);
    expect(screen.getByText("김선생")).toBeInTheDocument();
    expect(screen.getByText("이선생")).toBeInTheDocument();
    expect(screen.getByText("박선생")).toBeInTheDocument();
  });

  it("칩 클릭 시 onToggleTeacher(id) 호출", () => {
    const onToggle = vi.fn();
    render(<TeacherFilterChipBar {...defaultProps} onToggleTeacher={onToggle} />);
    fireEvent.click(screen.getByText("김선생"));
    expect(onToggle).toHaveBeenCalledWith("tch1");
  });

  it("선택된 강사 칩에 활성 스타일", () => {
    render(<TeacherFilterChipBar {...defaultProps} selectedTeacherIds={["tch1"]} />);
    const chip = screen.getByText("김선생").closest("button")!;
    expect(chip.className).toContain("bg-accent");
  });

  it("필터 활성화 시 '전체 해제' 버튼 표시", () => {
    render(<TeacherFilterChipBar {...defaultProps} selectedTeacherIds={["tch1"]} />);
    expect(screen.getByText("전체 해제")).toBeInTheDocument();
  });

  it("'전체 해제' 클릭 시 onClearFilter 호출", () => {
    const onClear = vi.fn();
    render(<TeacherFilterChipBar {...defaultProps} selectedTeacherIds={["tch1"]} onClearFilter={onClear} />);
    fireEvent.click(screen.getByText("전체 해제"));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("검색 버튼 클릭 시 검색 입력 노출", () => {
    render(<TeacherFilterChipBar {...defaultProps} />);
    fireEvent.click(screen.getByLabelText("강사 검색"));
    expect(screen.getByPlaceholderText("강사 이름 검색...")).toBeInTheDocument();
  });

  it("강사 칩에 색상 도트가 렌더된다", () => {
    render(<TeacherFilterChipBar {...defaultProps} />);
    const chip = screen.getByText("김선생").closest("button")!;
    const dot = chip.querySelector("span");
    expect(dot).toBeTruthy();
    expect(dot!.style.backgroundColor).toBe("rgb(255, 87, 51)");
  });

  it("드래그 속성이 없다 (teacher는 draggable 아님)", () => {
    render(<TeacherFilterChipBar {...defaultProps} />);
    const chip = screen.getByText("김선생").closest("button")!;
    expect(chip.getAttribute("draggable")).toBeNull();
  });

  describe("variant=active-only (P3)", () => {
    it("선택된 강사만 표시 + '+N명 (검색)' chip", () => {
      render(
        <TeacherFilterChipBar
          {...defaultProps}
          selectedTeacherIds={["tch1"]}
          variant="active-only"
        />,
      );
      expect(screen.getByText("김선생")).toBeInTheDocument();
      expect(screen.queryByText("이선생")).not.toBeInTheDocument();
      expect(screen.getByText("+ 2명 (검색)")).toBeInTheDocument();
    });

    it("검색어로 매칭 강사 추가 표시", () => {
      render(
        <TeacherFilterChipBar
          {...defaultProps}
          selectedTeacherIds={["tch1"]}
          variant="active-only"
        />,
      );
      fireEvent.click(screen.getByLabelText("강사 검색"));
      const input = screen.getByPlaceholderText("강사 이름 검색...");
      fireEvent.change(input, { target: { value: "이선" } });
      expect(screen.getByText("이선생")).toBeInTheDocument();
    });
  });
});
