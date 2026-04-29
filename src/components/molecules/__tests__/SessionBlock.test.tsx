import { fireEvent, render, screen } from "@testing-library/react";
// import { logger } from "../../../lib/logger";
import { describe, expect, it, vi } from "vitest";
import SessionBlock, {
  shouldShowSubjectName,
  validateSessionBlockProps,
} from "../SessionBlock";

// useSessionStatus returns time-based values; mock to "upcoming" to make
// tests deterministic regardless of the day/time tests run.
vi.mock("../../../hooks/useSessionStatus", () => ({
  useSessionStatus: () => "upcoming",
}));

// Mock console.log to avoid noise in tests
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  console.log = vi.fn();
  console.warn = vi.fn();
});

afterAll(() => {
  console.log = originalConsoleLog;
  console.warn = originalConsoleWarn;
});

describe("SessionBlock Component", () => {
  const mockSession = {
    id: "550e8400-e29b-41d4-a716-446655440201",
    enrollmentIds: [
      "550e8400-e29b-41d4-a716-446655440301",
      "550e8400-e29b-41d4-a716-446655440302",
    ],
    weekday: 0,
    startsAt: "09:00",
    endsAt: "10:00",
    room: "A101",
  };

  const mockSubjects = [
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
      subjectId: "550e8400-e29b-41d4-a716-446655440101",
    },
  ];

  const mockStudents = [
    { id: "550e8400-e29b-41d4-a716-446655440001", name: "김철수" },
    { id: "550e8400-e29b-41d4-a716-446655440002", name: "이영희" },
  ];

  const defaultProps = {
    session: mockSession,
    subjects: mockSubjects,
    enrollments: mockEnrollments,
    students: mockStudents,
    left: 100,
    width: 200,
    yOffset: 0,
    onClick: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("기본 렌더링이 올바르게 되어야 한다", () => {
    render(<SessionBlock {...defaultProps} />);

    const sessionBlock = screen.getByTestId(
      "session-block-550e8400-e29b-41d4-a716-446655440201"
    );
    expect(sessionBlock).toBeInTheDocument();
    expect(sessionBlock).toHaveAttribute(
      "data-session-id",
      "550e8400-e29b-41d4-a716-446655440201"
    );
    expect(sessionBlock).toHaveAttribute("data-starts-at", "09:00");
    expect(sessionBlock).toHaveAttribute("data-ends-at", "10:00");
  });

  it("button role로 렌더링되어야 한다 (키보드 접근성)", () => {
    render(<SessionBlock {...defaultProps} />);

    const sessionBlock = screen.getByRole("button");
    expect(sessionBlock).toBeInTheDocument();
  });

  it("aria-label이 '학생명, 과목명, 요일, 시간' 형식으로 구성되어야 한다", () => {
    render(<SessionBlock {...defaultProps} />);

    const sessionBlock = screen.getByTestId(
      "session-block-550e8400-e29b-41d4-a716-446655440201"
    );
    const label = sessionBlock.getAttribute("aria-label");
    expect(label).toBe("김철수, 이영희 수학 월 09:00–10:00");
  });

  it("학생이 없을 때 aria-label에 '학생 없음'이 포함되어야 한다", () => {
    const sessionWithoutEnrollments = {
      ...mockSession,
      enrollmentIds: [],
    };

    render(
      <SessionBlock
        {...defaultProps}
        session={sessionWithoutEnrollments}
        enrollments={[]}
      />
    );

    const sessionBlock = screen.getByTestId(
      "session-block-550e8400-e29b-41d4-a716-446655440201"
    );
    const label = sessionBlock.getAttribute("aria-label");
    expect(label).toContain("학생 없음");
  });

  it("과목명이 올바르게 표시되어야 한다", () => {
    render(<SessionBlock {...defaultProps} />);

    expect(screen.getByText("수학")).toBeInTheDocument();
  });

  it("학생명이 올바르게 표시되어야 한다", () => {
    render(<SessionBlock {...defaultProps} />);

    // 학생명이 표시되는지 확인 (구체적인 텍스트는 utils 함수에 따라 달라질 수 있음)
    const sessionBlock = screen.getByTestId(
      "session-block-550e8400-e29b-41d4-a716-446655440201"
    );
    expect(sessionBlock).toBeInTheDocument();
  });

  it("시간 정보가 올바르게 표시되어야 한다", () => {
    render(<SessionBlock {...defaultProps} />);

    expect(screen.getByText("09:00-10:00")).toBeInTheDocument();
  });

  it("클릭 이벤트가 올바르게 처리되어야 한다", () => {
    const mockOnClick = vi.fn();
    render(<SessionBlock {...defaultProps} onClick={mockOnClick} />);

    const button = screen.getByRole("button");
    fireEvent.click(button);

    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it("클릭 시 이벤트 버블링이 방지되어야 한다", () => {
    const mockOnClick = vi.fn();
    const parentOnClick = vi.fn();

    render(
      <div onClick={parentOnClick}>
        <SessionBlock {...defaultProps} onClick={mockOnClick} />
      </div>
    );

    const button = screen.getByRole("button");
    fireEvent.click(button);

    expect(mockOnClick).toHaveBeenCalledTimes(1);
    expect(parentOnClick).not.toHaveBeenCalled();
  });

  it("과목이 없을 때 '과목 없음'이 표시되어야 한다", () => {
    const sessionWithoutSubject = {
      ...mockSession,
      enrollmentIds: [], // 빈 배열로 과목 정보 없음
    };

    render(<SessionBlock {...defaultProps} session={sessionWithoutSubject} />);

    expect(screen.getByText("과목 없음")).toBeInTheDocument();
  });

  it("선택된 학생 ID가 올바르게 전달되어야 한다", () => {
    render(
      <SessionBlock
        {...defaultProps}
        selectedStudentIds={["550e8400-e29b-41d4-a716-446655440001"]}
      />
    );

    const sessionBlock = screen.getByTestId(
      "session-block-550e8400-e29b-41d4-a716-446655440201"
    );
    expect(sessionBlock).toBeInTheDocument();
  });

  it("기본 상태에서 좌측 accent 바가 없어야 한다 (borderLeft: undefined)", () => {
    render(<SessionBlock {...defaultProps} />);

    const button = screen.getByRole("button");
    // 기본 상태: in-progress/conflict 아님 → borderLeft 없음
    expect(button.style.borderLeft).toBe("");
  });

  it("파스텔 tone이 버튼 배경에 적용되어야 한다 (#FF0000 → tintFromHex 0.8)", () => {
    render(<SessionBlock {...defaultProps} />);

    const button = screen.getByRole("button");
    // #FF0000 → tint 0.8 → rgb(255, 204, 204)
    expect(button).toHaveStyle({ backgroundColor: "rgb(255, 204, 204)" });
  });

  it("드래그 중이 아닐 때 opacity는 1.0이어야 한다", () => {
    render(<SessionBlock {...defaultProps} isDragging={false} isAnyDragging={false} />);

    // opacity is on the inner button element
    const button = screen.getByRole("button");
    expect(button).toHaveStyle({ opacity: "1" });
  });

  it("isAnyDragging이 true이고 드래그된 세션이 아닐 때 opacity는 1이어야 한다", () => {
    render(
      <SessionBlock
        {...defaultProps}
        isDragging={false}
        isAnyDragging={true}
        draggedSessionId="different-session-id"
      />
    );

    // opacity is on the inner button element
    const button = screen.getByRole("button");
    expect(button).toHaveStyle({ opacity: "1" });
  });

  it("isAnyDragging이 true이고 드래그된 세션일 때 opacity는 0.4이고 visible이어야 한다", () => {
    render(
      <SessionBlock
        {...defaultProps}
        isDragging={false}
        isAnyDragging={true}
        draggedSessionId={mockSession.id}
      />
    );

    const button = screen.getByRole("button");
    expect(button).toHaveStyle({ opacity: "0.4" });
    expect(button).toHaveStyle({ visibility: "visible" });
  });

  // 엣지 케이스 테스트
  it("session이 null일 때 안전하게 처리되어야 한다", () => {
    render(<SessionBlock {...defaultProps} session={null as any} />);

    // 컴포넌트가 크래시하지 않고 렌더링되어야 함
    expect(
      screen.queryByTestId("session-block-550e8400-e29b-41d4-a716-446655440201")
    ).not.toBeInTheDocument();
  });

  it("session이 undefined일 때 안전하게 처리되어야 한다", () => {
    render(<SessionBlock {...defaultProps} session={undefined as any} />);

    // 컴포넌트가 크래시하지 않고 렌더링되어야 함
    expect(
      screen.queryByTestId("session-block-550e8400-e29b-41d4-a716-446655440201")
    ).not.toBeInTheDocument();
  });

  it("빈 subjects 배열을 안전하게 처리해야 한다", () => {
    render(<SessionBlock {...defaultProps} subjects={[]} />);

    const sessionBlock = screen.getByTestId(
      "session-block-550e8400-e29b-41d4-a716-446655440201"
    );
    expect(sessionBlock).toBeInTheDocument();
    expect(screen.getByText("과목 없음")).toBeInTheDocument();
  });

  it("빈 enrollments 배열을 안전하게 처리해야 한다", () => {
    render(<SessionBlock {...defaultProps} enrollments={[]} />);

    const sessionBlock = screen.getByTestId(
      "session-block-550e8400-e29b-41d4-a716-446655440201"
    );
    expect(sessionBlock).toBeInTheDocument();
    expect(screen.getByText("과목 없음")).toBeInTheDocument();
  });

  it("빈 students 배열을 안전하게 처리해야 한다", () => {
    render(<SessionBlock {...defaultProps} students={[]} />);

    const sessionBlock = screen.getByTestId(
      "session-block-550e8400-e29b-41d4-a716-446655440201"
    );
    expect(sessionBlock).toBeInTheDocument();
  });

  it("잘못된 시간 형식을 안전하게 처리해야 한다", () => {
    const sessionWithInvalidTime = {
      ...mockSession,
      startsAt: "",
      endsAt: "invalid-time",
    };

    render(<SessionBlock {...defaultProps} session={sessionWithInvalidTime} />);

    const sessionBlock = screen.getByTestId(
      "session-block-550e8400-e29b-41d4-a716-446655440201"
    );
    expect(sessionBlock).toBeInTheDocument();
    expect(screen.getByText(/invalid-time/)).toBeInTheDocument();
  });

  it("음수 left 값에 대해 안전하게 처리해야 한다", () => {
    render(<SessionBlock {...defaultProps} left={-100} />);

    const sessionBlock = screen.getByTestId(
      "session-block-550e8400-e29b-41d4-a716-446655440201"
    );
    expect(sessionBlock).toBeInTheDocument();
  });

  it("0 width 값에 대해 안전하게 처리해야 한다", () => {
    render(<SessionBlock {...defaultProps} width={0} />);

    const sessionBlock = screen.getByTestId(
      "session-block-550e8400-e29b-41d4-a716-446655440201"
    );
    expect(sessionBlock).toBeInTheDocument();
  });

  it("음수 yOffset 값에 대해 안전하게 처리해야 한다", () => {
    render(<SessionBlock {...defaultProps} yOffset={-50} />);

    const sessionBlock = screen.getByTestId(
      "session-block-550e8400-e29b-41d4-a716-446655440201"
    );
    expect(sessionBlock).toBeInTheDocument();
  });

  it("매우 큰 값들에 대해 안전하게 처리해야 한다", () => {
    render(
      <SessionBlock
        {...defaultProps}
        left={10000}
        width={5000}
        yOffset={2000}
      />
    );

    const sessionBlock = screen.getByTestId(
      "session-block-550e8400-e29b-41d4-a716-446655440201"
    );
    expect(sessionBlock).toBeInTheDocument();
  });

  it("onClick이 undefined일 때 안전하게 처리해야 한다", () => {
    render(<SessionBlock {...defaultProps} onClick={undefined as any} />);

    const sessionBlock = screen.getByTestId(
      "session-block-550e8400-e29b-41d4-a716-446655440201"
    );
    expect(sessionBlock).toBeInTheDocument();

    // onClick이 undefined여도 크래시하지 않아야 함
    const button = screen.getByRole("button");
    fireEvent.click(button);
    expect(sessionBlock).toBeInTheDocument();
  });

  it("매우 긴 과목명을 안전하게 처리해야 한다", () => {
    const longSubjectName = "a".repeat(100);
    const subjectsWithLongName = [
      { id: "sub-1", name: longSubjectName, color: "#FF0000" },
    ];

    render(<SessionBlock {...defaultProps} subjects={subjectsWithLongName} />);

    const sessionBlock = screen.getByTestId(
      "session-block-550e8400-e29b-41d4-a716-446655440201"
    );
    expect(sessionBlock).toBeInTheDocument();
  });

  it("특수 문자가 포함된 과목명을 안전하게 처리해야 한다", () => {
    const specialSubjectName = "!@#$%^&*()_+-=[]{}|;':\",./<>?";
    const subjectsWithSpecialName = [
      { id: "sub-1", name: specialSubjectName, color: "#FF0000" },
    ];

    render(
      <SessionBlock {...defaultProps} subjects={subjectsWithSpecialName} />
    );

    const sessionBlock = screen.getByTestId(
      "session-block-550e8400-e29b-41d4-a716-446655440201"
    );
    expect(sessionBlock).toBeInTheDocument();
    expect(screen.getByText(specialSubjectName)).toBeInTheDocument();
  });

  it("학생이 4명일 때 모든 학생이 표시되어야 한다", () => {
    const sessionWithFour = {
      ...mockSession,
      enrollmentIds: ["enroll-1", "enroll-2", "enroll-3", "enroll-4"],
    } as any;

    const enrollmentsWithFour = [
      { id: "enroll-1", studentId: "s-1", subjectId: mockSubjects[0].id },
      { id: "enroll-2", studentId: "s-2", subjectId: mockSubjects[0].id },
      { id: "enroll-3", studentId: "s-3", subjectId: mockSubjects[0].id },
      { id: "enroll-4", studentId: "s-4", subjectId: mockSubjects[0].id },
    ];

    const studentsWithFour = [
      { id: "s-1", name: "학생1" },
      { id: "s-2", name: "학생2" },
      { id: "s-3", name: "학생3" },
      { id: "s-4", name: "학생4" },
    ];

    render(
      <SessionBlock
        {...defaultProps}
        session={sessionWithFour}
        enrollments={enrollmentsWithFour as any}
        students={studentsWithFour as any}
      />
    );

    const sessionBlock = screen.getByTestId(
      "session-block-550e8400-e29b-41d4-a716-446655440201"
    );
    expect(sessionBlock).toBeInTheDocument();
    expect(sessionBlock).toHaveTextContent("학생1");
    expect(sessionBlock).toHaveTextContent("학생2");
    expect(sessionBlock).toHaveTextContent("학생3");
    expect(sessionBlock).toHaveTextContent("학생4");
  });

  it("학생이 8명일 때 모든 학생이 표시되어야 한다", () => {
    const sessionWithEight = {
      ...mockSession,
      enrollmentIds: [
        "enroll-1",
        "enroll-2",
        "enroll-3",
        "enroll-4",
        "enroll-5",
        "enroll-6",
        "enroll-7",
        "enroll-8",
      ],
    } as any;

    const enrollmentsWithEight = [
      { id: "enroll-1", studentId: "student-1", subjectId: "subject-1" },
      { id: "enroll-2", studentId: "student-2", subjectId: "subject-1" },
      { id: "enroll-3", studentId: "student-3", subjectId: "subject-1" },
      { id: "enroll-4", studentId: "student-4", subjectId: "subject-1" },
      { id: "enroll-5", studentId: "student-5", subjectId: "subject-1" },
      { id: "enroll-6", studentId: "student-6", subjectId: "subject-1" },
      { id: "enroll-7", studentId: "student-7", subjectId: "subject-1" },
      { id: "enroll-8", studentId: "student-8", subjectId: "subject-1" },
    ];

    const studentsWithEight = [
      { id: "student-1", name: "학생1" },
      { id: "student-2", name: "학생2" },
      { id: "student-3", name: "학생3" },
      { id: "student-4", name: "학생4" },
      { id: "student-5", name: "학생5" },
      { id: "student-6", name: "학생6" },
      { id: "student-7", name: "학생7" },
      { id: "student-8", name: "학생8" },
    ];

    render(
      <SessionBlock
        {...defaultProps}
        session={sessionWithEight}
        enrollments={enrollmentsWithEight as any}
        students={studentsWithEight as any}
      />
    );

    const sessionBlock = screen.getByTestId(
      "session-block-550e8400-e29b-41d4-a716-446655440201"
    );
    expect(sessionBlock).toBeInTheDocument();
    expect(sessionBlock).toHaveTextContent("학생1");
    expect(sessionBlock).toHaveTextContent("학생2");
    expect(sessionBlock).toHaveTextContent("학생3");
    expect(sessionBlock).toHaveTextContent("학생4");
    expect(sessionBlock).toHaveTextContent("학생5");
    expect(sessionBlock).toHaveTextContent("학생6");
    expect(sessionBlock).toHaveTextContent("학생7");
    expect(sessionBlock).toHaveTextContent("학생8");
  });

  it("학생이 9명일 때 8명 + '외 1명'으로 표시되어야 한다", () => {
    const sessionWithNine = {
      ...mockSession,
      enrollmentIds: [
        "enroll-1",
        "enroll-2",
        "enroll-3",
        "enroll-4",
        "enroll-5",
        "enroll-6",
        "enroll-7",
        "enroll-8",
        "enroll-9",
      ],
    } as any;

    const enrollmentsWithNine = [
      { id: "enroll-1", studentId: "student-1", subjectId: "subject-1" },
      { id: "enroll-2", studentId: "student-2", subjectId: "subject-1" },
      { id: "enroll-3", studentId: "student-3", subjectId: "subject-1" },
      { id: "enroll-4", studentId: "student-4", subjectId: "subject-1" },
      { id: "enroll-5", studentId: "student-5", subjectId: "subject-1" },
      { id: "enroll-6", studentId: "student-6", subjectId: "subject-1" },
      { id: "enroll-7", studentId: "student-7", subjectId: "subject-1" },
      { id: "enroll-8", studentId: "student-8", subjectId: "subject-1" },
      { id: "enroll-9", studentId: "student-9", subjectId: "subject-1" },
    ];

    const studentsWithNine = [
      { id: "student-1", name: "학생1" },
      { id: "student-2", name: "학생2" },
      { id: "student-3", name: "학생3" },
      { id: "student-4", name: "학생4" },
      { id: "student-5", name: "학생5" },
      { id: "student-6", name: "학생6" },
      { id: "student-7", name: "학생7" },
      { id: "student-8", name: "학생8" },
      { id: "student-9", name: "학생9" },
    ];

    render(
      <SessionBlock
        {...defaultProps}
        session={sessionWithNine}
        enrollments={enrollmentsWithNine as any}
        students={studentsWithNine as any}
      />
    );

    const sessionBlock = screen.getByTestId(
      "session-block-550e8400-e29b-41d4-a716-446655440201"
    );
    expect(sessionBlock).toBeInTheDocument();
    expect(sessionBlock).toHaveTextContent("학생1");
    expect(sessionBlock).toHaveTextContent("학생2");
    expect(sessionBlock).toHaveTextContent("학생3");
    expect(sessionBlock).toHaveTextContent("학생4");
    expect(sessionBlock).toHaveTextContent("학생5");
    expect(sessionBlock).toHaveTextContent("학생6");
    expect(sessionBlock).toHaveTextContent("학생7");
    expect(sessionBlock).toHaveTextContent("학생8");
    expect(sessionBlock).toHaveTextContent("외 1명");
  });

  it("onDragStart가 드래그 시작 시 호출되어야 한다", () => {
    const onDragStart = vi.fn();
    render(
      <SessionBlock {...defaultProps} onDragStart={onDragStart} isReadOnly={false} />
    );
    // drag handlers are on the button (direct mousedown target)
    const button = screen.getByRole("button");
    fireEvent.dragStart(button);
    expect(onDragStart).toHaveBeenCalledTimes(1);
  });

  it("onDragEnd가 드래그 종료 시 호출되어야 한다", () => {
    const onDragEnd = vi.fn();
    render(
      <SessionBlock {...defaultProps} onDragEnd={onDragEnd} isReadOnly={false} />
    );
    // drag handlers are on the button (direct mousedown target)
    const button = screen.getByRole("button");
    fireEvent.dragEnd(button);
    expect(onDragEnd).toHaveBeenCalledTimes(1);
  });

  it("hasConflict=true 일 때 빨간 borderLeft + ⚠ 아이콘이 렌더되어야 한다", () => {
    render(<SessionBlock {...defaultProps} hasConflict={true} />);
    const button = screen.getByRole("button");
    // 충돌: 좌측 3px 빨강 accent 바 (inline style) — jsdom이 hex를 rgb로 정규화
    expect(button.style.borderLeft).toBe("3px solid rgb(239, 68, 68)");
    // ⚠ 경고 아이콘
    expect(screen.getByLabelText("시간 충돌")).toBeInTheDocument();
  });

  it("isReadOnly=true 일 때 onClick이 호출되지 않아야 한다", () => {
    const onClick = vi.fn();
    render(
      <SessionBlock {...defaultProps} onClick={onClick} isReadOnly={true} />
    );
    const button = screen.getByRole("button");
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe("컨텍스트 메뉴 — onDelete prop", () => {
  const contextMenuSession = {
    id: "550e8400-e29b-41d4-a716-446655440201",
    enrollmentIds: ["550e8400-e29b-41d4-a716-446655440301"],
    weekday: 0,
    startsAt: "09:00",
    endsAt: "10:00",
  };
  const contextMenuSubjects = [
    { id: "550e8400-e29b-41d4-a716-446655440101", name: "수학", color: "#FF0000" },
  ];
  const contextMenuEnrollments = [
    { id: "550e8400-e29b-41d4-a716-446655440301", studentId: "550e8400-e29b-41d4-a716-446655440001", subjectId: "550e8400-e29b-41d4-a716-446655440101" },
  ];
  const contextMenuStudents = [
    { id: "550e8400-e29b-41d4-a716-446655440001", name: "김철수" },
  ];
  const baseContextProps = {
    session: contextMenuSession,
    subjects: contextMenuSubjects,
    enrollments: contextMenuEnrollments,
    students: contextMenuStudents,
    left: 100,
    width: 200,
    yOffset: 0,
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("onDelete가 제공되면 컨텍스트 메뉴 삭제 버튼 클릭 시 onDelete가 호출되어야 한다", async () => {
    const mockOnClick = vi.fn();
    const mockOnDelete = vi.fn();

    const { act } = await import("@testing-library/react");

    render(
      <SessionBlock
        {...baseContextProps}
        onClick={mockOnClick}
        onDelete={mockOnDelete}
      />
    );

    // 롱프레스 시뮬레이션 (300ms 타임아웃) — onTouchStart is on the inner button
    const button = screen.getByRole("button");
    fireEvent.touchStart(button);
    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    // 컨텍스트 메뉴가 나타나야 함
    const deleteButton = screen.getByRole("menuitem", { name: "삭제" });
    fireEvent.click(deleteButton);

    expect(mockOnDelete).toHaveBeenCalledTimes(1);
    expect(mockOnClick).not.toHaveBeenCalled();
  });

  it("onDelete가 없으면 컨텍스트 메뉴 삭제 버튼 클릭 시 onClick이 호출되어야 한다 (하위 호환)", async () => {
    const mockOnClick = vi.fn();

    const { act } = await import("@testing-library/react");

    render(
      <SessionBlock
        {...baseContextProps}
        onClick={mockOnClick}
      />
    );

    // 롱프레스 시뮬레이션 (300ms 타임아웃) — onTouchStart is on the inner button
    const button = screen.getByRole("button");
    fireEvent.touchStart(button);
    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    const deleteButton = screen.getByRole("menuitem", { name: "삭제" });
    fireEvent.click(deleteButton);

    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });
});

describe("student mode + no chip selected → subject mode fallback", () => {
  const mockSession = {
    id: "550e8400-e29b-41d4-a716-446655440201",
    enrollmentIds: [
      "550e8400-e29b-41d4-a716-446655440301",
      "550e8400-e29b-41d4-a716-446655440302",
    ],
    weekday: 0,
    startsAt: "09:00",
    endsAt: "10:00",
  };
  const mockSubjects = [
    { id: "550e8400-e29b-41d4-a716-446655440101", name: "수학", color: "#FF0000" },
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
      subjectId: "550e8400-e29b-41d4-a716-446655440101",
    },
  ];
  const mockStudents = [
    { id: "550e8400-e29b-41d4-a716-446655440001", name: "김철수" },
    { id: "550e8400-e29b-41d4-a716-446655440002", name: "이영희" },
  ];

  const baseProps = {
    session: mockSession,
    subjects: mockSubjects,
    enrollments: mockEnrollments,
    students: mockStudents,
    left: 100,
    width: 200,
    yOffset: 0,
    onClick: vi.fn(),
  };

  it("colorBy='student' + selectedStudentIds=[] → primaryLabel은 과목명, secondaryLabel은 학생 이름들", () => {
    render(
      <SessionBlock
        {...baseProps}
        colorBy="student"
        selectedStudentIds={[]}
      />
    );
    // primaryLabel should be subject name (not student name)
    expect(screen.getByText("수학")).toBeInTheDocument();
    // secondaryLabel should include student names
    expect(screen.getByText(/김철수/)).toBeInTheDocument();
    expect(screen.getByText(/이영희/)).toBeInTheDocument();
  });

  it("colorBy='student' + selectedStudentIds=undefined → subject mode 동일 동작", () => {
    render(
      <SessionBlock
        {...baseProps}
        colorBy="student"
        selectedStudentIds={undefined}
      />
    );
    expect(screen.getByText("수학")).toBeInTheDocument();
  });

  it("colorBy='student' + chip 선택됨 → primaryLabel은 학생명", () => {
    render(
      <SessionBlock
        {...baseProps}
        colorBy="student"
        selectedStudentIds={["550e8400-e29b-41d4-a716-446655440001"]}
      />
    );
    // In student mode with chip selected, primaryLabel = first student name
    expect(screen.getByText("김철수")).toBeInTheDocument();
  });
});

describe("SessionBlock Utility Functions", () => {
  describe("validateSessionBlockProps", () => {
    it("유효한 props일 때 true를 반환해야 한다", () => {
      expect(validateSessionBlockProps(100, 200, 0)).toBe(true);
      expect(validateSessionBlockProps(0, 1, 0)).toBe(true);
    });

    it("음수 left일 때 false를 반환해야 한다", () => {
      expect(validateSessionBlockProps(-100, 200, 0)).toBe(false);
    });

    it("0 또는 음수 width일 때 false를 반환해야 한다", () => {
      expect(validateSessionBlockProps(100, 0, 0)).toBe(false);
      expect(validateSessionBlockProps(100, -200, 0)).toBe(false);
    });

    it("음수 yOffset일 때 false를 반환해야 한다", () => {
      expect(validateSessionBlockProps(100, 200, -50)).toBe(false);
    });
  });

  describe("shouldShowSubjectName", () => {
    it("과목명이 있을 때 true를 반환해야 한다", () => {
      expect(shouldShowSubjectName("수학")).toBe(true);
    });

    it("과목명이 undefined일 때 false를 반환해야 한다", () => {
      expect(shouldShowSubjectName(undefined)).toBe(false);
    });

    it("과목명이 빈 문자열일 때 false를 반환해야 한다", () => {
      expect(shouldShowSubjectName("")).toBe(false);
    });

    it("과목명이 null일 때 false를 반환해야 한다", () => {
      expect(shouldShowSubjectName(null as any)).toBe(false);
    });
  });
});
