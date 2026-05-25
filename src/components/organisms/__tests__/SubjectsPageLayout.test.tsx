/**
 * SubjectsPageLayout 테스트
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SubjectsPageLayout from "../SubjectsPageLayout";

// Mock toast — 검색 0건 시 showActionToast의 onAction을 자동 실행해
// 기존 테스트(onAddSubject 호출 expect)와 호환.
vi.mock("@/lib/toast", () => ({
  showSuccess: vi.fn(),
  showActionToast: vi.fn((opts: { onAction: () => void }) => {
    opts.onAction();
    return "mock-toast-id";
  }),
}));

const mockProps = {
  subjects: [],
  students: [],
  enrollments: [],
  sessions: [],
  selectedSubjectId: "",
  onSelectSubject: vi.fn(),
  onDeleteSubject: vi.fn(),
  onUpdateSubject: vi.fn().mockResolvedValue(true),
  onAddSubject: vi.fn().mockResolvedValue(true),
};

describe("SubjectsPageLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("과목 페이지 레이아웃이 에러 없이 렌더링되어야 한다", () => {
    expect(() => {
      render(<SubjectsPageLayout {...mockProps} />);
    }).not.toThrow();
  });

  it("기본 구조가 렌더링되어야 한다", () => {
    const { container } = render(<SubjectsPageLayout {...mockProps} />);

    expect(container.firstChild).toBeDefined();
    expect(screen.getByTestId("subjects-page")).toBeInTheDocument();
  });

  it("과목이 없을 때 EmptyStateCTA 카드가 표시되어야 한다", () => {
    render(<SubjectsPageLayout {...mockProps} />);

    // phase1-release-readiness rank 10 재정의 — EmptyStateCTA 전 entity 확장 (2026-05-25)
    expect(screen.getByTestId("empty-subjects-cta")).toBeInTheDocument();
    expect(screen.getByText(/아직 등록된 과목이 없어요/)).toBeInTheDocument();
    expect(screen.getByTestId("empty-subjects-add")).toBeInTheDocument();
  });

  it("과목 데이터를 처리해야 한다", () => {
    const propsWithSubjects = {
      ...mockProps,
      subjects: [
        { id: "subject-1", name: "수학", color: "#ff0000" },
      ],
    };

    render(<SubjectsPageLayout {...propsWithSubjects} />);

    expect(screen.getByText("수학")).toBeInTheDocument();
  });

  it("과목 추가 버튼이 렌더링되어야 한다", () => {
    render(<SubjectsPageLayout {...mockProps} />);

    expect(screen.getByRole("button", { name: /과목 추가/ })).toBeInTheDocument();
  });

  it("과목 추가 — 입력 후 버튼 클릭 시 onAddSubject가 호출된다", async () => {
    render(<SubjectsPageLayout {...mockProps} />);
    const input = screen.getByPlaceholderText("과목 이름으로 검색");
    const addButton = screen.getByRole("button", { name: /과목 추가/ });

    fireEvent.change(input, { target: { value: "과학" } });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(mockProps.onAddSubject).toHaveBeenCalledWith("과학", "#3b82f6");
    });
  });

  it("과목 추가 — Enter 키는 onAddSubject 호출 X, 추가 버튼 클릭만 호출한다 (C 패턴)", async () => {
    render(<SubjectsPageLayout {...mockProps} />);
    const input = screen.getByPlaceholderText("과목 이름으로 검색");

    fireEvent.change(input, { target: { value: "영어" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(mockProps.onAddSubject).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "과목 추가" }));

    await waitFor(() => {
      expect(mockProps.onAddSubject).toHaveBeenCalledWith("영어", "#3b82f6");
    });
  });

  it("검색어 입력 시 목록이 필터링된다 (통합 input)", async () => {
    const propsWithSubjects = {
      ...mockProps,
      subjects: [
        { id: "subject-1", name: "수학", color: "#ff0000" },
        { id: "subject-2", name: "영어", color: "#0000ff" },
      ],
    };

    render(<SubjectsPageLayout {...propsWithSubjects} />);
    const searchInput = screen.getByPlaceholderText("과목 이름으로 검색");

    fireEvent.change(searchInput, { target: { value: "수" } });

    await waitFor(() => {
      expect(screen.getByText("수학")).toBeInTheDocument();
      expect(screen.queryByText("영어")).not.toBeInTheDocument();
    });
  });

  it("권한 없을 때 추가 버튼이 렌더되지 않는다", () => {
    render(<SubjectsPageLayout {...mockProps} canManage={false} />);
    expect(screen.queryByRole("button", { name: /과목 추가/ })).toBeNull();
  });

  it("과목 클릭 시 onSelectSubject가 호출된다", async () => {
    const propsWithSubjects = {
      ...mockProps,
      subjects: [
        { id: "subject-1", name: "수학", color: "#ff0000" },
      ],
    };

    render(<SubjectsPageLayout {...propsWithSubjects} />);
    const subjectButton = screen.getByText("수학").closest("button");

    fireEvent.click(subjectButton!);

    await waitFor(() => {
      expect(mockProps.onSelectSubject).toHaveBeenCalledWith("subject-1");
    });
  });

  it("이벤트 핸들러들을 처리해야 한다", () => {
    expect(() => {
      render(<SubjectsPageLayout {...mockProps} />);
    }).not.toThrow();
  });
});
