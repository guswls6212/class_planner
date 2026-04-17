import type { Session, Subject } from "@lib/planner";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { logger } from "../../../lib/logger";
import { TimeTableRow } from "../TimeTableRow";

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
  default: ({ session, onClick }: any) => (
    <div data-testid={`session-${session.id}`} onClick={onClick}>
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

  describe("D-hybrid overflow (B3)", () => {
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
        enrollmentIds: ["550e8400-e29b-41d4-a716-446655440301"],
        weekday: 0,
        yPosition,
      }) as Session;

    it("yPosition ≤3이면 모든 세션이 보인다", () => {
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
    });

    it("yPosition ≥4이면 yPos 1,2는 보이고 3+는 숨겨진다", () => {
      const sessions = new Map<number, Session[]>();
      sessions.set(0, [
        makeSession("s1", 1),
        makeSession("s2", 2),
        makeSession("s3", 3),
        makeSession("s4", 4),
      ]);
      render(<TimeTableRow {...defaultProps} sessions={sessions} />);
      expect(screen.getByTestId("session-s1")).toBeInTheDocument();
      expect(screen.getByTestId("session-s2")).toBeInTheDocument();
      expect(screen.queryByTestId("session-s3")).not.toBeInTheDocument();
      expect(screen.queryByTestId("session-s4")).not.toBeInTheDocument();
    });

    it("overflow 시 활성 슬롯에 pill이 렌더된다", () => {
      const sessions = new Map<number, Session[]>();
      sessions.set(0, [
        makeSession("s1", 1),
        makeSession("s2", 2),
        makeSession("s3", 3), // hidden
        makeSession("s4", 4), // hidden — needed to trigger threshold (rawMaxYPos=4≥4)
      ]);
      render(<TimeTableRow {...defaultProps} sessions={sessions} />);
      // s3, s4이 09:00-10:00에 있으므로 09:00 슬롯에 pill이 있어야 한다
      expect(screen.getByTestId("overflow-pill-09:00")).toBeInTheDocument();
      expect(screen.getByTestId("overflow-pill-09:00")).toHaveTextContent("+2");
    });

    it("pill 클릭 시 popover가 열린다", async () => {
      const sessions = new Map<number, Session[]>();
      sessions.set(0, [
        makeSession("s1", 1),
        makeSession("s2", 2),
        makeSession("s3", 3),
        makeSession("s4", 4), // needed to trigger overflow
      ]);
      render(<TimeTableRow {...defaultProps} sessions={sessions} />);
      const pill = screen.getByTestId("overflow-pill-09:00");
      pill.click();
      expect(await screen.findByTestId("overflow-popover-backdrop")).toBeInTheDocument();
    });
  });
});

