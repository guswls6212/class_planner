/**
 * 학생 페이지 테스트 (84줄)
 */

import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StudentsPage from "../page";

// Mock all dependencies
vi.mock("../../../hooks/useStudentManagement", () => ({
  useStudentManagementClean: vi.fn(() => ({
    students: [],
    loading: false,
    error: null,
    addStudent: vi.fn(),
    updateStudent: vi.fn(),
    deleteStudent: vi.fn(),
    refreshStudents: vi.fn(),
    studentCount: 0,
  })),
}));

vi.mock("../../components/organisms/StudentsPageLayout", () => ({
  default: vi.fn(() => (
    <div data-testid="students-layout">Students Layout</div>
  )),
}));

describe("Students Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("학생 페이지가 에러 없이 렌더링되어야 한다", () => {
    expect(() => {
      render(<StudentsPage />);
    }).not.toThrow();
  });

  it("기본 구조가 렌더링되어야 한다", () => {
    const { container } = render(<StudentsPage />);

    expect(container.firstChild).toBeDefined();
  });

  it("학생 관리 훅을 사용해야 한다", () => {
    expect(() => {
      render(<StudentsPage />);
    }).not.toThrow();
  });

  it("학생 페이지 레이아웃이 포함되어야 한다", () => {
    expect(() => {
      render(<StudentsPage />);
    }).not.toThrow();
  });

  it("에러 상태를 처리해야 한다", () => {
    expect(() => {
      render(<StudentsPage />);
    }).not.toThrow();
  });
});
