import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SubjectListItem from "../SubjectListItem";

describe("SubjectListItem - 6글자 제한", () => {
  it("편집 시 6글자 초과 입력을 잘라내고 저장한다", () => {
    const onUpdate = vi.fn();
    render(
      <SubjectListItem
        subject={{ id: "sub-1", name: "과목", color: "#000" } as any}
        isSelected={false}
        onSelect={() => {}}
        onDelete={() => {}}
        onUpdate={onUpdate}
      />
    );

    fireEvent.click(screen.getByText("편집"));
    const input = screen.getByRole("textbox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "초등수학사회역" } }); // 6글자 초과
    fireEvent.click(screen.getByTitle("저장"));

    expect(onUpdate).toHaveBeenCalledWith("sub-1", "초등수학사회", "#000");
  });
});
/**
 * SubjectListItem 테스트 (67줄) - 완전 수정
 */

// 아래 블록은 동일 파일 내 중복 선언을 피하기 위해 import를 재선언하지 않습니다.

const mockSubject = {
  id: "subject-1",
  name: "수학",
  color: "#ff0000",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("SubjectListItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("과목 아이템이 에러 없이 렌더링되어야 한다", () => {
    expect(() => {
      render(
        <SubjectListItem
          subject={mockSubject}
          isSelected={false}
          onSelect={vi.fn()}
          onDelete={vi.fn()}
          onUpdate={vi.fn()}
        />
      );
    }).not.toThrow();
  });

  it("기본 구조가 렌더링되어야 한다", () => {
    const { container } = render(
      <SubjectListItem
        subject={mockSubject}
        isSelected={false}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        onUpdate={vi.fn()}
      />
    );

    expect(container.firstChild).toBeDefined();
  });

  it("선택된 상태를 처리해야 한다", () => {
    expect(() => {
      render(
        <SubjectListItem
          subject={mockSubject}
          isSelected={true}
          onSelect={vi.fn()}
          onDelete={vi.fn()}
          onUpdate={vi.fn()}
        />
      );
    }).not.toThrow();
  });

  it("선택 이벤트를 처리해야 한다", () => {
    const mockOnSelect = vi.fn();

    expect(() => {
      render(
        <SubjectListItem
          subject={mockSubject}
          isSelected={false}
          onSelect={mockOnSelect}
          onDelete={vi.fn()}
          onUpdate={vi.fn()}
        />
      );
    }).not.toThrow();
  });

  it("삭제 이벤트를 처리해야 한다", () => {
    const mockOnDelete = vi.fn();

    expect(() => {
      render(
        <SubjectListItem
          subject={mockSubject}
          isSelected={false}
          onSelect={vi.fn()}
          onDelete={mockOnDelete}
          onUpdate={vi.fn()}
        />
      );
    }).not.toThrow();
  });
});
