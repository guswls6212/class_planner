import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import TeachersPageLayout from "../TeachersPageLayout";

const mockTeachers = [
  { id: "1", name: "김선생", color: "#6366f1" },
  { id: "2", name: "이선생", color: "#0891b2" },
];

const baseProps = {
  teachers: mockTeachers,
  sessions: [],
  enrollments: [],
  subjects: [],
  students: [],
  selectedTeacherId: "",
  onSelectTeacher: vi.fn(),
  onAddTeacher: vi.fn().mockResolvedValue(true),
  onDeleteTeacher: vi.fn(),
  onUpdateTeacher: vi.fn(),
  errorMessage: undefined,
  onClearError: vi.fn(),
};

describe("TeachersPageLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("강사 페이지 레이아웃이 올바르게 렌더링된다", () => {
    render(<TeachersPageLayout {...baseProps} />);
    expect(screen.getByTestId("teachers-page")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("강사 이름 (검색 가능)")).toBeInTheDocument();
    expect(screen.getByText("김선생")).toBeInTheDocument();
    expect(screen.getByText("이선생")).toBeInTheDocument();
  });

  it("강사를 클릭하면 onSelectTeacher가 호출된다", async () => {
    render(<TeachersPageLayout {...baseProps} />);
    fireEvent.click(screen.getByText("이선생").closest("button")!);
    await waitFor(() => {
      expect(baseProps.onSelectTeacher).toHaveBeenCalledWith("2");
    });
  });

  it("강사가 없을 때 빈 상태 메시지가 표시된다", () => {
    render(<TeachersPageLayout {...baseProps} teachers={[]} />);
    expect(screen.getByText("강사를 추가해주세요")).toBeInTheDocument();
  });

  it("검색어로 필터링된다", () => {
    render(<TeachersPageLayout {...baseProps} />);
    const searchInput = screen.getByPlaceholderText("이름으로 검색");
    fireEvent.change(searchInput, { target: { value: "김" } });
    expect(screen.getByText("김선생")).toBeInTheDocument();
    expect(screen.queryByText("이선생")).not.toBeInTheDocument();
  });

  it("추가 버튼을 클릭하면 onAddTeacher가 호출된다", async () => {
    render(<TeachersPageLayout {...baseProps} />);
    const input = screen.getByPlaceholderText("강사 이름 (검색 가능)");
    fireEvent.change(input, { target: { value: "박선생" } });
    fireEvent.click(screen.getByLabelText("강사 추가"));
    await waitFor(() => {
      expect(baseProps.onAddTeacher).toHaveBeenCalledWith("박선생", expect.any(String));
    });
  });

  it("선택된 강사가 있으면 상세 패널이 표시된다", () => {
    render(<TeachersPageLayout {...baseProps} selectedTeacherId="1" />);
    expect(screen.getAllByText("김선생").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("담당 학생")).toBeInTheDocument();
    expect(screen.getByText("주간 수업")).toBeInTheDocument();
  });

  it("에러 메시지가 표시된다", () => {
    render(<TeachersPageLayout {...baseProps} errorMessage="테스트 에러" />);
    expect(screen.getByText("테스트 에러")).toBeInTheDocument();
  });

  it("한글 IME 조합 중 Enter는 onAddTeacher를 호출하지 않는다 (회귀)", async () => {
    render(<TeachersPageLayout {...baseProps} />);
    const input = screen.getByPlaceholderText("강사 이름 (검색 가능)");
    fireEvent.change(input, { target: { value: "이강사" } });
    fireEvent.keyDown(input, { key: "Enter", isComposing: true });
    await new Promise((r) => setTimeout(r, 0));
    expect(baseProps.onAddTeacher).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: "Enter", isComposing: false });
    await waitFor(() => {
      expect(baseProps.onAddTeacher).toHaveBeenCalledTimes(1);
      expect(baseProps.onAddTeacher).toHaveBeenCalledWith("이강사", expect.any(String));
    });
  });
});
