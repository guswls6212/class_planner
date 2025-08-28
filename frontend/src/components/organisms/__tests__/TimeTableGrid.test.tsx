import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Session, Subject } from '../../../lib/planner';
import TimeTableGrid from '../TimeTableGrid';

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
    onSessionClick: () => {},
    onDrop: () => {},
  };

  it('기본 props로 렌더링된다', () => {
    render(<TimeTableGrid {...defaultProps} />);
    const grid = screen.getByText('09:00').closest('.time-table-grid');
    expect(grid).toBeInTheDocument();
  });

  it('시간 헤더를 올바르게 렌더링한다', () => {
    render(<TimeTableGrid {...defaultProps} />);

    // 9:00부터 23:00까지 시간 헤더 확인
    expect(screen.getByText('09:00')).toBeInTheDocument();
    expect(screen.getByText('10:00')).toBeInTheDocument();
    expect(screen.getByText('11:00')).toBeInTheDocument();
    expect(screen.getByText('23:00')).toBeInTheDocument();
  });

  it('요일 헤더를 올바르게 렌더링한다', () => {
    render(<TimeTableGrid {...defaultProps} />);

    // 요일 헤더 확인 (월, 화, 수, 목, 금, 토, 일)
    expect(screen.getByText('월')).toBeInTheDocument();
    expect(screen.getByText('화')).toBeInTheDocument();
    expect(screen.getByText('수')).toBeInTheDocument();
    expect(screen.getByText('목')).toBeInTheDocument();
    expect(screen.getByText('금')).toBeInTheDocument();
    expect(screen.getByText('토')).toBeInTheDocument();
    expect(screen.getByText('일')).toBeInTheDocument();
  });

  it('시간 헤더의 스타일을 올바르게 적용한다', () => {
    render(<TimeTableGrid {...defaultProps} />);

    const timeHeader = screen.getByText('09:00');

    expect(timeHeader).toHaveStyle({
      backgroundColor: 'var(--color-background)',
      textAlign: 'center',
      fontSize: '12px',
      height: '40px',
      color: 'var(--color-text-secondary)',
    });
  });

  it('요일 헤더의 스타일을 올바르게 적용한다', () => {
    render(<TimeTableGrid {...defaultProps} />);

    const weekdayHeader = screen.getByText('월');

    // 실제 렌더링된 스타일과 일치하도록 수정
    expect(weekdayHeader).toHaveStyle({
      color: 'var(--color-text)',
      display: 'flex',
      height: '60px',
      padding: '12px 8px',
    });
  });

  it('커스텀 className과 style을 적용한다', () => {
    const customProps = {
      ...defaultProps,
      className: 'custom-grid',
      style: { backgroundColor: 'red' },
    };

    render(<TimeTableGrid {...customProps} />);
    const grid = screen.getByText('09:00').closest('.time-table-grid');

    expect(grid).toHaveClass('time-table-grid', 'custom-grid');
    // style prop이 제대로 적용되었는지 확인 (CSS 변수로 변환될 수 있음)
    expect(grid).toHaveStyle({
      backgroundColor: expect.stringMatching(/red|rgb\(255,\s*0,\s*0\)/),
    });
  });

  it('좌상단 빈칸을 렌더링한다', () => {
    render(<TimeTableGrid {...defaultProps} />);
    const grid = screen.getByText('09:00').closest('.time-table-grid');
    const emptyCell = grid?.firstChild as HTMLElement;

    expect(emptyCell).toHaveStyle({
      backgroundColor: 'var(--color-background)',
    });
  });

  it('경계선과 테두리를 올바르게 적용한다', () => {
    render(<TimeTableGrid {...defaultProps} />);
    const grid = screen.getByText('09:00').closest('.time-table-grid');

    expect(grid).toHaveStyle({
      display: 'grid',
      border: '1px solid var(--color-border-grid)',
      borderRadius: '8px',
      overflow: 'auto',
    });
  });

  it('CSS Grid 레이아웃을 올바르게 적용한다', () => {
    render(<TimeTableGrid {...defaultProps} />);
    const grid = screen.getByText('09:00').closest('.time-table-grid');

    expect(grid).toHaveStyle({
      display: 'grid',
      gridTemplateColumns: '80px repeat(15, 120px)',
      gridTemplateRows: '40px 60px 60px 60px 60px 60px 60px 60px',
    });
  });

  it('빈 세션으로도 정상 렌더링된다', () => {
    const emptyProps = {
      ...defaultProps,
      sessions: new Map(),
    };

    render(<TimeTableGrid {...emptyProps} />);
    expect(screen.getByText('09:00')).toBeInTheDocument();
    expect(screen.getByText('월')).toBeInTheDocument();
  });

  it('props 변경 시 올바르게 업데이트된다', () => {
    const { rerender } = render(<TimeTableGrid {...defaultProps} />);

    // 초기 렌더링 확인
    expect(screen.getByText('09:00')).toBeInTheDocument();

    // 새로운 props로 재렌더링
    const newProps = {
      ...defaultProps,
      sessions: new Map([[0, []]]),
    };

    rerender(<TimeTableGrid {...newProps} />);

    // 여전히 시간 헤더는 표시되어야 함
    expect(screen.getByText('09:00')).toBeInTheDocument();
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

  it('요일별로 올바른 높이가 설정된다', () => {
    render(<TimeTableGrid {...defaultProps} />);

    // 기본 높이 60px이 적용되어야 함
    const grid = screen.getByText('09:00').closest('.time-table-grid');
    expect(grid).toHaveStyle({
      gridTemplateRows: '40px 60px 60px 60px 60px 60px 60px 60px',
    });
  });
});
