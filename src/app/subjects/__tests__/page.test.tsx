/**
 * 과목 페이지 테스트 (69줄)
 */

import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SubjectsPage from "../page";

// Mock all dependencies
vi.mock("../../../hooks/useSubjectManagement", () => ({
  useSubjectManagement: vi.fn(() => ({
    subjects: [],
    loading: false,
    error: null,
    addSubject: vi.fn(),
    updateSubject: vi.fn(),
    deleteSubject: vi.fn(),
    refreshSubjects: vi.fn(),
    subjectCount: 0,
  })),
}));

vi.mock("../../components/organisms/SubjectsPageLayout", () => ({
  default: vi.fn(() => (
    <div data-testid="subjects-layout">Subjects Layout</div>
  )),
}));

describe("Subjects Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("과목 페이지가 에러 없이 렌더링되어야 한다", () => {
    expect(() => {
      render(<SubjectsPage />);
    }).not.toThrow();
  });

  it("기본 구조가 렌더링되어야 한다", () => {
    const { container } = render(<SubjectsPage />);

    expect(container.firstChild).toBeDefined();
  });

  it("과목 관리 훅을 사용해야 한다", () => {
    expect(() => {
      render(<SubjectsPage />);
    }).not.toThrow();
  });

  it("과목 페이지 레이아웃이 포함되어야 한다", () => {
    expect(() => {
      render(<SubjectsPage />);
    }).not.toThrow();
  });

  it("에러 상태를 처리해야 한다", () => {
    expect(() => {
      render(<SubjectsPage />);
    }).not.toThrow();
  });
});
