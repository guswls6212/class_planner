import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Session, Subject } from '../../../lib/planner';
import TimeTableRow from '../TimeTableRow';

// Mock 컴포넌트들
vi.mock('../SessionBlock', () => ({
  default: ({
    session,
    subject,
    onClick,
  }: {
    session: Session;
    subject: Subject;
    onClick: (session: Session) => void;
  }) => (
    <div
      data-testid={`session-block-${session.id}`}
      onClick={() => onClick(session)}
      style={{
        position: 'absolute',
        backgroundColor: subject.color,
        padding: '4px',
        borderRadius: '4px',
        cursor: 'pointer',
      }}
    >
      {subject.name} {session.startsAt}-{session.endsAt}
    </div>
  ),
}));

vi.mock('../DropZone', () => ({
  default: ({
    hourIdx,
    height,
    onDrop,
  }: {
    hourIdx: number;
    height: number;
    onDrop: (e: React.DragEvent) => void;
  }) => {
    const timeString = `${(hourIdx + 9).toString().padStart(2, '0')}:00`;
    return (
      <div
        data-testid={`drop-zone-0-${timeString}`}
        onClick={() => {
          const mockEvent = {
            dataTransfer: {
              getData: () => 'test-enrollment',
            },
          } as unknown as React.DragEvent;
          onDrop(mockEvent);
        }}
        style={{
          position: 'absolute',
          border: '1px dashed transparent',
          transition: 'border-color 0.2s',
          zIndex: 5,
          backgroundColor: 'transparent',
          width: '120px',
          height: `${height}px`,
        }}
      >
        드롭존 {timeString}
      </div>
    );
  },
}));

// Mock 데이터
const mockSubjects: Subject[] = [
  { id: 'subject-1', name: '수학', color: '#f59e0b' },
  { id: 'subject-2', name: '영어', color: '#3b82f6' },
];

const mockEnrollments = [
  { id: 'enrollment-1', studentId: 'student-1', subjectId: 'subject-1' },
  { id: 'enrollment-2', studentId: 'student-2', subjectId: 'subject-2' },
];

const mockSessions = new Map<number, Session[]>([
  [
    0,
    [
      {
        id: 'session-1',
        enrollmentId: 'enrollment-1',
        weekday: 0,
        startsAt: '09:00',
        endsAt: '10:00',
      },
      {
        id: 'session-2',
        enrollmentId: 'enrollment-2',
        weekday: 0,
        startsAt: '10:00',
        endsAt: '11:00',
      },
    ],
  ],
]);

const mockSessionYPositions = new Map<string, number>([
  ['session-1', 0],
  ['session-2', 0],
]);

describe('TimeTableRow 렌더링 테스트', () => {
  const defaultProps = {
    weekday: 0,
    height: 120,
    sessions: mockSessions,
    subjects: mockSubjects,
    enrollments: mockEnrollments,
    sessionYPositions: mockSessionYPositions,
    onSessionClick: vi.fn(),
    onDrop: vi.fn(),
    onEmptySpaceClick: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('요일 헤더를 올바르게 렌더링한다', () => {
    render(<TimeTableRow {...defaultProps} />);

    const weekdayHeader = screen.getByText('월');
    expect(weekdayHeader).toBeInTheDocument();
    // 요일 헤더의 기본 스타일 속성들을 확인
    expect(weekdayHeader).toHaveStyle({
      fontWeight: 'bold',
      fontSize: '14px',
      height: '120px',
      padding: '12px 8px',
      textAlign: 'center',
      display: 'flex',
    });
  });

  it('요일별로 올바른 텍스트를 표시한다', () => {
    const weekdays = ['월', '화', '수', '목', '금', '토', '일'];

    weekdays.forEach((weekday, index) => {
      const { unmount } = render(
        <TimeTableRow {...defaultProps} weekday={index} />
      );

      expect(screen.getByText(weekday)).toBeInTheDocument();
      unmount();
    });
  });

  it('세션을 올바르게 렌더링한다', () => {
    render(<TimeTableRow {...defaultProps} />);

    // 두 개의 세션이 렌더링되어야 함
    expect(screen.getByTestId('session-block-session-1')).toBeInTheDocument();
    expect(screen.getByTestId('session-block-session-2')).toBeInTheDocument();

    // 세션 내용 확인
    expect(screen.getByText('수학 09:00-10:00')).toBeInTheDocument();
    expect(screen.getByText('영어 10:00-11:00')).toBeInTheDocument();
  });

  it('세션 클릭 이벤트를 올바르게 처리한다', () => {
    const mockOnSessionClick = vi.fn();
    render(
      <TimeTableRow {...defaultProps} onSessionClick={mockOnSessionClick} />
    );

    const firstSession = screen.getByTestId('session-block-session-1');
    fireEvent.click(firstSession);

    expect(mockOnSessionClick).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'session-1' })
    );
  });

  it('드롭존을 올바르게 렌더링한다', () => {
    render(<TimeTableRow {...defaultProps} />);

    // 시간별 드롭존이 렌더링되어야 함
    expect(screen.getByTestId('drop-zone-0-09:00')).toBeInTheDocument();
    expect(screen.getByTestId('drop-zone-0-10:00')).toBeInTheDocument();
    expect(screen.getByTestId('drop-zone-0-11:00')).toBeInTheDocument();
  });

  it('드롭 이벤트를 올바르게 처리한다', () => {
    const mockOnDrop = vi.fn();
    render(<TimeTableRow {...defaultProps} onDrop={mockOnDrop} />);

    const dropZone = screen.getByTestId('drop-zone-0-09:00');
    fireEvent.click(dropZone);

    expect(mockOnDrop).toHaveBeenCalledWith(0, '09:00', 'test-enrollment');
  });

  it('컨테이너 스타일을 올바르게 적용한다', () => {
    render(<TimeTableRow {...defaultProps} />);

    const container = screen.getByText('월').closest('.time-table-row');
    expect(container).toHaveStyle({
      display: 'contents',
    });
  });

  it('요일 헤더 컨테이너 스타일을 올바르게 적용한다', () => {
    render(<TimeTableRow {...defaultProps} />);

    const headerContainer = screen.getByText('월').parentElement;
    // TimeTableRow는 display: 'contents'를 사용하므로 실제 스타일은 자식 요소에 적용됨
    expect(headerContainer).toHaveStyle({
      display: 'contents',
    });
  });

  it('세션 컨테이너 스타일을 올바르게 적용한다', () => {
    render(<TimeTableRow {...defaultProps} />);

    const sessionContainer = screen.getByText('월').closest('.time-table-row')
      ?.children[1];
    expect(sessionContainer).toHaveStyle({
      position: 'relative',
      backgroundColor: 'var(--color-background)',
      minHeight: '120px',
      border: '1px solid var(--color-border-grid)',
      gridColumn: '2 / -1',
    });
  });

  it('빈 세션으로도 정상 렌더링된다', () => {
    const emptyProps = {
      ...defaultProps,
      sessions: new Map(),
    };

    render(<TimeTableRow {...emptyProps} />);

    // 요일 헤더는 여전히 표시되어야 함
    expect(screen.getByText('월')).toBeInTheDocument();

    // 세션은 없어야 함
    expect(screen.queryByTestId(/session-block-/)).not.toBeInTheDocument();
  });

  it('높이 prop을 올바르게 적용한다', () => {
    const customHeight = 200;
    render(<TimeTableRow {...defaultProps} height={customHeight} />);

    const sessionContainer = screen.getByText('월').closest('.time-table-row')
      ?.children[1];
    expect(sessionContainer).toHaveStyle({
      minHeight: `${customHeight}px`,
    });
  });

  it('여러 요일의 세션을 올바르게 렌더링한다', () => {
    // '영어' 세션의 weekday 속성을 1로 수정한 새로운 데이터를 만듭니다.
    const multiDaySessions = new Map<number, Session[]>([
      [0, [mockSessions.get(0)![0]]], // 월요일: 수학 세션 (weekday: 0)
      [
        1,
        [
          {
            ...mockSessions.get(0)![1], // 기존 영어 세션 데이터를 복사하고
            weekday: 1, // weekday를 1(화요일)로 덮어씁니다.
          },
        ],
      ],
    ]);

    const { rerender } = render(
      <TimeTableRow {...defaultProps} weekday={0} sessions={multiDaySessions} />
    );

    // 월요일 세션 확인
    expect(screen.getByText('수학 09:00-10:00')).toBeInTheDocument();

    // 화요일로 변경
    rerender(
      <TimeTableRow {...defaultProps} weekday={1} sessions={multiDaySessions} />
    );

    // 화요일 헤더 확인
    expect(screen.getByText('화')).toBeInTheDocument();

    // 화요일에 해당하는 세션이 렌더링되는지 확인 (영어 10:00-11:00)
    expect(screen.getByText('영어 10:00-11:00')).toBeInTheDocument();
  });

  it('시간별 세로 구분선을 올바르게 렌더링한다', () => {
    render(<TimeTableRow {...defaultProps} />);

    // 시간별 세로 구분선이 15개 있어야 함 (9:00 ~ 23:00)
    const timeBorders = screen.getAllByTestId(/^time-border-/);
    expect(timeBorders).toHaveLength(15);

    // 첫 번째 구분선 (9:00)의 위치와 스타일 확인
    const firstBorder = screen.getByTestId('time-border-0');
    expect(firstBorder).toBeInTheDocument();
    expect(firstBorder).toHaveStyle({
      position: 'absolute',
      left: '0px',
      width: '1px',
      backgroundColor: 'var(--color-border-grid)',
      opacity: '0.6',
      zIndex: '1',
    });

    // 마지막 구분선 (23:00)의 위치 확인
    const lastBorder = screen.getByTestId('time-border-14');
    expect(lastBorder).toBeInTheDocument();
    expect(lastBorder).toHaveStyle({
      left: '1680px', // 14 * 120px
    });
  });

  it('30분 구분선을 올바르게 렌더링한다', () => {
    render(<TimeTableRow {...defaultProps} />);

    // 30분 구분선이 30개 있어야 함 (9:00 ~ 23:00, 30분 단위)
    const halfHourBorders = screen.getAllByTestId(/^half-hour-border-/);
    expect(halfHourBorders).toHaveLength(30);

    // 9:30 구분선 확인
    const nineThirtyBorder = screen.getByTestId('half-hour-border-1');
    expect(nineThirtyBorder).toBeInTheDocument();
    expect(nineThirtyBorder).toHaveStyle({
      position: 'absolute',
      left: '60px', // 0 * 120 + 60
      width: '1px',
      backgroundColor: 'var(--color-border-grid-light)',
      opacity: '0.4',
      zIndex: '1',
    });

    // 10:00 구분선 확인 (시간별 구분선과 겹침)
    const tenOClockBorder = screen.getByTestId('half-hour-border-2');
    expect(tenOClockBorder).toBeInTheDocument();
    expect(tenOClockBorder).toHaveStyle({
      left: '120px', // 1 * 120 + 0
    });
  });

  it('구분선이 세션 컨테이너 내부에 올바르게 배치된다', () => {
    render(<TimeTableRow {...defaultProps} />);

    const sessionContainer = screen.getByText('월').closest('.time-table-row')
      ?.children[1] as HTMLElement;

    // 구분선들이 세션 컨테이너 내부에 있어야 함
    const timeBorders = sessionContainer.querySelectorAll(
      '[data-testid^="time-border-"]'
    );
    const halfHourBorders = sessionContainer.querySelectorAll(
      '[data-testid^="half-hour-border-"]'
    );

    expect(timeBorders.length).toBeGreaterThan(0);
    expect(halfHourBorders.length).toBeGreaterThan(0);

    // 구분선들이 세션 컨테이너의 자식 요소여야 함
    timeBorders.forEach(border => {
      expect(sessionContainer.contains(border)).toBe(true);
    });

    halfHourBorders.forEach(border => {
      expect(sessionContainer.contains(border)).toBe(true);
    });
  });

  it('구분선의 z-index가 올바르게 설정된다', () => {
    render(<TimeTableRow {...defaultProps} />);

    // 시간별 구분선의 z-index 확인
    const timeBorder = screen.getByTestId('time-border-0');
    expect(timeBorder).toHaveStyle({
      zIndex: '1',
    });

    // 30분 구분선의 z-index 확인
    const halfHourBorder = screen.getByTestId('half-hour-border-1');
    expect(halfHourBorder).toHaveStyle({
      zIndex: '1',
    });

    // 드롭존의 z-index가 더 높아야 함 (세션과 상호작용 가능)
    const dropZone = screen.getByTestId('drop-zone-0-09:00');
    expect(dropZone).toHaveStyle({
      zIndex: '5',
    });
  });
});
