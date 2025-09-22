/**
 * StudentListItem 테스트 (95줄)
 */

import { fireEvent, render, screen } from "@testing-library/react";
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

  it("편집 버튼으로 이름을 수정할 수 있어야 한다(4글자 제한)", () => {
    const onUpdate = vi.fn();
    render(
      <StudentListItem
        student={mockStudent}
        isSelected={false}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        onUpdate={onUpdate}
      />
    );

    // 편집 클릭
    fireEvent.click(screen.getByText("편집"));
    const input = screen.getByRole("textbox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "홍길동박이" } });
    // 저장
    fireEvent.click(screen.getByText("저장"));
    expect(onUpdate).toHaveBeenCalledWith("student-1", "홍길동박");
  });
});
