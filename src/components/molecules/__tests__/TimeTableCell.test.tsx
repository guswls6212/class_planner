import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TimeTableCell from "../TimeTableCell";

const sharedProps = {
  weekday: 0,
  time: "15:00",
  yPosition: 1,
  onDrop: vi.fn(),
  onSessionDrop: vi.fn(),
  onEmptySpaceClick: vi.fn(),
  isAnyDragging: false,
  isDragging: false,
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

  it("드래그 오버 시 dragOver 상태를 업데이트한다", () => {
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

  it("드롭 이벤트 시 세션 드롭 처리 — logical yPosition(1-based)을 그대로 전달", () => {
    const onSessionDrop = vi.fn();
    render(
      <TimeTableCell {...sharedProps} yPosition={2} onSessionDrop={onSessionDrop} />
    );
    const cell = screen.getByTestId("time-table-cell-0-15:00");

    const dropEvent = createDragEvent("drop", "session:abc-123");
    fireEvent(cell, dropEvent);

    expect(onSessionDrop).toHaveBeenCalledWith("abc-123", 0, "15:00", 2);
  });

  it("dragOver 시 onDragOver에 logical yPosition(1-based)을 그대로 전달", () => {
    const onDragOver = vi.fn();
    render(
      <TimeTableCell {...sharedProps} yPosition={3} onDragOver={onDragOver} isAnyDragging={true} isDragging={true} />
    );
    const cell = screen.getByTestId("time-table-cell-0-15:00");
    fireEvent.dragOver(cell);
    expect(onDragOver).toHaveBeenCalledWith(0, "15:00", 3);
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
