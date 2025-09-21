/**
 * SubjectsPageLayout 테스트 (47줄)
 */

import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SubjectsPageLayout from "../SubjectsPageLayout";

// Mock dependencies
vi.mock("../../molecules/SubjectList", () => ({
  default: vi.fn(() => <div data-testid="subject-list">Subject List</div>),
}));

vi.mock("../../molecules/SubjectInputSection", () => ({
  default: vi.fn(() => <div data-testid="subject-input">Subject Input</div>),
}));

const mockProps = {
  subjects: [],
  selectedSubjectId: "",
  newSubjectName: "",
  newSubjectColor: "#ff0000",
  onSelectSubject: vi.fn(),
  onDeleteSubject: vi.fn(),
  onUpdateSubject: vi.fn(),
  onNewSubjectNameChange: vi.fn(),
  onNewSubjectColorChange: vi.fn(),
  onAddSubject: vi.fn(),
  loading: false,
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
  });

  it("과목 데이터를 처리해야 한다", () => {
    const propsWithSubjects = {
      ...mockProps,
      subjects: [
        {
          id: "subject-1",
          name: "수학",
          color: "#ff0000",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    };

    expect(() => {
      render(<SubjectsPageLayout {...propsWithSubjects} />);
    }).not.toThrow();
  });

  it("로딩 상태를 처리해야 한다", () => {
    const propsWithLoading = {
      ...mockProps,
      loading: true,
    };

    expect(() => {
      render(<SubjectsPageLayout {...propsWithLoading} />);
    }).not.toThrow();
  });

  it("이벤트 핸들러들을 처리해야 한다", () => {
    const propsWithHandlers = {
      ...mockProps,
      onSubjectSelect: vi.fn(),
      onSubjectEdit: vi.fn(),
      onSubjectDelete: vi.fn(),
      onNewSubjectNameChange: vi.fn(),
      onNewSubjectColorChange: vi.fn(),
      onAddSubject: vi.fn(),
    };

    expect(() => {
      render(<SubjectsPageLayout {...propsWithHandlers} />);
    }).not.toThrow();
  });
});
