import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import React from "react";

vi.mock("../../../../components/organisms/TimeTableGrid", () => ({
  default: (props: any) => (
    <div data-testid="timetable-grid" data-selected={JSON.stringify(props.selectedStudentIds)}>
      TimeTableGrid Mock
    </div>
  ),
}));

import ScheduleGridSection from "../ScheduleGridSection";

describe("ScheduleGridSection", () => {
  const defaultProps = {
    containerRef: React.createRef<HTMLDivElement>(),
    gridVersion: 1,
    sessions: new Map(),
    subjects: [],
    enrollments: [],
    students: [],
    onSessionClick: vi.fn(),
    onDrop: vi.fn(),
    onSessionDrop: vi.fn(),
    onEmptySpaceClick: vi.fn(),
    selectedStudentIds: ["stu-1"],
    isStudentDragging: false,
    baseDate: new Date("2026-04-26"),
  };

  it("TimeTableGrid를 렌더링한다", () => {
    const { getByTestId } = render(<ScheduleGridSection {...defaultProps} />);
    expect(getByTestId("timetable-grid")).toBeInTheDocument();
  });

  it("selectedStudentIds를 전달한다", () => {
    const { getByTestId } = render(<ScheduleGridSection {...defaultProps} />);
    expect(getByTestId("timetable-grid")).toHaveAttribute("data-selected", '["stu-1"]');
  });

  it("containerRef가 wrapper div에 연결된다", () => {
    const ref = React.createRef<HTMLDivElement>();
    const { container } = render(
      <ScheduleGridSection {...defaultProps} containerRef={ref} />
    );
    expect(container.firstChild).toBe(ref.current);
  });
});
