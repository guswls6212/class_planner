import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Session, Subject } from '../../lib/planner';
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
    weekday,
    time,
    onDrop,
  }: {
    weekday: number;
    time: string;
    onDrop: (weekday: number, time: string, enrollmentId: string) => void;
  }) => (
    <div
      data-testid={`drop-zone-${weekday}-${time}`}
      onClick={() => onDrop(weekday, time, 'test-enrollment')}
      style={{
        position: 'absolute',
        border: '1px dashed transparent',
        transition: 'border-color 0.2s',
        zIndex: 5,
        backgroundColor: 'transparent',
        width: '120px',
        height: '60px',
      }}
    >
      드롭존 {time}
    </div>
  ),
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

const mockGetSessionPosition = vi.fn((session: Session, weekday: number) => {
  const daySessions = mockSessions.get(weekday) || [];
  const index = daySessions.findIndex(s => s.id === session.id);
  return index >= 0 ? index : 0;
});

describe('TimeTableRow 렌더링 테스트', () => {
  const defaultProps = {
    weekday: 0,
    height: 120,
    sessions: mockSessions,
    subjects: mockSubjects,
    enrollments: mockEnrollments,
    getSessionPosition: mockGetSessionPosition,
    onSessionClick: vi.fn(),
    onDrop: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('요일 헤더를 올바르게 렌더링한다', () => {
    render(<TimeTableRow {...defaultProps} />);

    const weekdayHeader = screen.getByText('월');
    expect(weekdayHeader).toBeInTheDocument();
    expect(weekdayHeader).toHaveStyle({
      fontWeight: 'bold',
      fontSize: '14px',
      color: 'var(--color-text)',
      border: '1px solid var(--color-border)',
      height: '60px',
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
    expect(headerContainer).toHaveStyle({
      backgroundColor: 'var(--color-background)',
      padding: '12px 8px',
      textAlign: 'center',
      fontWeight: 'bold',
      fontSize: '14px',
      color: 'var(--color-text)',
      border: '1px solid var(--color-border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '60px',
    });
  });

  it('세션 컨테이너 스타일을 올바르게 적용한다', () => {
    render(<TimeTableRow {...defaultProps} />);

    const sessionContainer = screen.getByText('월').closest('.time-table-row')
      ?.children[1];
    expect(sessionContainer).toHaveStyle({
      position: 'relative',
      backgroundColor: 'var(--color-background)',
      minHeight: '60px',
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
    const multiDaySessions = new Map<number, Session[]>([
      [0, [mockSessions.get(0)![0]]], // 월요일: 1개 세션
      [1, [mockSessions.get(0)![1]]], // 화요일: 1개 세션
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

    // 화요일 세션 확인
    expect(screen.getByText('화')).toBeInTheDocument();
    expect(screen.getByText('영어 10:00-11:00')).toBeInTheDocument();
  });
});
