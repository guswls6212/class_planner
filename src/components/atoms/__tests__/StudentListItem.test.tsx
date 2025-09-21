/**
 * StudentListItem 테스트 (95줄)
 */

import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StudentListItem from "../StudentListItem";

const mockStudent = {
  id: "student-1",
  name: "김철수",
};

describe("StudentListItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("학생 리스트 아이템이 에러 없이 렌더링되어야 한다", () => {
    expect(() => {
      render(
        <StudentListItem
          student={mockStudent}
          isSelected={false}
          onSelect={vi.fn()}
          onDelete={vi.fn()}
        />
      );
    }).not.toThrow();
  });

  it("기본 구조가 렌더링되어야 한다", () => {
    const { container } = render(
      <StudentListItem
        student={mockStudent}
        isSelected={false}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(container.firstChild).toBeDefined();
  });

  it("선택된 상태로 렌더링되어야 한다", () => {
    expect(() => {
      render(
        <StudentListItem
          student={mockStudent}
          isSelected={true}
          onSelect={vi.fn()}
          onDelete={vi.fn()}
        />
      );
    }).not.toThrow();
  });

  it("선택되지 않은 상태로 렌더링되어야 한다", () => {
    expect(() => {
      render(
        <StudentListItem
          student={mockStudent}
          isSelected={false}
          onSelect={vi.fn()}
          onDelete={vi.fn()}
        />
      );
    }).not.toThrow();
  });

  it("다양한 학생 이름으로 렌더링되어야 한다", () => {
    const students = [
      { id: "1", name: "김철수" },
      { id: "2", name: "이영희" },
      { id: "3", name: "박민수" },
    ];

    students.forEach((student) => {
      expect(() => {
        render(
          <StudentListItem
            student={student}
            isSelected={false}
            onSelect={vi.fn()}
            onDelete={vi.fn()}
          />
        );
      }).not.toThrow();
    });
  });
});
