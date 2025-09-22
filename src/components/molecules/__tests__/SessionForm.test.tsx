/**
 * SessionForm 테스트 (195줄 - 큰 파일)
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SessionForm from "../SessionForm";

// Mock dependencies
vi.mock("../../atoms/Button", () => ({
  default: vi.fn(() => <button data-testid="button">Button</button>),
}));

vi.mock("../../atoms/Input", () => ({
  default: vi.fn((props: any) => <input data-testid="input" {...props} />),
}));

vi.mock("../../atoms/Label", () => ({
  default: vi.fn(() => <label data-testid="label">Label</label>),
}));

vi.mock("../../../lib/planner", () => ({
  weekdays: ["월", "화", "수", "목", "금", "토", "일"],
}));

const mockSubjects = [
  {
    id: "subject-1",
    name: "수학",
    color: "#ff0000",
  },
];

const mockStudents = [
  {
    id: "student-1",
    name: "김철수",
  },
];

describe("SessionForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("세션 폼이 에러 없이 렌더링되어야 한다", () => {
    expect(() => {
      render(
        <SessionForm
          subjects={mockSubjects}
          students={mockStudents}
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
        />
      );
    }).not.toThrow();
  });

  it("닫힌 상태에서는 렌더링되지 않아야 한다", () => {
    const { container } = render(
      <SessionForm
        subjects={mockSubjects}
        students={mockStudents}
        isOpen={false}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it("열린 상태에서 기본 구조가 렌더링되어야 한다", () => {
    const { container } = render(
      <SessionForm
        subjects={mockSubjects}
        students={mockStudents}
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    expect(container.firstChild).toBeDefined();
  });

  it("초기 데이터와 함께 렌더링되어야 한다", () => {
    const initialData = {
      subjectId: "subject-1",
      weekday: 1,
      startTime: "10:00",
      endTime: "11:00",
      studentIds: ["student-1"],
      room: "101호",
      yPosition: 2,
    };

    expect(() => {
      render(
        <SessionForm
          subjects={mockSubjects}
          students={mockStudents}
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
          initialData={initialData}
        />
      );
    }).not.toThrow();
  });

  it("종료 시간이 시작 시간보다 이르면 즉시 경고가 표시되어야 한다", () => {
    render(
      <SessionForm
        subjects={mockSubjects}
        students={mockStudents}
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    const inputs = screen.getAllByTestId("input");
    const startInput = inputs[0];
    const endInput = inputs[1];

    // 시작 10:00, 종료 09:00 으로 설정
    fireEvent.change(startInput, { target: { value: "10:00" } });
    fireEvent.change(endInput, { target: { value: "09:00" } });

    expect(
      screen.getByText("종료 시간은 시작 시간보다 늦어야 합니다.")
    ).toBeInTheDocument();
  });

  it("8시간을 초과하면 즉시 경고가 표시되어야 한다", () => {
    render(
      <SessionForm
        subjects={mockSubjects}
        students={mockStudents}
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    const inputs = screen.getAllByTestId("input");
    const startInput = inputs[0];
    const endInput = inputs[1];

    // 09:00 ~ 18:59 은 9시간 미만? -> 10시간? 정확히 초과 케이스로 09:00~18:30(9.5h)
    fireEvent.change(startInput, { target: { value: "09:00" } });
    fireEvent.change(endInput, { target: { value: "18:30" } });

    expect(
      screen.getByText("세션 시간은 최대 8시간까지 설정할 수 있습니다.")
    ).toBeInTheDocument();
  });

  it("빈 과목/학생 배열을 안전하게 처리해야 한다", () => {
    expect(() => {
      render(
        <SessionForm
          subjects={[]}
          students={[]}
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
        />
      );
    }).not.toThrow();
  });
});
