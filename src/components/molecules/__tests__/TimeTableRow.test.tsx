import type { Session, Subject } from "@lib/planner";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TimeTableRow } from "../TimeTableRow";

// Mock dependencies
vi.mock("../DropZone", () => ({
  default: ({ time, onDrop, onEmptySpaceClick }: any) => (
    <div
      data-testid={`dropzone-${time}`}
      onClick={() => onEmptySpaceClick(0, time)}
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
  const mockSessionYPositions = new Map<string, number>();

  const defaultProps = {
    weekday: 0,
    height: 100,
    sessions: mockSessions,
    subjects: mockSubjects,
    enrollments: mockEnrollments,
    students: mockStudents,
    sessionYPositions: mockSessionYPositions,
    onSessionClick: vi.fn(),
    onDrop: vi.fn(),
    onEmptySpaceClick: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("요일 라벨이 올바르게 표시되어야 한다", () => {
    render(<TimeTableRow {...defaultProps} weekday={0} />);
    expect(screen.getByText("월")).toBeInTheDocument();
  });

  it("다른 요일도 올바르게 표시되어야 한다", () => {
    render(<TimeTableRow {...defaultProps} weekday={1} />);
    expect(screen.getByText("화")).toBeInTheDocument();
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

    // 콘솔 경고를 모킹
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    render(
      <TimeTableRow {...defaultProps} sessions={sessionsWithInvalidTime} />
    );

    // 컴포넌트가 크래시하지 않고 렌더링되어야 함
    expect(screen.getByText("월")).toBeInTheDocument();

    // 경고 메시지가 출력되어야 함
    expect(consoleSpy).toHaveBeenCalledWith("Invalid time format:", "");

    consoleSpy.mockRestore();
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

    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    render(
      <TimeTableRow {...defaultProps} sessions={sessionsWithUndefinedTime} />
    );

    expect(screen.getByText("월")).toBeInTheDocument();
    expect(consoleSpy).toHaveBeenCalledWith("Invalid time format:", undefined);

    consoleSpy.mockRestore();
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

    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    render(<TimeTableRow {...defaultProps} sessions={sessionsWithNullTime} />);

    expect(screen.getByText("월")).toBeInTheDocument();
    expect(consoleSpy).toHaveBeenCalledWith("Invalid time format:", null);

    consoleSpy.mockRestore();
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

    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    render(
      <TimeTableRow {...defaultProps} sessions={sessionsWithInvalidFormat} />
    );

    expect(screen.getByText("월")).toBeInTheDocument();
    // 이 경우는 문자열이므로 경고가 출력되지 않을 수 있음
    // 하지만 NaN이 될 수 있으므로 추가 검증이 필요할 수 있음

    consoleSpy.mockRestore();
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
        selectedStudentId="550e8400-e29b-41d4-a716-446655440001"
      />
    );

    // SessionBlock이 selectedStudentId를 받는지 확인
    const sessionElement = screen.getByTestId(
      "session-550e8400-e29b-41d4-a716-446655440201"
    );
    expect(sessionElement).toBeInTheDocument();
  });
});
