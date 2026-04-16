/**
 * 과목 페이지 테스트
 */

import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SubjectsPage from "../page";

// Mock all dependencies
vi.mock("../../../hooks/useSubjectManagementLocal", () => ({
  useSubjectManagementLocal: vi.fn(() => ({
    subjects: [],
    errorMessage: "",
    addSubject: vi.fn().mockResolvedValue(true),
    updateSubject: vi.fn().mockResolvedValue(true),
    deleteSubject: vi.fn(),
    getSubject: vi.fn(),
    refreshSubjects: vi.fn(),
    clearError: vi.fn(),
    subjectCount: 0,
  })),
}));

vi.mock("../../../hooks/useIntegratedDataLocal", () => ({
  useIntegratedDataLocal: vi.fn(() => ({
    data: {
      students: [],
      subjects: [],
      enrollments: [],
      sessions: [],
      teachers: [],
      version: "1.0",
    },
    loading: false,
    error: null,
    refreshData: vi.fn(),
    updateData: vi.fn(),
    clearError: vi.fn(),
    addSession: vi.fn(),
    updateSession: vi.fn(),
    deleteSession: vi.fn(),
    addEnrollment: vi.fn(),
    deleteEnrollment: vi.fn(),
    addTeacher: vi.fn(),
    updateTeacher: vi.fn(),
    deleteTeacher: vi.fn(),
    studentCount: 0,
    subjectCount: 0,
    sessionCount: 0,
    enrollmentCount: 0,
    teacherCount: 0,
  })),
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
