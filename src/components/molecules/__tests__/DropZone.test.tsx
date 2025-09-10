import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DropZone from "../DropZone";

// Mock console.log to avoid noise in tests
const originalConsoleLog = console.log;

beforeAll(() => {
  console.log = vi.fn();
});

afterAll(() => {
  console.log = originalConsoleLog;
});

describe("DropZone Component", () => {
  const defaultProps = {
    weekday: 0,
    time: "09:00",
    onDrop: vi.fn(),
    onEmptySpaceClick: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("기본 렌더링이 올바르게 되어야 한다", () => {
    render(<DropZone {...defaultProps} />);

    const dropzone = screen.getByTestId("dropzone-0-09:00");
    expect(dropzone).toBeInTheDocument();
  });

  it("드래그 오버 상태가 올바르게 표시되어야 한다", () => {
    render(<DropZone {...defaultProps} />);

    const dropzone = screen.getByTestId("dropzone-0-09:00");

    // 드래그 시작
    fireEvent.dragEnter(dropzone);
    expect(dropzone).toHaveStyle("border: 2px dashed var(--color-primary)");

    // 드래그 종료
    fireEvent.dragLeave(dropzone);
    expect(dropzone).toHaveStyle("border: 1px dashed transparent");
  });

  it("드롭 이벤트가 올바르게 처리되어야 한다", () => {
    const mockOnDrop = vi.fn();
    render(<DropZone {...defaultProps} onDrop={mockOnDrop} />);

    const dropzone = screen.getByTestId("dropzone-0-09:00");

    // 드롭 이벤트 시뮬레이션
    const dropEvent = new Event("drop", { bubbles: true });
    Object.defineProperty(dropEvent, "dataTransfer", {
      value: {
        getData: vi.fn().mockReturnValue("enrollment-1"),
        types: ["text/plain"],
      },
    });

    fireEvent(dropzone, dropEvent);

    expect(mockOnDrop).toHaveBeenCalledTimes(1);
    expect(mockOnDrop).toHaveBeenCalledWith(0, "09:00", "enrollment-1");
  });

  it("빈 공간 클릭 이벤트가 올바르게 처리되어야 한다", () => {
    const mockOnEmptySpaceClick = vi.fn();
    render(
      <DropZone {...defaultProps} onEmptySpaceClick={mockOnEmptySpaceClick} />
    );

    const dropzone = screen.getByTestId("dropzone-0-09:00");
    fireEvent.click(dropzone);

    expect(mockOnEmptySpaceClick).toHaveBeenCalledTimes(1);
    expect(mockOnEmptySpaceClick).toHaveBeenCalledWith(0, "09:00");
  });

  it("style prop이 올바르게 적용되어야 한다", () => {
    const customStyle = { backgroundColor: "red", width: "100px" };
    render(<DropZone {...defaultProps} style={customStyle} />);

    const dropzone = screen.getByTestId("dropzone-0-09:00");
    expect(dropzone).toHaveStyle("background-color: rgb(255, 0, 0)");
    expect(dropzone).toHaveStyle("width: 100px");
  });

  it("드래그 오버 시 배경색이 변경되어야 한다", () => {
    render(<DropZone {...defaultProps} />);

    const dropzone = screen.getByTestId("dropzone-0-09:00");

    fireEvent.dragEnter(dropzone);
    expect(dropzone).toHaveStyle(
      "background-color: rgba(var(--color-primary-rgb), 0.1)"
    );

    fireEvent.dragLeave(dropzone);
    expect(dropzone).toHaveStyle("background-color: rgba(0, 0, 0, 0)");
  });

  it("드래그 이벤트들이 기본 동작을 방지해야 한다", () => {
    render(<DropZone {...defaultProps} />);

    const dropzone = screen.getByTestId("dropzone-0-09:00");

    // preventDefault가 호출되는지 확인하기 위해 spy 설정
    const preventDefaultSpy = vi.fn();

    const dragEnterEvent = new Event("dragenter", { bubbles: true });
    dragEnterEvent.preventDefault = preventDefaultSpy;
    fireEvent(dropzone, dragEnterEvent);

    const dragLeaveEvent = new Event("dragleave", { bubbles: true });
    dragLeaveEvent.preventDefault = preventDefaultSpy;
    fireEvent(dropzone, dragLeaveEvent);

    const dragOverEvent = new Event("dragover", { bubbles: true });
    dragOverEvent.preventDefault = preventDefaultSpy;
    fireEvent(dropzone, dragOverEvent);

    const dropEvent = new Event("drop", { bubbles: true });
    dropEvent.preventDefault = preventDefaultSpy;
    fireEvent(dropzone, dropEvent);

    expect(preventDefaultSpy).toHaveBeenCalledTimes(4);
  });

  // 엣지 케이스 테스트
  it("enrollmentId가 없을 때 onDrop이 호출되지 않아야 한다", () => {
    const mockOnDrop = vi.fn();
    render(<DropZone {...defaultProps} onDrop={mockOnDrop} />);

    const dropzone = screen.getByTestId("dropzone-0-09:00");

    // 빈 enrollmentId로 드롭 이벤트 시뮬레이션
    const dropEvent = new Event("drop", { bubbles: true });
    Object.defineProperty(dropEvent, "dataTransfer", {
      value: {
        getData: vi.fn().mockReturnValue(""),
        types: ["text/plain"],
      },
    });

    fireEvent(dropzone, dropEvent);

    expect(mockOnDrop).not.toHaveBeenCalled();
  });

  it("enrollmentId가 null일 때 onDrop이 호출되지 않아야 한다", () => {
    const mockOnDrop = vi.fn();
    render(<DropZone {...defaultProps} onDrop={mockOnDrop} />);

    const dropzone = screen.getByTestId("dropzone-0-09:00");

    // null enrollmentId로 드롭 이벤트 시뮬레이션
    const dropEvent = new Event("drop", { bubbles: true });
    Object.defineProperty(dropEvent, "dataTransfer", {
      value: {
        getData: vi.fn().mockReturnValue(null),
        types: ["text/plain"],
      },
    });

    fireEvent(dropzone, dropEvent);

    expect(mockOnDrop).not.toHaveBeenCalled();
  });

  it("weekday가 음수일 때 안전하게 처리되어야 한다", () => {
    render(<DropZone {...defaultProps} weekday={-1} />);

    const dropzone = screen.getByTestId("dropzone--1-09:00");
    expect(dropzone).toBeInTheDocument();
  });

  it("weekday가 매우 큰 값일 때 안전하게 처리되어야 한다", () => {
    render(<DropZone {...defaultProps} weekday={1000} />);

    const dropzone = screen.getByTestId("dropzone-1000-09:00");
    expect(dropzone).toBeInTheDocument();
  });

  it("time이 빈 문자열일 때 안전하게 처리되어야 한다", () => {
    render(<DropZone {...defaultProps} time="" />);

    const dropzone = screen.getByTestId("dropzone-0-");
    expect(dropzone).toBeInTheDocument();
  });

  it("time이 null일 때 안전하게 처리되어야 한다", () => {
    render(<DropZone {...defaultProps} time={null as any} />);

    const dropzone = screen.getByTestId("dropzone-0-null");
    expect(dropzone).toBeInTheDocument();
  });

  it("time이 undefined일 때 안전하게 처리되어야 한다", () => {
    render(<DropZone {...defaultProps} time={undefined as any} />);

    const dropzone = screen.getByTestId("dropzone-0-undefined");
    expect(dropzone).toBeInTheDocument();
  });

  it("onDrop이 undefined일 때 안전하게 처리되어야 한다", () => {
    render(<DropZone {...defaultProps} onDrop={undefined as any} />);

    const dropzone = screen.getByTestId("dropzone-0-09:00");
    expect(dropzone).toBeInTheDocument();

    // onDrop이 undefined여도 크래시하지 않아야 함
    const dropEvent = new Event("drop", { bubbles: true });
    Object.defineProperty(dropEvent, "dataTransfer", {
      value: {
        getData: vi.fn().mockReturnValue("enrollment-1"),
        types: ["text/plain"],
      },
    });

    fireEvent(dropzone, dropEvent);
    expect(dropzone).toBeInTheDocument();
  });

  it("onEmptySpaceClick이 undefined일 때 안전하게 처리되어야 한다", () => {
    render(<DropZone {...defaultProps} onEmptySpaceClick={undefined as any} />);

    const dropzone = screen.getByTestId("dropzone-0-09:00");
    expect(dropzone).toBeInTheDocument();

    // onEmptySpaceClick이 undefined여도 크래시하지 않아야 함
    fireEvent.click(dropzone);
    expect(dropzone).toBeInTheDocument();
  });

  it("매우 긴 enrollmentId를 안전하게 처리해야 한다", () => {
    const mockOnDrop = vi.fn();
    render(<DropZone {...defaultProps} onDrop={mockOnDrop} />);

    const dropzone = screen.getByTestId("dropzone-0-09:00");

    const longEnrollmentId = "a".repeat(1000);
    const dropEvent = new Event("drop", { bubbles: true });
    Object.defineProperty(dropEvent, "dataTransfer", {
      value: {
        getData: vi.fn().mockReturnValue(longEnrollmentId),
        types: ["text/plain"],
      },
    });

    fireEvent(dropzone, dropEvent);

    expect(mockOnDrop).toHaveBeenCalledTimes(1);
    expect(mockOnDrop).toHaveBeenCalledWith(0, "09:00", longEnrollmentId);
  });

  it("특수 문자가 포함된 enrollmentId를 안전하게 처리해야 한다", () => {
    const mockOnDrop = vi.fn();
    render(<DropZone {...defaultProps} onDrop={mockOnDrop} />);

    const dropzone = screen.getByTestId("dropzone-0-09:00");

    const specialEnrollmentId = "!@#$%^&*()_+-=[]{}|;':\",./<>?";
    const dropEvent = new Event("drop", { bubbles: true });
    Object.defineProperty(dropEvent, "dataTransfer", {
      value: {
        getData: vi.fn().mockReturnValue(specialEnrollmentId),
        types: ["text/plain"],
      },
    });

    fireEvent(dropzone, dropEvent);

    expect(mockOnDrop).toHaveBeenCalledTimes(1);
    expect(mockOnDrop).toHaveBeenCalledWith(0, "09:00", specialEnrollmentId);
  });

  it("연속된 드래그 이벤트를 안전하게 처리해야 한다", () => {
    render(<DropZone {...defaultProps} />);

    const dropzone = screen.getByTestId("dropzone-0-09:00");

    // 연속된 드래그 이벤트
    fireEvent.dragEnter(dropzone);
    fireEvent.dragOver(dropzone);
    fireEvent.dragLeave(dropzone);
    fireEvent.dragEnter(dropzone);
    fireEvent.dragOver(dropzone);
    fireEvent.dragLeave(dropzone);

    expect(dropzone).toHaveStyle("border: 1px dashed transparent");
  });

  it("여러 props가 동시에 적용되어야 한다", () => {
    const customStyle = { backgroundColor: "blue", height: "50px" };
    render(
      <DropZone
        {...defaultProps}
        weekday={2}
        time="14:30"
        style={customStyle}
      />
    );

    const dropzone = screen.getByTestId("dropzone-2-14:30");
    expect(dropzone).toBeInTheDocument();
    expect(dropzone).toHaveStyle("background-color: rgb(0, 0, 255)");
    expect(dropzone).toHaveStyle("height: 50px");
  });
});
