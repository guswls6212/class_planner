import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TimeTableCell from "../TimeTableCell";

// Mock useDroppable so we don't need a real DndContext in unit tests
vi.mock("@dnd-kit/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@dnd-kit/core")>();
  return {
    ...actual,
    useDroppable: () => ({ setNodeRef: vi.fn(), isOver: false, over: null }),
  };
});

const sharedProps = {
  weekday: 0,
  time: "15:00",
  yPosition: 1,
  onDrop: vi.fn(),
  onEmptySpaceClick: vi.fn(),
  isReadOnly: false,
};

describe("TimeTableCell", () => {
  it("빈 셀 클릭 시 onEmptySpaceClick(weekday, time) 호출", () => {
    const onEmptySpaceClick = vi.fn();
    render(
      <TimeTableCell
        {...sharedProps}
        onEmptySpaceClick={onEmptySpaceClick}
      />
    );
    fireEvent.click(screen.getByTestId("time-table-cell-0-15:00"));
    expect(onEmptySpaceClick).toHaveBeenCalledWith(0, "15:00");
  });

  it("isReadOnly 이면 클릭해도 onEmptySpaceClick 호출 안 됨", () => {
    const onEmptySpaceClick = vi.fn();
    render(
      <TimeTableCell
        {...sharedProps}
        isReadOnly={true}
        onEmptySpaceClick={onEmptySpaceClick}
      />
    );
    fireEvent.click(screen.getByTestId("time-table-cell-0-15:00"));
    expect(onEmptySpaceClick).not.toHaveBeenCalled();
  });

  it("data-testid가 올바른 형식으로 설정되어야 한다", () => {
    render(<TimeTableCell {...sharedProps} weekday={2} time="17:00" />);
    expect(screen.getByTestId("time-table-cell-2-17:00")).toBeDefined();
  });

  it("드래그 오버 시 이벤트 핸들러가 동작한다", () => {
    render(<TimeTableCell {...sharedProps} />);
    const cell = screen.getByTestId("time-table-cell-0-15:00");
    fireEvent.dragOver(cell);
    expect(cell).toBeInTheDocument();
  });

  it("드롭 이벤트 시 enrollment 드롭 처리 (session: 접두사 없는 데이터)", () => {
    const onDrop = vi.fn();
    render(<TimeTableCell {...sharedProps} onDrop={onDrop} />);
    const cell = screen.getByTestId("time-table-cell-0-15:00");

    const dropEvent = createDragEvent("drop", "enrollment-1");
    fireEvent(cell, dropEvent);

    expect(onDrop).toHaveBeenCalledWith(0, "15:00", "enrollment-1");
  });

  it("session: 프리픽스 drop은 무시된다 (DndContext.onDragEnd가 처리)", () => {
    const onSessionDrop = vi.fn();
    render(
      <TimeTableCell
        weekday={0}
        time="09:00"
        yPosition={1}
        onDrop={vi.fn()}
        onEmptySpaceClick={vi.fn()}
      />
    );
    const cell = screen.getByTestId("time-table-cell-0-09:00");
    // simulate HTML5 drop with session: prefix — should be ignored
    const dt = { getData: () => "session:abc-123", clearData: vi.fn() };
    fireEvent.drop(cell, { dataTransfer: dt });
    expect(onSessionDrop).not.toHaveBeenCalled();
  });

  it("isReadOnly 이면 드롭 이벤트가 무시된다", () => {
    const onDrop = vi.fn();
    render(<TimeTableCell {...sharedProps} isReadOnly={true} onDrop={onDrop} />);
    const cell = screen.getByTestId("time-table-cell-0-15:00");

    const dropEvent = createDragEvent("drop", "enrollment-1");
    fireEvent(cell, dropEvent);

    expect(onDrop).not.toHaveBeenCalled();
  });
});

// Helper: create a DragEvent with dataTransfer.getData mock
function createDragEvent(type: string, data: string): Event {
  const event = new Event(type, { bubbles: true });
  Object.defineProperty(event, "preventDefault", { value: vi.fn() });
  Object.defineProperty(event, "stopPropagation", { value: vi.fn() });
  Object.defineProperty(event, "dataTransfer", {
    value: {
      getData: vi.fn().mockReturnValue(data),
      clearData: vi.fn(),
    },
  });
  Object.defineProperty(event, "clientY", { value: 100 });
  return event;
}
