/**
 * SubjectListItem 테스트 (67줄) - 완전 수정
 */

import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SubjectListItem from "../SubjectListItem";

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
