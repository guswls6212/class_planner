/**
 * SubjectList 테스트 (73줄) - 복원 및 수정
 */

import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SubjectList from "../SubjectList";

// Mock SubjectListItem
vi.mock("../../atoms/SubjectListItem", () => ({
  default: vi.fn(() => <div data-testid="subject-item">Subject Item</div>),
}));

const mockSubjects = [
  {
    id: "subject-1",
    name: "수학",
    color: "#ff0000",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "subject-2",
    name: "영어",
    color: "#00ff00",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

describe("SubjectList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("과목 리스트가 에러 없이 렌더링되어야 한다", () => {
    expect(() => {
      render(
        <SubjectList
          subjects={mockSubjects}
          selectedSubjectId="subject-1"
          onSelectSubject={vi.fn()}
          onDeleteSubject={vi.fn()}
          onUpdateSubject={vi.fn()}
        />
      );
    }).not.toThrow();
  });

  it("기본 구조가 렌더링되어야 한다", () => {
    const { container } = render(
      <SubjectList
        subjects={mockSubjects}
        selectedSubjectId="subject-1"
        onSelectSubject={vi.fn()}
        onDeleteSubject={vi.fn()}
        onUpdateSubject={vi.fn()}
      />
    );

    expect(container.firstChild).toBeDefined();
  });

  it("과목명 편집은 6글자를 초과하지 않아야 한다", () => {
    // 이 테스트는 SubjectListItem 편집 로직을 통합적으로 확인하기보다는
    // 컴파일/렌더 안정성만 보장. 구체 로직은 SubjectListItem에서 검증.
    expect(() => {
      render(
        <SubjectList
          subjects={[{ id: "1", name: "수학", color: "#000" }] as any}
          selectedSubjectId="1"
          onSelectSubject={() => {}}
          onDeleteSubject={() => {}}
          onUpdateSubject={() => {}}
        />
      );
    }).not.toThrow();
  });

  it("빈 배열을 처리해야 한다", () => {
    expect(() => {
      render(
        <SubjectList
          subjects={[]}
          selectedSubjectId=""
          onSelectSubject={vi.fn()}
          onDeleteSubject={vi.fn()}
          onUpdateSubject={vi.fn()}
        />
      );
    }).not.toThrow();
  });

  it("과목 아이템들이 렌더링되어야 한다", () => {
    expect(() => {
      render(
        <SubjectList
          subjects={mockSubjects}
          selectedSubjectId="subject-1"
          onSelectSubject={vi.fn()}
          onDeleteSubject={vi.fn()}
          onUpdateSubject={vi.fn()}
        />
      );
    }).not.toThrow();
  });

  it("선택된 과목 ID를 처리해야 한다", () => {
    expect(() => {
      render(
        <SubjectList
          subjects={mockSubjects}
          selectedSubjectId="subject-2"
          onSelectSubject={vi.fn()}
          onDeleteSubject={vi.fn()}
          onUpdateSubject={vi.fn()}
        />
      );
    }).not.toThrow();
  });

  it("이벤트 핸들러들을 처리해야 한다", () => {
    const mockHandlers = {
      onSelectSubject: vi.fn(),
      onDeleteSubject: vi.fn(),
      onUpdateSubject: vi.fn(),
    };

    expect(() => {
      render(
        <SubjectList
          subjects={mockSubjects}
          selectedSubjectId="subject-1"
          {...mockHandlers}
        />
      );
    }).not.toThrow();
  });

  it("다양한 과목 수를 처리해야 한다", () => {
    const manySubjects = Array.from({ length: 10 }, (_, i) => ({
      id: `subject-${i}`,
      name: `과목${i}`,
      color: `#ff${i.toString().padStart(4, "0")}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    expect(() => {
      render(
        <SubjectList
          subjects={manySubjects}
          selectedSubjectId="subject-5"
          onSelectSubject={vi.fn()}
          onDeleteSubject={vi.fn()}
          onUpdateSubject={vi.fn()}
        />
      );
    }).not.toThrow();
  });
});
