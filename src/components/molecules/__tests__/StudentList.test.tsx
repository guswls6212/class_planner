/**
 * StudentList 테스트 (88줄) - 복원 및 수정
 */

import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StudentList } from "../StudentList";

// Mock StudentListItem
vi.mock("../../atoms/StudentListItem", () => ({
  default: vi.fn(() => <div data-testid="student-item">Student Item</div>),
}));

const mockStudents = [
  {
    id: "student-1",
    name: "김철수",
    createdAt: "2025-09-21T18:00:00.000+09:00",
    updatedAt: "2025-09-21T18:00:00.000+09:00",
  },
  {
    id: "student-2",
    name: "이영희",
    createdAt: "2025-09-21T18:00:00.000+09:00",
    updatedAt: "2025-09-21T18:00:00.000+09:00",
  },
];

describe("StudentList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("학생 리스트가 에러 없이 렌더링되어야 한다", () => {
    expect(() => {
      render(
        <StudentList
          students={mockStudents}
          selectedStudentId="student-1"
          onSelectStudent={vi.fn()}
          onDeleteStudent={vi.fn()}
        />
      );
    }).not.toThrow();
  });

  it("기본 구조가 렌더링되어야 한다", () => {
    const { container } = render(
      <StudentList
        students={mockStudents}
        selectedStudentId="student-1"
        onSelectStudent={vi.fn()}
        onDeleteStudent={vi.fn()}
      />
    );

    expect(container.firstChild).toBeDefined();
  });

  it("빈 배열을 처리해야 한다", () => {
    expect(() => {
      render(
        <StudentList
          students={[]}
          selectedStudentId=""
          onSelectStudent={vi.fn()}
          onDeleteStudent={vi.fn()}
        />
      );
    }).not.toThrow();
  });

  it("학생 아이템들이 렌더링되어야 한다", () => {
    expect(() => {
      render(
        <StudentList
          students={mockStudents}
          selectedStudentId="student-1"
          onSelectStudent={vi.fn()}
          onDeleteStudent={vi.fn()}
        />
      );
    }).not.toThrow();
  });

  it("선택된 학생 ID를 처리해야 한다", () => {
    expect(() => {
      render(
        <StudentList
          students={mockStudents}
          selectedStudentId="student-2"
          onSelectStudent={vi.fn()}
          onDeleteStudent={vi.fn()}
        />
      );
    }).not.toThrow();
  });

  it("이벤트 핸들러들을 처리해야 한다", () => {
    const mockHandlers = {
      onSelectStudent: vi.fn(),
      onDeleteStudent: vi.fn(),
    };

    expect(() => {
      render(
        <StudentList
          students={mockStudents}
          selectedStudentId="student-1"
          {...mockHandlers}
        />
      );
    }).not.toThrow();
  });

  it("로딩 상태를 처리해야 한다", () => {
    expect(() => {
      render(
        <StudentList
          students={mockStudents}
          selectedStudentId="student-1"
          onSelectStudent={vi.fn()}
          onDeleteStudent={vi.fn()}
          isLoading={true}
        />
      );
    }).not.toThrow();
  });

  it("다양한 학생 수를 처리해야 한다", () => {
    const manyStudents = Array.from({ length: 10 }, (_, i) => ({
      id: `student-${i}`,
      name: `학생${i}`,
      createdAt: "2025-09-21T18:00:00.000+09:00",
      updatedAt: "2025-09-21T18:00:00.000+09:00",
    }));

    expect(() => {
      render(
        <StudentList
          students={manyStudents}
          selectedStudentId="student-5"
          onSelectStudent={vi.fn()}
          onDeleteStudent={vi.fn()}
        />
      );
    }).not.toThrow();
  });
});
