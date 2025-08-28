import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Session, Subject } from '../../lib/planner';
import TimeTableGrid from '../TimeTableGrid';

// Mock TimeTableRow 컴포넌트
vi.mock('../molecules/TimeTableRow', () => ({
  default: ({
    weekday,
    height,
    sessions,
    onSessionClick,
    onDrop,
  }: {
    weekday: number;
    height: number;
    sessions: Map<number, Session[]>;
    onSessionClick: (session: Session) => void;
    onDrop: (weekday: number, time: string, enrollmentId: string) => void;
  }) => (
    <div data-testid={`time-table-row-${weekday}`}>
      <div>요일: {weekday}</div>
      <div>높이: {height}</div>
      <div>세션 수: {sessions.get(weekday)?.length || 0}</div>
      <button onClick={() => onSessionClick({ id: 'test-session' })}>
        세션 클릭
      </button>
      <button onClick={() => onDrop(weekday, '10:00', 'test-enrollment')}>
        드롭
      </button>
    </div>
  ),
}));

// Mock 데이터
const mockSubjects: Subject[] = [
  { id: 'subject-1', name: '수학', color: '#f59e0b' },
  { id: 'subject-2', name: '영어', color: '#3b82f6' },
  { id: 'subject-3', name: '국어', color: '#10b981' },
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
  [
    1,
    [
      {
        id: 'session-3',
        enrollmentId: 'enrollment-1',
        weekday: 1,
        startsAt: '11:00',
        endsAt: '12:00',
      },
    ],
  ],
]);

describe('TimeTableGrid', () => {
  const defaultProps = {
    sessions: mockSessions,
    subjects: mockSubjects,
    enrollments: mockEnrollments,
    onSessionClick: vi.fn(),
    onDrop: vi.fn(),
  };

  it('기본 props로 렌더링된다', () => {
    render(<TimeTableGrid {...defaultProps} />);
    expect(screen.getByTestId('time-table-grid')).toBeInTheDocument();
  });

  it('시간 헤더를 올바르게 렌더링한다', () => {
    render(<TimeTableGrid {...defaultProps} />);

    // 9:00부터 23:00까지 시간 헤더 확인
    expect(screen.getByText('09:00')).toBeInTheDocument();
    expect(screen.getByText('10:00')).toBeInTheDocument();
    expect(screen.getByText('11:00')).toBeInTheDocument();
    expect(screen.getByText('23:00')).toBeInTheDocument();
  });

  it('7일 요일 행을 렌더링한다', () => {
    render(<TimeTableGrid {...defaultProps} />);

    // 7일 요일 행 확인
    expect(screen.getByTestId('time-table-row-0')).toBeInTheDocument();
    expect(screen.getByTestId('time-table-row-1')).toBeInTheDocument();
    expect(screen.getByTestId('time-table-row-2')).toBeInTheDocument();
    expect(screen.getByTestId('time-table-row-3')).toBeInTheDocument();
    expect(screen.getByTestId('time-table-row-4')).toBeInTheDocument();
    expect(screen.getByTestId('time-table-row-5')).toBeInTheDocument();
    expect(screen.getByTestId('time-table-row-6')).toBeInTheDocument();
  });

  it('CSS Grid 레이아웃을 올바르게 적용한다', () => {
    render(<TimeTableGrid {...defaultProps} />);
    const grid = screen.getByTestId('time-table-grid');

    expect(grid).toHaveStyle({
      display: 'grid',
      gridTemplateColumns: '80px repeat(15, 120px)', // 80px + 15 * 120px
    });
  });

  it('시간 헤더의 스타일을 올바르게 적용한다', () => {
    render(<TimeTableGrid {...defaultProps} />);
    const timeHeader = screen.getByText('09:00');

    expect(timeHeader).toHaveStyle({
      backgroundColor: 'var(--color-background)',
      textAlign: 'center',
      fontSize: '12px',
      color: 'var(--color-text-secondary)',
      border: '1px solid var(--color-border)',
      height: '40px',
    });
  });

  it('세션 클릭 이벤트를 올바르게 처리한다', () => {
    const mockOnSessionClick = vi.fn();
    render(
      <TimeTableGrid {...defaultProps} onSessionClick={mockOnSessionClick} />
    );

    const sessionClickButton = screen.getAllByText('세션 클릭')[0];
    sessionClickButton.click();

    expect(mockOnSessionClick).toHaveBeenCalledWith({ id: 'test-session' });
  });

  it('드롭 이벤트를 올바르게 처리한다', () => {
    const mockOnDrop = vi.fn();
    render(<TimeTableGrid {...defaultProps} onDrop={mockOnDrop} />);

    const dropButton = screen.getAllByText('드롭')[0];
    dropButton.click();

    expect(mockOnDrop).toHaveBeenCalledWith(0, '10:00', 'test-enrollment');
  });

  it('요일별 세션 수를 올바르게 전달한다', () => {
    render(<TimeTableGrid {...defaultProps} />);

    // 월요일(0): 2개 세션
    const mondayRow = screen.getByTestId('time-table-row-0');
    expect(mondayRow).toHaveTextContent('세션 수: 2');

    // 화요일(1): 1개 세션
    const tuesdayRow = screen.getByTestId('time-table-row-1');
    expect(tuesdayRow).toHaveTextContent('세션 수: 1');
  });

  it('커스텀 className과 style을 적용한다', () => {
    const customProps = {
      ...defaultProps,
      className: 'custom-grid',
      style: { backgroundColor: 'red' },
    };

    render(<TimeTableGrid {...customProps} />);
    const grid = screen.getByTestId('time-table-grid');

    expect(grid).toHaveClass('time-table-grid', 'custom-grid');
    expect(grid).toHaveStyle({ backgroundColor: 'red' });
  });

  it('시간 범위가 9:00부터 23:00까지이다', () => {
    render(<TimeTableGrid {...defaultProps} />);

    // 시작 시간
    expect(screen.getByText('09:00')).toBeInTheDocument();

    // 끝 시간
    expect(screen.getByText('23:00')).toBeInTheDocument();

    // 총 15시간 (9:00 ~ 23:00)
    const timeHeaders = screen.getAllByText(/^\d{2}:\d{2}$/);
    expect(timeHeaders).toHaveLength(15);
  });

  it('좌상단 빈칸을 렌더링한다', () => {
    render(<TimeTableGrid {...defaultProps} />);
    const emptyCell = screen.getByTestId('time-table-grid').firstChild;

    expect(emptyCell).toHaveStyle({
      backgroundColor: 'var(--color-background)',
    });
  });

  it('경계선과 테두리를 올바르게 적용한다', () => {
    render(<TimeTableGrid {...defaultProps} />);
    const grid = screen.getByTestId('time-table-grid');

    expect(grid).toHaveStyle({
      border: '1px solid var(--color-border-grid)',
      borderRadius: '8px',
    });
  });
});
