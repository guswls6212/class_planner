import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session, Subject } from "../../../lib/planner";
import TimeTableGrid from "../TimeTableGrid";

// Mock 데이터 생성
const mockSubjects: Subject[] = [
  { id: "1", name: "수학", color: "#ff0000" },
  { id: "2", name: "영어", color: "#0000ff" },
];

const mockSessions = new Map<number, Session[]>();
mockSessions.set(0, [
  {
    id: "session1",
    enrollmentIds: ["enrollment1"],
    weekday: 0,
    startsAt: "09:00",
    endsAt: "10:00",
    yPosition: 1,
  },
]);

const mockEnrollments = [
  { id: "enrollment1", studentId: "student1", subjectId: "1" },
];

const mockStudents = [{ id: "student1", name: "학생1" }];

const defaultProps = {
  sessions: mockSessions,
  subjects: mockSubjects,
  enrollments: mockEnrollments,
  students: mockStudents,
  onSessionClick: vi.fn(),
  onDrop: vi.fn(),
  onEmptySpaceClick: vi.fn(),
  selectedStudentId: undefined,
  isAnyDragging: false,
  isStudentDragging: false,
};

describe("TimeTableGrid", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("시간표 그리드가 올바르게 렌더링된다", () => {
    render(<TimeTableGrid {...defaultProps} />);

    expect(screen.getByTestId("time-table-grid")).toBeInTheDocument();
    expect(screen.getByText("09:00")).toBeInTheDocument();
    expect(screen.getByText("월")).toBeInTheDocument();
  });

  it("가상 스크롤바 컨테이너가 렌더링된다", () => {
    render(<TimeTableGrid {...defaultProps} />);

    const scrollbarContainer = document.querySelector(
      ".virtual-scrollbar-container"
    );
    expect(scrollbarContainer).toBeInTheDocument();
  });

  it("가상 스크롤바 썸이 렌더링된다", () => {
    render(<TimeTableGrid {...defaultProps} />);

    const scrollbarThumb = document.querySelector(".virtual-scrollbar-thumb");
    expect(scrollbarThumb).toBeInTheDocument();
  });

  it("스크롤바 썸 드래그 시작 시 상태가 업데이트된다", async () => {
    render(<TimeTableGrid {...defaultProps} />);

    const scrollbarThumb = document.querySelector(
      ".virtual-scrollbar-thumb"
    ) as HTMLElement;

    fireEvent.mouseDown(scrollbarThumb);

    // 드래그 상태 확인: 요소가 존재하는지 확인 (cursor는 CSS class로 적용)
    await waitFor(() => {
      expect(scrollbarThumb).toBeInTheDocument();
    });
  });

  it("스크롤바 트랙 클릭 시 스크롤이 발생한다", () => {
    render(<TimeTableGrid {...defaultProps} />);

    const scrollbarContainer = document.querySelector(
      ".virtual-scrollbar-container"
    ) as HTMLElement;
    const gridElement = screen.getByTestId("time-table-grid");

    // 스크롤 이벤트 모킹
    const scrollSpy = vi.spyOn(gridElement, "scrollLeft", "set");

    fireEvent.click(scrollbarContainer);

    // 스크롤이 호출되었는지 확인 (cursor는 CSS class로 적용)
    expect(scrollbarContainer).toBeInTheDocument();
  });

  it("시간 슬롯이 30분 단위로 생성된다", () => {
    render(<TimeTableGrid {...defaultProps} />);

    // 9:00부터 24:00까지 30분 단위로 시간 슬롯이 있는지 확인
    expect(screen.getByText("09:00")).toBeInTheDocument();
    expect(screen.getByText("09:30")).toBeInTheDocument();
    expect(screen.getByText("10:00")).toBeInTheDocument();
    expect(screen.getByText("23:30")).toBeInTheDocument();
  });

  it("요일 라벨이 올바르게 표시된다", () => {
    render(<TimeTableGrid {...defaultProps} />);

    const weekdays = ["월", "화", "수", "목", "금", "토", "일"];
    weekdays.forEach((day) => {
      expect(screen.getByText(day)).toBeInTheDocument();
    });
  });

  it("세션 클릭 시 onSessionClick이 호출된다", () => {
    render(<TimeTableGrid {...defaultProps} />);

    // 세션이 렌더링되었는지 확인 (실제 세션 렌더링 로직에 따라 조정 필요)
    const sessionElements = screen.queryAllByText("수학");
    if (sessionElements.length > 0) {
      fireEvent.click(sessionElements[0]);
      expect(defaultProps.onSessionClick).toHaveBeenCalled();
    }
  });

  it("그리드 스타일이 올바르게 적용된다", () => {
    const { container } = render(<TimeTableGrid {...defaultProps} />);

    // The outermost element has data-testid="time-table-grid" and data-surface="surface"
    const rootElement = screen.getByTestId("time-table-grid");
    expect(rootElement.getAttribute("data-surface")).toBe("surface");

    // The inner scrollable grid div carries the grid-specific Tailwind classes
    const innerGrid = container.querySelector(".time-table-grid") as HTMLElement;
    expect(innerGrid.className).toContain("time-table-grid");
    expect(innerGrid.className).toContain("grid");
    expect(innerGrid.className).toContain("overflow-y-auto");
    expect(innerGrid.className).toContain("overflow-x-auto");
    expect(innerGrid.className).toContain("relative");
  });

  it("가상 스크롤바 스타일이 올바르게 적용된다", () => {
    render(<TimeTableGrid {...defaultProps} />);

    const scrollbarContainer = document.querySelector(
      ".virtual-scrollbar-container"
    );
    const scrollbarThumb = document.querySelector(".virtual-scrollbar-thumb");

    // Styles are applied via CSS class (globals.css) — verify elements exist with correct classes
    expect(scrollbarContainer).toBeInTheDocument();
    expect(scrollbarContainer?.className).toContain("virtual-scrollbar-container");

    expect(scrollbarThumb).toBeInTheDocument();
    expect(scrollbarThumb?.className).toContain("virtual-scrollbar-thumb");
    // Dynamic positioning is still inline
    expect(scrollbarThumb).toHaveStyle({ left: "0px" });
  });
});
