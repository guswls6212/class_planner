import type { Session, Subject } from "@lib/planner";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TimeTableGrid from "../TimeTableGrid";

describe("TimeTableGrid Component", () => {
  const mockSessions = new Map<number, Session[]>([
    [
      0,
      [
        {
          id: "550e8400-e29b-41d4-a716-446655440201",
          enrollmentIds: ["550e8400-e29b-41d4-a716-446655440301"],
          weekday: 0,
          startsAt: "09:00",
          endsAt: "10:00",
          room: "A101",
        },
      ],
    ],
    [
      1,
      [
        {
          id: "550e8400-e29b-41d4-a716-446655440202",
          enrollmentIds: ["550e8400-e29b-41d4-a716-446655440302"],
          weekday: 1,
          startsAt: "10:00",
          endsAt: "11:00",
          room: "B102",
        },
      ],
    ],
  ]);

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

  const mockStudents = [
    { id: "550e8400-e29b-41d4-a716-446655440001", name: "김철수" },
    { id: "550e8400-e29b-41d4-a716-446655440002", name: "이영희" },
  ];

  const defaultProps = {
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

  it("기본 렌더링이 올바르게 되어야 한다", () => {
    render(<TimeTableGrid {...defaultProps} />);

    // TimeTableGrid 컨테이너가 렌더링되어야 함
    const grid = screen.getByTestId("time-table-grid");
    expect(grid).toBeInTheDocument();

    // 시간 슬롯들이 렌더링되어야 함
    expect(screen.getByText("09:00")).toBeInTheDocument();
    expect(screen.getByText("09:30")).toBeInTheDocument();
  });

  it("요일명이 올바르게 표시되어야 한다", () => {
    render(<TimeTableGrid {...defaultProps} />);

    expect(screen.getByText("월")).toBeInTheDocument();
    expect(screen.getByText("화")).toBeInTheDocument();
    expect(screen.getByText("수")).toBeInTheDocument();
    expect(screen.getByText("목")).toBeInTheDocument();
    expect(screen.getByText("금")).toBeInTheDocument();
    expect(screen.getByText("토")).toBeInTheDocument();
    expect(screen.getByText("일")).toBeInTheDocument();
  });

  it("className이 올바르게 적용되어야 한다", () => {
    render(<TimeTableGrid {...defaultProps} className="custom-grid" />);

    const grid = screen.getByTestId("time-table-grid");
    expect(grid).toHaveClass("custom-grid");
  });

  it("style이 올바르게 적용되어야 한다", () => {
    render(
      <TimeTableGrid {...defaultProps} style={{ backgroundColor: "red" }} />
    );

    const grid = screen.getByTestId("time-table-grid");
    expect(grid).toHaveStyle("background-color: rgb(255, 0, 0)");
  });

  it("selectedStudentId가 올바르게 전달되어야 한다", () => {
    render(
      <TimeTableGrid
        {...defaultProps}
        selectedStudentId="550e8400-e29b-41d4-a716-446655440001"
      />
    );

    // TimeTableGrid가 렌더링되어야 함
    const grid = screen.getByTestId("time-table-grid");
    expect(grid).toBeInTheDocument();
  });

  it("ref가 올바르게 전달되어야 한다", () => {
    const ref = vi.fn();
    render(<TimeTableGrid {...defaultProps} ref={ref} />);

    // ref가 호출되었는지 확인
    expect(ref).toHaveBeenCalled();
  });

  // 엣지 케이스 테스트
  it("빈 sessions Map을 안전하게 처리해야 한다", () => {
    const emptySessions = new Map<number, Session[]>();
    render(<TimeTableGrid {...defaultProps} sessions={emptySessions} />);

    // TimeTableGrid가 렌더링되어야 함
    const grid = screen.getByTestId("time-table-grid");
    expect(grid).toBeInTheDocument();
  });

  it("sessions이 null일 때 안전하게 처리되어야 한다", () => {
    render(<TimeTableGrid {...defaultProps} sessions={null as any} />);

    // 컴포넌트가 크래시하지 않고 렌더링되어야 함
    const grid = screen.getByTestId("time-table-grid");
    expect(grid).toBeInTheDocument();
  });

  it("sessions이 undefined일 때 안전하게 처리되어야 한다", () => {
    render(<TimeTableGrid {...defaultProps} sessions={undefined as any} />);

    // 컴포넌트가 크래시하지 않고 렌더링되어야 함
    const grid = screen.getByTestId("time-table-grid");
    expect(grid).toBeInTheDocument();
  });

  it("빈 subjects 배열을 안전하게 처리해야 한다", () => {
    render(<TimeTableGrid {...defaultProps} subjects={[]} />);

    // TimeTableGrid가 렌더링되어야 함
    const grid = screen.getByTestId("time-table-grid");
    expect(grid).toBeInTheDocument();
  });

  it("subjects가 null일 때 안전하게 처리되어야 한다", () => {
    render(<TimeTableGrid {...defaultProps} subjects={null as any} />);

    // 컴포넌트가 크래시하지 않고 렌더링되어야 함
    const grid = screen.getByTestId("time-table-grid");
    expect(grid).toBeInTheDocument();
  });

  it("빈 enrollments 배열을 안전하게 처리해야 한다", () => {
    render(<TimeTableGrid {...defaultProps} enrollments={[]} />);

    // TimeTableGrid가 렌더링되어야 함
    const grid = screen.getByTestId("time-table-grid");
    expect(grid).toBeInTheDocument();
  });

  it("빈 students 배열을 안전하게 처리해야 한다", () => {
    render(<TimeTableGrid {...defaultProps} students={[]} />);

    // TimeTableGrid가 렌더링되어야 함
    const grid = screen.getByTestId("time-table-grid");
    expect(grid).toBeInTheDocument();
  });

  it("onSessionClick이 undefined일 때 안전하게 처리되어야 한다", () => {
    render(
      <TimeTableGrid {...defaultProps} onSessionClick={undefined as any} />
    );

    // 컴포넌트가 크래시하지 않고 렌더링되어야 함
    const grid = screen.getByTestId("time-table-grid");
    expect(grid).toBeInTheDocument();
  });

  it("onDrop이 undefined일 때 안전하게 처리되어야 한다", () => {
    render(<TimeTableGrid {...defaultProps} onDrop={undefined as any} />);

    // 컴포넌트가 크래시하지 않고 렌더링되어야 함
    const grid = screen.getByTestId("time-table-grid");
    expect(grid).toBeInTheDocument();
  });

  it("onEmptySpaceClick이 undefined일 때 안전하게 처리되어야 한다", () => {
    render(
      <TimeTableGrid {...defaultProps} onEmptySpaceClick={undefined as any} />
    );

    // 컴포넌트가 크래시하지 않고 렌더링되어야 함
    const grid = screen.getByTestId("time-table-grid");
    expect(grid).toBeInTheDocument();
  });

  it("매우 많은 세션을 안전하게 처리해야 한다", () => {
    const manySessions = new Map<number, Session[]>();

    // 각 요일에 100개씩 세션 생성
    for (let weekday = 0; weekday < 7; weekday++) {
      const sessions: Session[] = [];
      for (let i = 0; i < 100; i++) {
        sessions.push({
          id: `session-${weekday}-${i}`,
          enrollmentIds: [`enroll-${i}`],
          weekday,
          startsAt: "09:00",
          endsAt: "10:00",
          room: `Room-${i}`,
        });
      }
      manySessions.set(weekday, sessions);
    }

    render(<TimeTableGrid {...defaultProps} sessions={manySessions} />);

    // TimeTableGrid가 렌더링되어야 함
    const grid = screen.getByTestId("time-table-grid");
    expect(grid).toBeInTheDocument();
  });

  it("잘못된 요일 번호를 안전하게 처리해야 한다", () => {
    const invalidWeekdaySessions = new Map<number, Session[]>([
      [
        -1,
        [
          {
            id: "session-1",
            enrollmentIds: [],
            weekday: -1,
            startsAt: "09:00",
            endsAt: "10:00",
          },
        ],
      ],
      [
        7,
        [
          {
            id: "550e8400-e29b-41d4-a716-446655440202",
            enrollmentIds: [],
            weekday: 7,
            startsAt: "09:00",
            endsAt: "10:00",
          },
        ],
      ],
      [
        100,
        [
          {
            id: "550e8400-e29b-41d4-a716-446655440203",
            enrollmentIds: [],
            weekday: 100,
            startsAt: "09:00",
            endsAt: "10:00",
          },
        ],
      ],
    ]);

    render(
      <TimeTableGrid {...defaultProps} sessions={invalidWeekdaySessions} />
    );

    // TimeTableGrid가 렌더링되어야 함
    const grid = screen.getByTestId("time-table-grid");
    expect(grid).toBeInTheDocument();
  });

  it("여러 props가 동시에 적용되어야 한다", () => {
    render(
      <TimeTableGrid
        {...defaultProps}
        className="custom-class"
        style={{ backgroundColor: "blue", height: "500px" }}
        selectedStudentId="550e8400-e29b-41d4-a716-446655440001"
      />
    );

    const grid = screen.getByTestId("time-table-grid");
    expect(grid).toHaveClass("custom-class");
    expect(grid).toHaveStyle("background-color: rgb(0, 0, 255)");
    expect(grid).toHaveStyle("height: 500px");
  });
});
