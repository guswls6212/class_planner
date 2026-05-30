import type { Session, Subject } from "@lib/planner";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { logger } from "../../../lib/logger";
import { TimeTableRow, coordsToDropTarget } from "../TimeTableRow";

// Mock dnd-kit so HiddenSessionsPopover's useDraggable works without a real DndContext
vi.mock("@dnd-kit/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@dnd-kit/core")>();
  return {
    ...actual,
    useDroppable: () => ({ setNodeRef: vi.fn(), isOver: false, over: null }),
    useDraggable: () => ({
      setNodeRef: vi.fn(),
      attributes: {},
      listeners: {},
      isDragging: false,
    }),
  };
});

// Mock dependencies
vi.mock("../TimeTableCell", () => ({
  default: ({ time, weekday, onDrop, onEmptySpaceClick }: any) => (
    <div
      data-testid={`dropzone-${time}`}
      onClick={() => onEmptySpaceClick(weekday, time)}
    >
      DropZone: {time}
    </div>
  ),
}));

vi.mock("../SessionBlock", () => ({
  default: ({ session, onClick, left, height, overflowsTop, overflowsBottom }: any) => (
    <div
      data-testid={`session-${session.id}`}
      data-left={left}
      data-height={height}
      data-overflows-top={overflowsTop ? "true" : undefined}
      data-overflows-bottom={overflowsBottom ? "true" : undefined}
      onClick={onClick}
    >
      Session: {session.id}
    </div>
  ),
}));

describe("TimeTableRow Component", () => {
  const mockSubjects: Subject[] = [
    {
      id: "550e8400-e29b-41d4-a716-446655440101",
      name: "수학",
      color: "#FF0000",
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440102",
      name: "영어",
      color: "#00FF00",
    },
  ];

  const mockStudents = [
    { id: "550e8400-e29b-41d4-a716-446655440001", name: "김철수" },
    { id: "550e8400-e29b-41d4-a716-446655440002", name: "이영희" },
  ];

  const mockEnrollments = [
    {
      id: "550e8400-e29b-41d4-a716-446655440301",
      studentId: "550e8400-e29b-41d4-a716-446655440001",
      subjectId: "550e8400-e29b-41d4-a716-446655440101",
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440302",
      studentId: "550e8400-e29b-41d4-a716-446655440002",
      subjectId: "550e8400-e29b-41d4-a716-446655440102",
    },
  ];

  const mockSessions = new Map<number, Session[]>();

  const defaultProps = {
    weekday: 0,
    width: 120, // B2: weekday column width (lanes × laneWidth)
    sessions: mockSessions,
    subjects: mockSubjects,
    enrollments: mockEnrollments,
    students: mockStudents,
    onSessionClick: vi.fn(),
    onDrop: vi.fn(),
    onEmptySpaceClick: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("weekday column container가 data-weekday 속성으로 렌더된다", () => {
    render(<TimeTableRow {...defaultProps} weekday={0} />);
    const column = screen.getByTestId("time-table-column-0");
    expect(column).toBeInTheDocument();
    expect(column.getAttribute("data-weekday")).toBe("0");
  });

  it("다른 요일 column도 올바른 data-weekday를 가진다", () => {
    render(<TimeTableRow {...defaultProps} weekday={1} />);
    const column = screen.getByTestId("time-table-column-1");
    expect(column.getAttribute("data-weekday")).toBe("1");
  });

  it("시간 슬롯들이 올바르게 생성되어야 한다", () => {
    render(<TimeTableRow {...defaultProps} />);

    // 30분 단위 시간 슬롯 확인
    expect(screen.getByTestId("dropzone-09:00")).toBeInTheDocument();
    expect(screen.getByTestId("dropzone-09:30")).toBeInTheDocument();
    expect(screen.getByTestId("dropzone-12:00")).toBeInTheDocument();
    expect(screen.getByTestId("dropzone-23:30")).toBeInTheDocument();
  });

  it("세션이 있을 때 올바르게 표시되어야 한다", () => {
    const sessionsWithData = new Map<number, Session[]>();
    sessionsWithData.set(0, [
      {
        id: "550e8400-e29b-41d4-a716-446655440201",
        subjectId: "550e8400-e29b-41d4-a716-446655440101",
        startsAt: "09:00",
        endsAt: "10:00",
        weekStartDate: "",
        enrollmentIds: ["550e8400-e29b-41d4-a716-446655440301"],
        weekday: 0,
      } as Session,
    ]);

    render(<TimeTableRow {...defaultProps} sessions={sessionsWithData} />);

    expect(
      screen.getByTestId("session-550e8400-e29b-41d4-a716-446655440201")
    ).toBeInTheDocument();
  });

  it("잘못된 시간 형식에 대해 안전하게 처리해야 한다", () => {
    const sessionsWithInvalidTime = new Map<number, Session[]>();
    sessionsWithInvalidTime.set(0, [
      {
        id: "session-invalid",
        subjectId: "550e8400-e29b-41d4-a716-446655440101",
        startsAt: "", // 빈 문자열
        endsAt: "10:00",
        weekStartDate: "",
        enrollmentIds: ["550e8400-e29b-41d4-a716-446655440301"],
        weekday: 0,
      } as Session,
    ]);

    const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});

    render(
      <TimeTableRow {...defaultProps} sessions={sessionsWithInvalidTime} />
    );

    // 컴포넌트가 크래시하지 않고 렌더링되어야 함
    expect(screen.getByTestId("time-table-column-0")).toBeInTheDocument();

    // 경고 메시지가 출력되어야 함
    expect(warnSpy).toHaveBeenCalledWith("Invalid time format", { time: "" });

    warnSpy.mockRestore();
  });

  it("undefined 시간에 대해 안전하게 처리해야 한다", () => {
    const sessionsWithUndefinedTime = new Map<number, Session[]>();
    sessionsWithUndefinedTime.set(0, [
      {
        id: "session-undefined",
        subjectId: "550e8400-e29b-41d4-a716-446655440101",
        startsAt: undefined as any, // undefined 값
        endsAt: "10:00",
        weekStartDate: "",
        enrollmentIds: ["550e8400-e29b-41d4-a716-446655440301"],
        weekday: 0,
      } as Session,
    ]);

    const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});

    render(
      <TimeTableRow {...defaultProps} sessions={sessionsWithUndefinedTime} />
    );

    expect(screen.getByTestId("time-table-column-0")).toBeInTheDocument();
    expect(warnSpy).toHaveBeenCalledWith("Invalid time format", { time: undefined });

    warnSpy.mockRestore();
  });

  it("null 시간에 대해 안전하게 처리해야 한다", () => {
    const sessionsWithNullTime = new Map<number, Session[]>();
    sessionsWithNullTime.set(0, [
      {
        id: "session-null",
        subjectId: "550e8400-e29b-41d4-a716-446655440101",
        startsAt: null as any, // null 값
        endsAt: "10:00",
        weekStartDate: "",
        enrollmentIds: ["550e8400-e29b-41d4-a716-446655440301"],
        weekday: 0,
      } as Session,
    ]);

    const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});

    render(<TimeTableRow {...defaultProps} sessions={sessionsWithNullTime} />);

    expect(screen.getByTestId("time-table-column-0")).toBeInTheDocument();
    expect(warnSpy).toHaveBeenCalledWith("Invalid time format", { time: null });

    warnSpy.mockRestore();
  });

  it("잘못된 시간 형식 (콜론 없음)에 대해 안전하게 처리해야 한다", () => {
    const sessionsWithInvalidFormat = new Map<number, Session[]>();
    sessionsWithInvalidFormat.set(0, [
      {
        id: "session-invalid-format",
        subjectId: "550e8400-e29b-41d4-a716-446655440101",
        startsAt: "0900", // 콜론이 없는 형식
        endsAt: "10:00",
        weekStartDate: "",
        enrollmentIds: ["550e8400-e29b-41d4-a716-446655440301"],
        weekday: 0,
      } as Session,
    ]);

    const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});

    render(
      <TimeTableRow {...defaultProps} sessions={sessionsWithInvalidFormat} />
    );

    expect(screen.getByTestId("time-table-column-0")).toBeInTheDocument();
    // 콜론 없는 문자열은 typeof 체크를 통과하므로 경고 없음

    warnSpy.mockRestore();
  });

  it("세션 클릭 이벤트가 올바르게 처리되어야 한다", () => {
    const mockOnSessionClick = vi.fn();
    const sessionsWithData = new Map<number, Session[]>();
    sessionsWithData.set(0, [
      {
        id: "550e8400-e29b-41d4-a716-446655440201",
        subjectId: "550e8400-e29b-41d4-a716-446655440101",
        startsAt: "09:00",
        endsAt: "10:00",
        weekStartDate: "",
        enrollmentIds: ["550e8400-e29b-41d4-a716-446655440301"],
        weekday: 0,
      } as Session,
    ]);

    render(
      <TimeTableRow
        {...defaultProps}
        sessions={sessionsWithData}
        onSessionClick={mockOnSessionClick}
      />
    );

    const sessionElement = screen.getByTestId(
      "session-550e8400-e29b-41d4-a716-446655440201"
    );
    sessionElement.click();

    expect(mockOnSessionClick).toHaveBeenCalledTimes(1);
    expect(mockOnSessionClick).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "550e8400-e29b-41d4-a716-446655440201",
        subjectId: "550e8400-e29b-41d4-a716-446655440101",
        startsAt: "09:00",
        endsAt: "10:00",
      })
    );
  });

  it("빈 공간 클릭 이벤트가 올바르게 처리되어야 한다", () => {
    const mockOnEmptySpaceClick = vi.fn();

    render(
      <TimeTableRow
        {...defaultProps}
        onEmptySpaceClick={mockOnEmptySpaceClick}
      />
    );

    const dropzone = screen.getByTestId("dropzone-09:00");
    dropzone.click();

    expect(mockOnEmptySpaceClick).toHaveBeenCalledTimes(1);
    expect(mockOnEmptySpaceClick).toHaveBeenCalledWith(0, "09:00");
  });

  it("선택된 학생 ID가 올바르게 전달되어야 한다", () => {
    const sessionsWithData = new Map<number, Session[]>();
    sessionsWithData.set(0, [
      {
        id: "550e8400-e29b-41d4-a716-446655440201",
        subjectId: "550e8400-e29b-41d4-a716-446655440101",
        startsAt: "09:00",
        endsAt: "10:00",
        weekStartDate: "",
        enrollmentIds: ["550e8400-e29b-41d4-a716-446655440301"],
        weekday: 0,
      } as Session,
    ]);

    render(
      <TimeTableRow
        {...defaultProps}
        sessions={sessionsWithData}
        selectedStudentIds={["550e8400-e29b-41d4-a716-446655440001"]}
      />
    );

    // SessionBlock이 selectedStudentId를 받는지 확인
    const sessionElement = screen.getByTestId(
      "session-550e8400-e29b-41d4-a716-446655440201"
    );
    expect(sessionElement).toBeInTheDocument();
  });

  describe("시간선 overlay + 현재 시각 선", () => {
    const minimalProps = {
      weekday: 0,
      width: 120,
      sessions: new Map(),
      subjects: [],
      enrollments: [],
      students: [],
      onSessionClick: vi.fn(),
      onDrop: vi.fn(),
      onEmptySpaceClick: vi.fn(),
    };

    it("시간선 overlay가 렌더된다", () => {
      render(<TimeTableRow {...minimalProps} />);
      const overlay = document.querySelector('[aria-hidden="true"]');
      expect(overlay).toBeInTheDocument();
    });

    it("isToday=true + nowLinePx 제공 시 현재 시각 선이 렌더된다", () => {
      render(<TimeTableRow {...minimalProps} isToday={true} nowLinePx={96} />);
      expect(document.querySelector('[aria-label="현재 시각"]')).toBeInTheDocument();
    });

    it("isToday=false 일 때 현재 시각 선이 없다", () => {
      render(<TimeTableRow {...minimalProps} isToday={false} nowLinePx={96} />);
      expect(document.querySelector('[aria-label="현재 시각"]')).not.toBeInTheDocument();
    });
  });

  describe("Phase 4: inline overflow expansion", () => {
    const makeSession = (
      id: string,
      yPosition: number,
      startsAt = "09:00",
      endsAt = "10:00"
    ) =>
      ({
        id,
        subjectId: "550e8400-e29b-41d4-a716-446655440101",
        startsAt,
        endsAt,
        weekStartDate: "",
        enrollmentIds: ["550e8400-e29b-41d4-a716-446655440301"],
        weekday: 0,
        yPosition,
      }) as Session;

    it("yPosition ≤3이면 모든 세션이 보인다 (overflow 없음)", () => {
      const sessions = new Map<number, Session[]>();
      sessions.set(0, [
        makeSession("s1", 1),
        makeSession("s2", 2),
        makeSession("s3", 3),
      ]);
      render(<TimeTableRow {...defaultProps} sessions={sessions} />);
      expect(screen.getByTestId("session-s1")).toBeInTheDocument();
      expect(screen.getByTestId("session-s2")).toBeInTheDocument();
      expect(screen.getByTestId("session-s3")).toBeInTheDocument();
      // No +N chip when no overflow
      expect(screen.queryByTestId("overflow-expand-btn-0")).not.toBeInTheDocument();
    });

    it("4개 세션 overlap: s1~s3 표시, s4 숨김, +1 chip 렌더", () => {
      const sessions = new Map<number, Session[]>();
      sessions.set(0, [
        makeSession("s1", 1),
        makeSession("s2", 2),
        makeSession("s3", 3),
        makeSession("s4", 4),
      ]);
      render(<TimeTableRow {...defaultProps} sessions={sessions} />);
      // First 3 visible
      expect(screen.getByTestId("session-s1")).toBeInTheDocument();
      expect(screen.getByTestId("session-s2")).toBeInTheDocument();
      expect(screen.getByTestId("session-s3")).toBeInTheDocument();
      // 4th hidden
      expect(screen.queryByTestId("session-s4")).not.toBeInTheDocument();
      // +1 chip rendered (not a portal)
      const chip = screen.getByTestId("overflow-expand-btn-0");
      expect(chip).toBeInTheDocument();
      expect(chip.textContent).toBe("+1");
    });

    it("5개 세션: +2 chip 렌더", () => {
      const sessions = new Map<number, Session[]>();
      sessions.set(0, [
        makeSession("s1", 1),
        makeSession("s2", 2),
        makeSession("s3", 3),
        makeSession("s4", 4),
        makeSession("s5", 5),
      ]);
      render(<TimeTableRow {...defaultProps} sessions={sessions} />);
      const chip = screen.getByTestId("overflow-expand-btn-0");
      expect(chip.textContent).toBe("+2");
    });

    it("+N chip 클릭 시 overflow popover가 열린다 (숨겨진 세션 직접 드래그 가능)", () => {
      const sessions = new Map<number, Session[]>();
      sessions.set(0, [
        makeSession("s1", 1),
        makeSession("s2", 2),
        makeSession("s3", 3),
        makeSession("s4", 4),
      ]);
      render(<TimeTableRow {...defaultProps} sessions={sessions} />);

      // Before: s4 hidden, chip shows +1
      expect(screen.queryByTestId("session-s4")).not.toBeInTheDocument();
      const chip = screen.getByTestId("overflow-expand-btn-0");
      expect(chip.textContent).toBe("+1");

      // Click +N → popover opens (lane expand은 하지 않음)
      fireEvent.click(chip);
      expect(screen.getByTestId("overflow-popover")).toBeInTheDocument();
      // s4 mini-card visible in popover
      expect(screen.getByTestId("overflow-popover-session-s4")).toBeInTheDocument();
      // s4 NOT rendered in main lane view yet
      expect(screen.queryByTestId("session-s4")).not.toBeInTheDocument();
      // chip still shows +1 (not collapsed/expanded)
      expect(chip.textContent).toBe("+1");
    });

    it("popover 내 '모두 펼치기' 버튼으로 expand, − 클릭으로 collapse", () => {
      const onToggleExpand = vi.fn();
      const sessions = new Map<number, Session[]>();
      sessions.set(0, [
        makeSession("s1", 1),
        makeSession("s2", 2),
        makeSession("s3", 3),
        makeSession("s4", 4),
      ]);

      const { rerender } = render(
        <TimeTableRow {...defaultProps} sessions={sessions} isExpanded={false} onToggleExpand={onToggleExpand} />
      );

      // Open popover
      fireEvent.click(screen.getByTestId("overflow-expand-btn-0"));
      expect(screen.getByTestId("overflow-popover")).toBeInTheDocument();

      // Click "모두 펼치기" → onToggleExpand called
      fireEvent.click(screen.getByTestId("overflow-popover-expand-btn"));
      expect(onToggleExpand).toHaveBeenCalledOnce();
      // Popover closes after expand
      expect(screen.queryByTestId("overflow-popover")).not.toBeInTheDocument();

      // Simulate parent setting isExpanded=true
      rerender(<TimeTableRow {...defaultProps} sessions={sessions} isExpanded={true} onToggleExpand={onToggleExpand} />);
      expect(screen.getByTestId("session-s4")).toBeInTheDocument();
      expect(screen.getByTestId("overflow-expand-btn-0").textContent).toBe("−");

      // Click − to collapse
      fireEvent.click(screen.getByTestId("overflow-expand-btn-0"));
      expect(onToggleExpand).toHaveBeenCalledTimes(2);
    });

    it("popover 내 숨겨진 세션 mini-card는 dnd-kit useDraggable로 동작한다 (HTML5 draggable 없음)", () => {
      const sessions = new Map<number, Session[]>();
      sessions.set(0, [
        makeSession("s1", 1),
        makeSession("s2", 2),
        makeSession("s3", 3),
        makeSession("s4", 4),
      ]);
      render(<TimeTableRow {...defaultProps} sessions={sessions} />);
      fireEvent.click(screen.getByTestId("overflow-expand-btn-0"));
      const card = screen.getByTestId("overflow-popover-session-s4");
      expect(card).toBeInTheDocument();
      expect(card).not.toHaveAttribute("draggable", "true");
    });

    it("weekday 변경 시 isExpanded가 리셋된다", () => {
      const sessions4 = new Map<number, Session[]>();
      sessions4.set(1, [
        makeSession("s1", 1),
        makeSession("s2", 2),
        makeSession("s3", 3),
        makeSession("s4", 4),
      ]);
      const sessions2 = new Map<number, Session[]>();
      sessions2.set(2, [
        makeSession("s1", 1),
        makeSession("s2", 2),
        makeSession("s3", 3),
        makeSession("s4", 4),
      ]);

      // Start on weekday 1 with overflow
      const { rerender } = render(
        <TimeTableRow {...defaultProps} weekday={1} sessions={sessions4} />
      );

      // +N 클릭 → popover 열기, 모두 펼치기 → expand
      const chip = screen.getByTestId("overflow-expand-btn-1");
      fireEvent.click(chip);
      fireEvent.click(screen.getByTestId("overflow-popover-expand-btn"));
      expect(screen.getByTestId("overflow-expand-btn-1").textContent).toBe("−");

      // Switch to weekday 2 (also has overflow)
      rerender(
        <TimeTableRow {...defaultProps} weekday={2} sessions={sessions2} />
      );

      // isExpanded should be reset — chip shows +N again, not "−"
      expect(screen.getByTestId("overflow-expand-btn-2").textContent).toBe("+1");
    });

    it("isDragging=true 이면 overflow 없고 chip 없음", () => {
      const sessions = new Map<number, Session[]>();
      sessions.set(0, [
        makeSession("s1", 1),
        makeSession("s2", 2),
        makeSession("s3", 3),
        makeSession("s4", 4),
      ]);
      const dragSession = makeSession("s1", 1);
      render(
        <TimeTableRow
          {...defaultProps}
          sessions={sessions}
          dragPreview={{
            draggedSession: dragSession,
            targetWeekday: 1,
            targetTime: "09:00",
            targetYPosition: 1,
          }}
        />
      );
      // No overflow chip when dragging
      expect(screen.queryByTestId("overflow-expand-btn-0")).not.toBeInTheDocument();
      // All sessions visible (overflow suppressed during drag)
      expect(screen.getByTestId("session-s1")).toBeInTheDocument();
      expect(screen.getByTestId("session-s2")).toBeInTheDocument();
      expect(screen.getByTestId("session-s3")).toBeInTheDocument();
      expect(screen.getByTestId("session-s4")).toBeInTheDocument();
    });

    it("SessionOverflowPopover 또는 portal 백드롭이 DOM에 없다", () => {
      const sessions = new Map<number, Session[]>();
      sessions.set(0, [
        makeSession("s1", 1),
        makeSession("s2", 2),
        makeSession("s3", 3),
        makeSession("s4", 4),
      ]);
      render(<TimeTableRow {...defaultProps} sessions={sessions} />);
      expect(screen.queryByTestId("overflow-popover-backdrop")).not.toBeInTheDocument();
      expect(document.querySelector('[role="dialog"]')).not.toBeInTheDocument();
    });

    it("isExpanded=true prop 제공 시 chip 클릭 없이 overflow 세션 모두 표시된다 (controlled mode)", () => {
      const sessions = new Map<number, Session[]>();
      sessions.set(0, [
        makeSession("s1", 1),
        makeSession("s2", 2),
        makeSession("s3", 3),
        makeSession("s4", 4),
      ]);
      render(<TimeTableRow {...defaultProps} sessions={sessions} isExpanded={true} onToggleExpand={vi.fn()} />);
      expect(screen.getByTestId("session-s1")).toBeInTheDocument();
      expect(screen.getByTestId("session-s2")).toBeInTheDocument();
      expect(screen.getByTestId("session-s3")).toBeInTheDocument();
      expect(screen.getByTestId("session-s4")).toBeInTheDocument();
      expect(screen.getByTestId("overflow-expand-btn-0").textContent).toBe("−");
    });

    it("onToggleExpand 콜백은 popover '모두 펼치기' 버튼으로 호출된다 (controlled mode)", () => {
      const onToggleExpand = vi.fn();
      const sessions = new Map<number, Session[]>();
      sessions.set(0, [
        makeSession("s1", 1),
        makeSession("s2", 2),
        makeSession("s3", 3),
        makeSession("s4", 4),
      ]);
      render(<TimeTableRow {...defaultProps} sessions={sessions} isExpanded={false} onToggleExpand={onToggleExpand} />);
      // chip 클릭 → popover 오픈 (onToggleExpand 직접 호출 안 함)
      fireEvent.click(screen.getByTestId("overflow-expand-btn-0"));
      expect(onToggleExpand).not.toHaveBeenCalled();
      // popover 내 펼치기 버튼 클릭 → onToggleExpand 호출
      fireEvent.click(screen.getByTestId("overflow-popover-expand-btn"));
      expect(onToggleExpand).toHaveBeenCalledOnce();
    });

    // ── multi-cluster row-level expand (사용자 보고 Image #9 케이스) ──────────
    // weekday 안 여러 time-row (시간 안 겹치는 cluster) 각각 4+ sessions 인 경우, row
    // 별 independent '+N'/'−' 버튼. sessionClusters.ts § computeRowClusters 참조.

    it("multi-cluster row: 시간 안 겹치는 2 row 각각 4 sessions → row 별 chip 2 개", () => {
      const sessions = new Map<number, Session[]>();
      sessions.set(0, [
        makeSession("a1", 1, "10:00", "11:00"),
        makeSession("a2", 2, "10:00", "11:00"),
        makeSession("a3", 3, "10:00", "11:00"),
        makeSession("a4", 4, "10:00", "11:00"),
        makeSession("b1", 1, "12:00", "13:00"),
        makeSession("b2", 2, "12:00", "13:00"),
        makeSession("b3", 3, "12:00", "13:00"),
        makeSession("b4", 4, "12:00", "13:00"),
      ]);
      render(<TimeTableRow {...defaultProps} sessions={sessions} />);
      // multi-cluster 에서는 chip testid 가 cluster key 포함 형식: `${weekday}-${startMin}`
      // 10:00 = 600 min, 12:00 = 720 min
      expect(screen.getByTestId("overflow-expand-btn-0-600")).toBeInTheDocument();
      expect(screen.getByTestId("overflow-expand-btn-0-720")).toBeInTheDocument();
      // 단일 cluster testid (overflow-expand-btn-0) 는 multi cluster 시 미렌더
      expect(screen.queryByTestId("overflow-expand-btn-0")).not.toBeInTheDocument();
    });

    it("multi-cluster: row 1 만 expand (expandedRowKeys controlled) → row 2 는 collapsed 유지", () => {
      const sessions = new Map<number, Session[]>();
      sessions.set(0, [
        makeSession("a1", 1, "10:00", "11:00"),
        makeSession("a2", 2, "10:00", "11:00"),
        makeSession("a3", 3, "10:00", "11:00"),
        makeSession("a4", 4, "10:00", "11:00"),
        makeSession("b1", 1, "12:00", "13:00"),
        makeSession("b2", 2, "12:00", "13:00"),
        makeSession("b3", 3, "12:00", "13:00"),
        makeSession("b4", 4, "12:00", "13:00"),
      ]);
      render(
        <TimeTableRow
          {...defaultProps}
          sessions={sessions}
          expandedRowKeys={new Set(["0|600"])}
        />,
      );
      // row 1 (cluster startMin=600) — 4 sessions 모두 보임
      expect(screen.getByTestId("session-a1")).toBeInTheDocument();
      expect(screen.getByTestId("session-a4")).toBeInTheDocument();
      // row 1 chip 은 "−" (expanded)
      expect(screen.getByTestId("overflow-expand-btn-0-600").textContent).toBe("−");
      // row 2 (cluster startMin=720) — collapsed: 3 sessions 만 + chip "+1"
      expect(screen.getByTestId("session-b1")).toBeInTheDocument();
      expect(screen.getByTestId("session-b3")).toBeInTheDocument();
      expect(screen.queryByTestId("session-b4")).not.toBeInTheDocument();
      expect(screen.getByTestId("overflow-expand-btn-0-720").textContent).toBe("+1");
    });

    it("multi-cluster: onToggleRowExpand 콜백은 클릭한 cluster 의 key 인자로 호출 (legacy fallback)", () => {
      const onToggleRowExpand = vi.fn();
      const sessions = new Map<number, Session[]>();
      sessions.set(0, [
        makeSession("a1", 1, "10:00", "11:00"),
        makeSession("a2", 2, "10:00", "11:00"),
        makeSession("a3", 3, "10:00", "11:00"),
        makeSession("a4", 4, "10:00", "11:00"),
        makeSession("b1", 1, "12:00", "13:00"),
        makeSession("b2", 2, "12:00", "13:00"),
        makeSession("b3", 3, "12:00", "13:00"),
        makeSession("b4", 4, "12:00", "13:00"),
      ]);
      render(
        <TimeTableRow
          {...defaultProps}
          sessions={sessions}
          expandedRowKeys={new Set(["0|600"])}
          onToggleRowExpand={onToggleRowExpand}
        />,
      );
      // legacy fallback (onToggleAllRowsInWeekday 미정의 + expanded cluster): chip "−"
      // 클릭 → effectiveOnToggleRowExpand("600") (cluster key).
      fireEvent.click(screen.getByTestId("overflow-expand-btn-0-600"));
      expect(onToggleRowExpand).toHaveBeenCalledWith("600");
    });

    it("multi-cluster: onToggleAllRowsInWeekday 우선 호출 — chip 클릭 시 모든 row 일괄 (2026-05-16)", () => {
      const onToggleAllRowsInWeekday = vi.fn();
      const onToggleRowExpand = vi.fn();
      const sessions = new Map<number, Session[]>();
      sessions.set(0, [
        makeSession("a1", 1, "10:00", "11:00"),
        makeSession("a2", 2, "10:00", "11:00"),
        makeSession("a3", 3, "10:00", "11:00"),
        makeSession("a4", 4, "10:00", "11:00"),
        makeSession("b1", 1, "12:00", "13:00"),
        makeSession("b2", 2, "12:00", "13:00"),
        makeSession("b3", 3, "12:00", "13:00"),
        makeSession("b4", 4, "12:00", "13:00"),
      ]);
      render(
        <TimeTableRow
          {...defaultProps}
          sessions={sessions}
          onToggleRowExpand={onToggleRowExpand}
          onToggleAllRowsInWeekday={onToggleAllRowsInWeekday}
        />,
      );
      // chip 클릭 → onToggleAllRowsInWeekday 호출. onToggleRowExpand 미호출.
      fireEvent.click(screen.getByTestId("overflow-expand-btn-0-600"));
      expect(onToggleAllRowsInWeekday).toHaveBeenCalledOnce();
      expect(onToggleRowExpand).not.toHaveBeenCalled();
    });
  });

  // ===================================================================
  // 드래그 회귀 테스트 (Regression: 세션 이동 안 됨 + 10px padding 미표시)
  // ===================================================================
  describe("dragPreview 회귀 테스트", () => {
    const dragSession: Session = {
      id: "drag-session-1",
      startsAt: "09:00",
      endsAt: "10:00",
      weekStartDate: "",
      enrollmentIds: ["550e8400-e29b-41d4-a716-446655440301"],
      weekday: 0,
      yPosition: 1,
    };

    const draggingSessions = new Map<number, Session[]>();
    draggingSessions.set(0, [dragSession]);

    it("dragPreview 없으면 SessionBlock이 정상 렌더된다 (회귀 기준선)", () => {
      render(
        <TimeTableRow
          {...defaultProps}
          weekday={0}
          sessions={draggingSessions}
        />
      );
      expect(screen.getByTestId("session-drag-session-1")).toBeInTheDocument();
    });

    it("dragPreview.targetWeekday === weekday이면 SessionBlock이 숨겨진다 (drop 가로챔 방지)", () => {
      render(
        <TimeTableRow
          {...defaultProps}
          weekday={0}
          sessions={draggingSessions}
          dragPreview={{
            draggedSession: dragSession,
            targetWeekday: 0,
            targetTime: "10:00",
            targetYPosition: 1,
          }}
        />
      );
      expect(screen.queryByTestId("session-drag-session-1")).toBeNull();
    });

    it("dragPreview.targetWeekday === weekday이면 DragGhost가 렌더된다", () => {
      const sessionsForGhost = new Map<number, Session[]>();
      sessionsForGhost.set(0, [{ ...dragSession, startsAt: "10:00", endsAt: "11:00" }]);
      render(
        <TimeTableRow
          {...defaultProps}
          weekday={0}
          sessions={sessionsForGhost}
          dragPreview={{
            draggedSession: dragSession,
            targetWeekday: 0,
            targetTime: "10:00",
            targetYPosition: 1,
          }}
        />
      );
      expect(screen.getByTestId("drag-ghost")).toBeInTheDocument();
    });

    it("dragPreview.targetWeekday !== weekday이면 SessionBlock이 정상 렌더된다", () => {
      render(
        <TimeTableRow
          {...defaultProps}
          weekday={0}
          sessions={draggingSessions}
          dragPreview={{
            draggedSession: dragSession,
            targetWeekday: 2,
            targetTime: "09:00",
            targetYPosition: 1,
          }}
        />
      );
      expect(screen.getByTestId("session-drag-session-1")).toBeInTheDocument();
    });

    it("원본 요일에서 세션이 다른 요일로 이동 중이면 source-placeholder가 렌더된다", () => {
      render(
        <TimeTableRow
          {...defaultProps}
          weekday={0}
          sessions={new Map()}
          dragPreview={{
            draggedSession: dragSession,
            targetWeekday: 2,
            targetTime: "09:00",
            targetYPosition: 1,
          }}
        />
      );
      expect(screen.getByTestId("drag-source")).toBeInTheDocument();
    });

    it("targetWeekday === null이면 source-placeholder가 렌더되지 않는다 (아직 타겟 셀 위를 안 지남)", () => {
      render(
        <TimeTableRow
          {...defaultProps}
          weekday={0}
          sessions={draggingSessions}
          dragPreview={{
            draggedSession: dragSession,
            targetWeekday: null,
            targetTime: null,
            targetYPosition: null,
          }}
        />
      );
      expect(screen.queryByTestId("drag-source")).toBeNull();
    });
  });

});

describe("학생 필터 활성 시 매칭 세션 우선 lane 배치", () => {
  const sid1 = "student-match";
  const sid2 = "student-other-a";
  const sid3 = "student-other-b";
  const sid4 = "student-other-c";

  const enrollments = [
    { id: "e1", studentId: sid1, subjectId: "sub-1" },
    { id: "e2", studentId: sid2, subjectId: "sub-1" },
    { id: "e3", studentId: sid3, subjectId: "sub-1" },
    { id: "e4", studentId: sid4, subjectId: "sub-1" },
  ];

  const students = [
    { id: sid1, name: "이현진" },
    { id: sid2, name: "김A" },
    { id: sid3, name: "김B" },
    { id: sid4, name: "김C" },
  ];

  const subjects = [{ id: "sub-1", name: "수학", color: "#f472b6" }];

  // 4개 겹침 세션: yPosition 1~4
  // 매칭 세션(이현진)은 yPosition=4 (숨겨지는 위치)
  const makeOverlapSessions = (): Session[] => [
    { id: "s1", weekday: 0, startsAt: "09:00", endsAt: "10:00", enrollmentIds: ["e2"], yPosition: 1, weekStartDate: "" } as any,
    { id: "s2", weekday: 0, startsAt: "09:00", endsAt: "10:00", enrollmentIds: ["e3"], yPosition: 2, weekStartDate: "" } as any,
    { id: "s3", weekday: 0, startsAt: "09:00", endsAt: "10:00", enrollmentIds: ["e4"], yPosition: 3, weekStartDate: "" } as any,
    { id: "s4-match", weekday: 0, startsAt: "09:00", endsAt: "10:00", enrollmentIds: ["e1"], yPosition: 4, weekStartDate: "" } as any,
  ];

  const baseProps = {
    weekday: 0,
    width: 120,
    subjects,
    enrollments,
    students,
    onSessionClick: vi.fn(),
    onDrop: vi.fn(),
    onEmptySpaceClick: vi.fn(),
    teachers: [],
  };

  beforeEach(() => vi.clearAllMocks());

  it("학생 필터 미활성: 매칭 세션(yPos=4)이 숨겨져 렌더되지 않음", () => {
    const sessions = new Map([[0, makeOverlapSessions()]]);
    render(
      <TimeTableRow
        {...baseProps}
        sessions={sessions}
        selectedStudentIds={[]}
      />
    );
    // yPos=4는 overflow threshold 이상 → 숨겨짐
    expect(screen.queryByTestId("session-s4-match")).not.toBeInTheDocument();
    // yPos 1~3은 보임
    expect(screen.getByTestId("session-s1")).toBeInTheDocument();
    expect(screen.getByTestId("session-s2")).toBeInTheDocument();
    expect(screen.getByTestId("session-s3")).toBeInTheDocument();
  });

  it("학생 필터 활성: 매칭 세션(yPos=4)이 앞으로 올라와 렌더됨", () => {
    const sessions = new Map([[0, makeOverlapSessions()]]);
    render(
      <TimeTableRow
        {...baseProps}
        sessions={sessions}
        selectedStudentIds={[sid1]}
      />
    );
    // 매칭 세션이 앞으로 재배치되어 visible에 포함됨
    expect(screen.getByTestId("session-s4-match")).toBeInTheDocument();
  });

  it("학생 필터 활성: 비매칭 세션 중 하나가 overflow로 밀려남 (총 4개 중 3개만 visible)", () => {
    const sessions = new Map([[0, makeOverlapSessions()]]);
    render(
      <TimeTableRow
        {...baseProps}
        sessions={sessions}
        selectedStudentIds={[sid1]}
      />
    );
    // 총 4개 세션, 매칭 1개 + 비매칭 3개 → visible 3개 (매칭 포함)
    // 비매칭 중 마지막 1개(yPos가 가장 높은)가 overflow로 밀림
    const visibleCount = ["session-s1","session-s2","session-s3","session-s4-match"]
      .filter(id => screen.queryByTestId(id) !== null).length;
    expect(visibleCount).toBe(3);
  });
});

// ===================================================================
// 회귀 테스트 — 5423339 lane 회귀
// (startsAt 정렬 순서 ≠ yPosition 순서일 때 laneIdx/visibility가 yPosition 기반이어야 함)
// ===================================================================

describe("5423339 회귀 — 필터 미활성: yPosition 기반 visibility (overflow)", () => {
  // 4개 세션이 동시에 겹쳐 overflow 발생.
  // startsAt 정렬 순서가 yPosition 순서와 반대이므로 버그가 명확히 드러남.
  //
  // 입력 순서 (useDisplaySessions startsAt 정렬 시뮬레이션):
  //   sZ: startsAt=09:00, yPosition=3  ← index 0
  //   sW: startsAt=10:00, yPosition=4  ← index 1  (yPos=4이어야 hidden)
  //   sX: startsAt=11:00, yPosition=1  ← index 2
  //   sY: startsAt=12:00, yPosition=2  ← index 3  (yPos=2이어야 visible)
  //
  // BUG (slice(0,3)):  visible=[sZ,sW,sX], hidden=[sY]  → sW(yPos=4) 노출, sY(yPos=2) 숨김
  // FIX (yPos<=3):     visible=[sZ,sX,sY], hidden=[sW]  → 올바른 동작

  const subjects = [{ id: "sub-1", name: "수학", color: "#3B82F6" }];
  const students = [{ id: "stu-1", name: "테스트" }];
  const enrollments = [{ id: "enr-1", studentId: "stu-1", subjectId: "sub-1" }];

  const makeSess = (id: string, yPos: number, startsAt: string, endsAt: string) =>
    ({ id, weekday: 0, startsAt, endsAt, enrollmentIds: ["enr-1"], yPosition: yPos, weekStartDate: "" }) as Session;

  // 입력을 startsAt 오름차순으로 넣어 useDisplaySessions 동작 시뮬레이션
  const sessions = new Map([[0, [
    makeSess("sZ", 3, "09:00", "13:00"),
    makeSess("sW", 4, "10:00", "13:00"),
    makeSess("sX", 1, "11:00", "13:00"),
    makeSess("sY", 2, "12:00", "13:00"),
  ]]]);

  const baseProps = {
    weekday: 0,
    width: 120,
    sessions,
    subjects,
    enrollments,
    students,
    onSessionClick: vi.fn(),
    onDrop: vi.fn(),
    onEmptySpaceClick: vi.fn(),
    selectedStudentIds: [],
  };

  beforeEach(() => vi.clearAllMocks());

  it("yPos=4인 세션이 startsAt이 빨라도 숨겨진다", () => {
    render(<TimeTableRow {...baseProps} />);
    expect(screen.queryByTestId("session-sW")).not.toBeInTheDocument();
  });

  it("yPos=2인 세션이 startsAt이 늦어도 visible이다", () => {
    render(<TimeTableRow {...baseProps} />);
    expect(screen.getByTestId("session-sY")).toBeInTheDocument();
  });

  it("+N chip이 yPos>=4 세션 1개를 카운트한다", () => {
    render(<TimeTableRow {...baseProps} />);
    const chip = screen.getByTestId("overflow-expand-btn-0");
    expect(chip.textContent).toBe("+1");
  });
});

describe("5423339 회귀 — 필터 미활성: yPosition 기반 laneIdx (left 위치)", () => {
  // 3개 세션이 동시에 겹침. startsAt 정렬 순서와 yPosition 순서가 반대.
  // 각 세션의 left 위치가 yPosition 기반이어야 함을 검증.
  //
  // 입력 순서 (startsAt 오름차순):
  //   s_y3: startsAt=09:00, yPosition=3  ← index 0  → left=(3-1)*40=80이어야 함
  //   s_y1: startsAt=10:00, yPosition=1  ← index 1  → left=(1-1)*40=0이어야 함
  //   s_y2: startsAt=11:00, yPosition=2  ← index 2  → left=(2-1)*40=40이어야 함
  //
  // BUG (findIndex): s_y3→left=0, s_y1→left=40, s_y2→left=80 (yPos와 반대)
  // FIX (yPos-1):    s_y3→left=80, s_y1→left=0, s_y2→left=40 (올바름)

  const subjects = [{ id: "sub-1", name: "수학", color: "#3B82F6" }];
  const students = [{ id: "stu-1", name: "테스트" }];
  const enrollments = [{ id: "enr-1", studentId: "stu-1", subjectId: "sub-1" }];

  const makeSess = (id: string, yPos: number, startsAt: string, endsAt: string) =>
    ({ id, weekday: 0, startsAt, endsAt, enrollmentIds: ["enr-1"], yPosition: yPos, weekStartDate: "" }) as Session;

  // startsAt 오름차순 입력, yPosition은 역순
  const sessions = new Map([[0, [
    makeSess("s_y3", 3, "09:00", "12:00"),
    makeSess("s_y1", 1, "10:00", "12:00"),
    makeSess("s_y2", 2, "11:00", "12:00"),
  ]]]);
  // 11:00에 세 세션 모두 겹침 → computeRequiredLanes=3, effectiveLanes=3, laneWidth=40

  const baseProps = {
    weekday: 0,
    width: 120,
    sessions,
    subjects,
    enrollments,
    students,
    onSessionClick: vi.fn(),
    onDrop: vi.fn(),
    onEmptySpaceClick: vi.fn(),
    selectedStudentIds: [],
  };

  beforeEach(() => vi.clearAllMocks());

  it("yPos=1인 세션은 lane 0 (left=0)에 위치한다", () => {
    render(<TimeTableRow {...baseProps} />);
    const el = screen.getByTestId("session-s_y1");
    expect(el.getAttribute("data-left")).toBe("0");
  });

  it("yPos=2인 세션은 lane 1 (left=40)에 위치한다", () => {
    render(<TimeTableRow {...baseProps} />);
    const el = screen.getByTestId("session-s_y2");
    expect(el.getAttribute("data-left")).toBe("40");
  });

  it("yPos=3인 세션은 lane 2 (left=80)에 위치한다", () => {
    render(<TimeTableRow {...baseProps} />);
    const el = screen.getByTestId("session-s_y3");
    expect(el.getAttribute("data-left")).toBe("80");
  });
});

// ===================================================================
// 시간 범위 경계 — overlap allow + clamp + overflow indicator
// 11:30-16:30이 7-13(오전반), 13-22(오후반) 양쪽에서 모두 보이게.
// ===================================================================
describe("시간 범위 경계 세션 — overlap allow + clamp + overflow indicator", () => {
  const subjects = [{ id: "sub-1", name: "수학", color: "#3B82F6" }];
  const students = [{ id: "stu-1", name: "테스트" }];
  const enrollments = [{ id: "enr-1", studentId: "stu-1", subjectId: "sub-1" }];
  const SLOT_H = 32;

  const makeSess = (id: string, startsAt: string, endsAt: string) =>
    ({
      id,
      weekday: 0,
      startsAt,
      endsAt,
      enrollmentIds: ["enr-1"],
      yPosition: 1,
      weekStartDate: "",
    }) as Session;

  const baseProps = {
    weekday: 0,
    width: 120,
    subjects,
    enrollments,
    students,
    onSessionClick: vi.fn(),
    onDrop: vi.fn(),
    onEmptySpaceClick: vi.fn(),
  };

  beforeEach(() => vi.clearAllMocks());

  it("11:30-16:30 + range 7-13: 보임 + bottom indicator (range 13시까지)", () => {
    const sessions = new Map([[0, [makeSess("s1", "11:30", "16:30")]]]);
    render(<TimeTableRow {...baseProps} sessions={sessions} startHour={7} endHour={13} />);
    const el = screen.getByTestId("session-s1");
    expect(el.getAttribute("data-overflows-top")).toBeNull();
    expect(el.getAttribute("data-overflows-bottom")).toBe("true");
    // visStart=11:30 (lower=07:00) → timeIdx=(690-420)/30=9 → top=288
    // visEnd=14:00 (upper=14:00) → durationSlots=(840-690)/30=5 → height=160
    expect(el.getAttribute("data-height")).toBe(`${5 * SLOT_H}`);
  });

  it("11:30-16:30 + range 13-22: 보임 + top indicator", () => {
    const sessions = new Map([[0, [makeSess("s1", "11:30", "16:30")]]]);
    render(<TimeTableRow {...baseProps} sessions={sessions} startHour={13} endHour={22} />);
    const el = screen.getByTestId("session-s1");
    expect(el.getAttribute("data-overflows-top")).toBe("true");
    expect(el.getAttribute("data-overflows-bottom")).toBeNull();
    // visStart=13:00 (lower=13:00) → timeIdx=0 → top=0
    // visEnd=16:30 (upper=23:00) → durationSlots=(990-780)/30=7 → height=224
    expect(el.getAttribute("data-height")).toBe(`${7 * SLOT_H}`);
  });

  it("07:00-10:00 + range 9-23: 보임 + top indicator (앞쪽 잘림)", () => {
    const sessions = new Map([[0, [makeSess("s1", "07:00", "10:00")]]]);
    render(<TimeTableRow {...baseProps} sessions={sessions} startHour={9} endHour={23} />);
    const el = screen.getByTestId("session-s1");
    expect(el.getAttribute("data-overflows-top")).toBe("true");
    expect(el.getAttribute("data-overflows-bottom")).toBeNull();
  });

  it("21:00-23:30 + range 9-22 (upper=23:00): 보임 + bottom indicator", () => {
    const sessions = new Map([[0, [makeSess("s1", "21:00", "23:30")]]]);
    render(<TimeTableRow {...baseProps} sessions={sessions} startHour={9} endHour={22} />);
    const el = screen.getByTestId("session-s1");
    expect(el.getAttribute("data-overflows-bottom")).toBe("true");
  });

  it("11:30-12:30 + range 7-13: 완전 포함 → indicator 없음", () => {
    const sessions = new Map([[0, [makeSess("s1", "11:30", "12:30")]]]);
    render(<TimeTableRow {...baseProps} sessions={sessions} startHour={7} endHour={13} />);
    const el = screen.getByTestId("session-s1");
    expect(el.getAttribute("data-overflows-top")).toBeNull();
    expect(el.getAttribute("data-overflows-bottom")).toBeNull();
  });

  it("14:00-15:00 + range 7-13: 완전 밖 → 숨김", () => {
    const sessions = new Map([[0, [makeSess("s1", "14:00", "15:00")]]]);
    render(<TimeTableRow {...baseProps} sessions={sessions} startHour={7} endHour={13} />);
    expect(screen.queryByTestId("session-s1")).toBeNull();
  });

  it("06:00-08:00 + range 9-23: 완전 밖(boundary 닿음 X) → 숨김", () => {
    const sessions = new Map([[0, [makeSess("s1", "06:00", "08:00")]]]);
    render(<TimeTableRow {...baseProps} sessions={sessions} startHour={9} endHour={23} />);
    expect(screen.queryByTestId("session-s1")).toBeNull();
  });

  it("startsAt=endsAt(=lower) edge: endMin=lowerBound 이면 overlap 아님 → 숨김", () => {
    // 09:00-09:00 같은 0-duration은 비현실적이지만 boundary 검사: endMin > lowerBound 조건.
    // 09:00 시작 09:00 종료 → endMin(540) > lowerBound(540) false → 숨김.
    const sessions = new Map([[0, [makeSess("s1", "09:00", "09:00")]]]);
    render(<TimeTableRow {...baseProps} sessions={sessions} startHour={9} endHour={23} />);
    expect(screen.queryByTestId("session-s1")).toBeNull();
  });
});

// ===================================================================
// coordsToDropTarget — 좌표→(time, yPosition) 변환 단위 테스트 (Task 2A)
// ===================================================================
describe("coordsToDropTarget — 좌표→(time, yPosition) 변환", () => {
  const timeSlots = ["09:00", "09:30", "10:00", "10:30"];
  const SLOT_H = 32;
  const LANE_W = 40;
  const LANES = 3;
  const PAD = 10;

  it("x=0, y=0 → lane 1, 09:00", () => {
    const r = coordsToDropTarget(0, 0, LANE_W, LANES, SLOT_H, timeSlots, PAD, false);
    expect(r).toEqual({ time: "09:00", yPosition: 1 });
  });

  it("x=40, y=0 → lane 2, 09:00", () => {
    const r = coordsToDropTarget(40, 0, LANE_W, LANES, SLOT_H, timeSlots, PAD, false);
    expect(r).toEqual({ time: "09:00", yPosition: 2 });
  });

  it("x=79, y=0 → still lane 2 (floor division)", () => {
    const r = coordsToDropTarget(79, 0, LANE_W, LANES, SLOT_H, timeSlots, PAD, false);
    expect(r).toEqual({ time: "09:00", yPosition: 2 });
  });

  it("x=80, y=0 → lane 3", () => {
    const r = coordsToDropTarget(80, 0, LANE_W, LANES, SLOT_H, timeSlots, PAD, false);
    expect(r).toEqual({ time: "09:00", yPosition: 3 });
  });

  it("y=32 → 09:30 slot", () => {
    const r = coordsToDropTarget(0, 32, LANE_W, LANES, SLOT_H, timeSlots, PAD, false);
    expect(r).toEqual({ time: "09:30", yPosition: 1 });
  });

  it("isDraggingToThis=true: x=10 → lane 1 (subtract PAD)", () => {
    const r = coordsToDropTarget(10, 0, LANE_W, LANES, SLOT_H, timeSlots, PAD, true);
    expect(r).toEqual({ time: "09:00", yPosition: 1 });
  });

  it("isDraggingToThis=true: x=50 → lane 2 (subtract PAD → 40)", () => {
    const r = coordsToDropTarget(50, 0, LANE_W, LANES, SLOT_H, timeSlots, PAD, true);
    expect(r).toEqual({ time: "09:00", yPosition: 2 });
  });

  it("x 범위 초과 → 마지막 lane으로 클램프", () => {
    const r = coordsToDropTarget(9999, 0, LANE_W, LANES, SLOT_H, timeSlots, PAD, false);
    expect(r).toEqual({ time: "09:00", yPosition: 3 });
  });

  it("y 범위 초과 → 마지막 slot으로 클램프", () => {
    const r = coordsToDropTarget(0, 9999, LANE_W, LANES, SLOT_H, timeSlots, PAD, false);
    expect(r).toEqual({ time: "10:30", yPosition: 1 });
  });

  it("timeSlots가 비어있으면 null 반환", () => {
    const r = coordsToDropTarget(0, 0, LANE_W, LANES, SLOT_H, [], PAD, false);
    expect(r).toBeNull();
  });
});

// ===================================================================
// Task 3 (B): 드래그 중 레인 시각화 — 경계선 + 하이라이트
// ===================================================================
describe("드래그 중 레인 시각화 — 경계선 + 하이라이트", () => {
  const makeS = (id: string, yPos: number) =>
    ({
      id,
      subjectId: "550e8400-e29b-41d4-a716-446655440101",
      startsAt: "09:00",
      endsAt: "10:00",
      weekStartDate: "",
      enrollmentIds: ["550e8400-e29b-41d4-a716-446655440301"],
      weekday: 0,
      yPosition: yPos,
    }) as Session;

  const twoSessionMap = () => {
    const m = new Map<number, Session[]>();
    m.set(0, [makeS("s1", 1), makeS("s2", 2)]);
    return m;
  };

  const dragPreviewAt = (
    targetWeekday: number | null,
    yPos: number | null,
    mode: "lane" | "insertBefore" | null = "lane",
    half: "left" | "right" | null = null,
  ) => ({
    draggedSession: makeS("s1", 1),
    targetWeekday,
    targetTime: "09:00",
    targetYPosition: yPos,
    targetMode: mode,
    targetHalf: half,
  });

  const defaultProps = {
    weekday: 0,
    width: 240,
    subjects: [{ id: "550e8400-e29b-41d4-a716-446655440101", name: "수학", color: "#3B82F6" }],
    enrollments: [{ id: "550e8400-e29b-41d4-a716-446655440301", studentId: "550e8400-e29b-41d4-a716-446655440001", subjectId: "550e8400-e29b-41d4-a716-446655440101" }],
    students: [{ id: "550e8400-e29b-41d4-a716-446655440001", name: "김철수" }],
    onSessionClick: vi.fn(),
    onDrop: vi.fn(),
    onEmptySpaceClick: vi.fn(),
  };

  beforeEach(() => vi.clearAllMocks());

  it("드래그 중 effectiveLanes>=2이면 lane-boundary-0 렌더된다", () => {
    render(
      <TimeTableRow
        {...defaultProps}
        sessions={twoSessionMap()}
        isAnyDragging={true}
        dragPreview={dragPreviewAt(1, 1)}
      />
    );
    expect(screen.getByTestId("lane-boundary-0")).toBeInTheDocument();
  });

  it("드래그 안 하면 lane-boundary 없다", () => {
    render(<TimeTableRow {...defaultProps} sessions={twoSessionMap()} />);
    expect(screen.queryByTestId("lane-boundary-0")).not.toBeInTheDocument();
  });

  it("targetWeekday===weekday && targetYPosition!=null → lane-highlight 렌더된다", () => {
    render(
      <TimeTableRow
        {...defaultProps}
        weekday={0}
        sessions={twoSessionMap()}
        isAnyDragging={true}
        dragPreview={dragPreviewAt(0, 2)}
      />
    );
    expect(screen.getByTestId("lane-highlight")).toBeInTheDocument();
  });

  it("targetWeekday!==weekday → lane-highlight 없다", () => {
    render(
      <TimeTableRow
        {...defaultProps}
        weekday={0}
        sessions={twoSessionMap()}
        isAnyDragging={true}
        dragPreview={dragPreviewAt(1, 2)}
      />
    );
    expect(screen.queryByTestId("lane-highlight")).not.toBeInTheDocument();
  });

  it("targetYPosition=null → lane-highlight 없다", () => {
    render(
      <TimeTableRow
        {...defaultProps}
        weekday={0}
        sessions={twoSessionMap()}
        isAnyDragging={true}
        dragPreview={dragPreviewAt(0, null)}
      />
    );
    expect(screen.queryByTestId("lane-highlight")).not.toBeInTheDocument();
  });

  // ── 3 시각 피드백 SSOT 통일 (PR 후속) ────────────────────────────────
  // dnd-visual-feedback.md 참조 — drag-ghost / lane-highlight / amber overlay 모두
  // ghost 좌표 (laidOutSessions) derive. lane-highlight 는 항상 column 박스 (사용자
  // 직관 "어느 lane 으로 드롭"). amber overlay 는 insertBefore mode 시 ghost 같은 lane.

  it("targetMode=insertBefore → lane-highlight 박스 (vertical line 아님, width != 3px)", () => {
    render(
      <TimeTableRow
        {...defaultProps}
        weekday={0}
        sessions={twoSessionMap()}
        isAnyDragging={true}
        dragPreview={dragPreviewAt(0, 2, "insertBefore", "left")}
      />
    );
    const el = screen.getByTestId("lane-highlight");
    expect(el).toBeInTheDocument();
    expect(el).not.toHaveAttribute("data-mode"); // mode 분기 제거됨
    expect((el as HTMLElement).style.width).not.toBe("3px");
  });

  it("targetMode=lane → lane-highlight 박스 렌더", () => {
    render(
      <TimeTableRow
        {...defaultProps}
        weekday={0}
        sessions={twoSessionMap()}
        isAnyDragging={true}
        dragPreview={dragPreviewAt(0, 2, "lane")}
      />
    );
    const el = screen.getByTestId("lane-highlight");
    expect(el).toBeInTheDocument();
    expect((el as HTMLElement).style.width).not.toBe("3px");
  });

  it("targetMode undefined → lane-highlight 박스 (backward compat)", () => {
    render(
      <TimeTableRow
        {...defaultProps}
        weekday={0}
        sessions={twoSessionMap()}
        isAnyDragging={true}
        dragPreview={dragPreviewAt(0, 2)}
      />
    );
    expect(screen.getByTestId("lane-highlight")).toBeInTheDocument();
  });

  // ── amber overlay (Variant E "여기 삽입") — ghost 좌표 derive ───────────

  it("targetMode=insertBefore + targetHalf=left → amber-overlay 렌더 (data-target-half=left)", () => {
    render(
      <TimeTableRow
        {...defaultProps}
        weekday={0}
        sessions={twoSessionMap()}
        isAnyDragging={true}
        dragPreview={dragPreviewAt(0, 1, "insertBefore", "left")}
      />
    );
    const amber = screen.getByTestId("amber-overlay");
    expect(amber).toBeInTheDocument();
    expect(amber).toHaveAttribute("data-target-half", "left");
  });

  it("targetMode=insertBefore + targetHalf=right → amber-overlay data-target-half=right", () => {
    render(
      <TimeTableRow
        {...defaultProps}
        weekday={0}
        sessions={twoSessionMap()}
        isAnyDragging={true}
        dragPreview={dragPreviewAt(0, 1, "insertBefore", "right")}
      />
    );
    expect(screen.getByTestId("amber-overlay")).toHaveAttribute("data-target-half", "right");
  });

  it("targetMode=lane → amber-overlay 미렌더", () => {
    render(
      <TimeTableRow
        {...defaultProps}
        weekday={0}
        sessions={twoSessionMap()}
        isAnyDragging={true}
        dragPreview={dragPreviewAt(0, 1, "lane")}
      />
    );
    expect(screen.queryByTestId("amber-overlay")).not.toBeInTheDocument();
  });

  it("multi-select (selectedSessionIds.size > 1) → amber-overlay 미렌더 (T10b 가드)", () => {
    render(
      <TimeTableRow
        {...defaultProps}
        weekday={0}
        sessions={twoSessionMap()}
        isAnyDragging={true}
        selectedSessionIds={new Set(["s1", "s2"])}
        dragPreview={dragPreviewAt(0, 1, "insertBefore", "left")}
      />
    );
    expect(screen.queryByTestId("amber-overlay")).not.toBeInTheDocument();
  });

  it("dragStartedAsCopy → amber-overlay 미렌더 (T10b 가드)", () => {
    render(
      <TimeTableRow
        {...defaultProps}
        weekday={0}
        sessions={twoSessionMap()}
        isAnyDragging={true}
        dragStartedAsCopy={true}
        dragPreview={dragPreviewAt(0, 1, "insertBefore", "left")}
      />
    );
    expect(screen.queryByTestId("amber-overlay")).not.toBeInTheDocument();
  });
});
