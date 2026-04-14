import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../../../components/organisms/StudentPanel", () => ({
  default: (props: any) => (
    <div data-testid="student-panel" data-selected={props.selectedStudentId}>
      StudentPanel Mock
    </div>
  ),
}));

import StudentPanelSection from "../StudentPanelSection";

describe("StudentPanelSection", () => {
  const defaultPanelState = {
    position: { x: 0, y: 0 },
    isDragging: false,
    dragOffset: { x: 0, y: 0 },
    searchQuery: "",
    filteredStudents: [],
    handleMouseDown: vi.fn(),
    handleStudentClick: vi.fn(),
    setSearchQuery: vi.fn(),
    resetDragState: vi.fn(),
    setIsDragStarting: vi.fn(),
  };

  it("StudentPanel을 렌더링한다", () => {
    const { getByTestId } = render(
      <StudentPanelSection
        selectedStudentId="stu-1"
        panelState={defaultPanelState}
        onDragStart={vi.fn()}
        onDragEnd={vi.fn()}
      />
    );
    expect(getByTestId("student-panel")).toBeInTheDocument();
  });

  it("selectedStudentId를 전달한다", () => {
    const { getByTestId } = render(
      <StudentPanelSection
        selectedStudentId="stu-2"
        panelState={defaultPanelState}
        onDragStart={vi.fn()}
        onDragEnd={vi.fn()}
      />
    );
    expect(getByTestId("student-panel")).toHaveAttribute("data-selected", "stu-2");
  });
});
