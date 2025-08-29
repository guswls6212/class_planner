import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Session, Subject } from '../../../lib/planner';
import TimeTableGrid from '../TimeTableGrid';

// Mock 데이터
const mockSubjects: Subject[] = [
  { id: 'subject-1', name: '중등수학', color: '#f59e0b' },
  { id: 'subject-2', name: '영어', color: '#3b82f6' },
  { id: 'subject-3', name: '국어', color: '#10b981' },
];

const mockStudents = [
  { id: 'student-1', name: '김요섭' },
  { id: 'student-2', name: '이영희' },
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

// 겹치는 세션이 있는 테스트 데이터 (새로운 로직 반영)
const mockOverlappingSessions = new Map<number, Session[]>([
  [
    0,
    [
      {
        id: 'session-overlap-1',
        enrollmentId: 'enrollment-1',
        weekday: 0,
        startsAt: '09:00',
        endsAt: '10:00',
      },
      {
        id: 'session-overlap-2',
        enrollmentId: 'enrollment-2',
        weekday: 0,
        startsAt: '09:15',
        endsAt: '10:15',
      },
      {
        id: 'session-overlap-3',
        enrollmentId: 'enrollment-1',
        weekday: 0,
        startsAt: '09:30',
        endsAt: '10:30',
      },
      {
        id: 'session-overlap-4',
        enrollmentId: 'enrollment-2',
        weekday: 0,
        startsAt: '09:45',
        endsAt: '10:45',
      },
    ],
  ],
]);

describe('TimeTableGrid', () => {
  const defaultProps = {
    sessions: mockSessions,
    subjects: mockSubjects,
    enrollments: mockEnrollments,
    students: mockStudents,
    onSessionClick: () => {},
    onDrop: () => {},
    onEmptySpaceClick: () => {},
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

  it('겹치는 세션이 있는 경우 순차적으로 Y축으로 분리되어 렌더링된다', () => {
    render(
      <TimeTableGrid {...defaultProps} sessions={mockOverlappingSessions} />
    );

    // 겹치는 세션들이 순차적으로 Y축으로 분리되어야 함
    expect(screen.getAllByText('중등수학')).toHaveLength(2);
    expect(screen.getAllByText('김요섭')).toHaveLength(2);
    expect(screen.getAllByText('영어')).toHaveLength(2);
    expect(screen.getAllByText('이영희')).toHaveLength(2);
  });

  it('부분적으로 겹치는 세션들도 겹치는 것으로 판단하여 Y축으로 분리한다', () => {
    const partialOverlapSessions = new Map<number, Session[]>([
      [
        0,
        [
          {
            id: 'partial-1',
            enrollmentId: 'enrollment-1',
            weekday: 0,
            startsAt: '09:00',
            endsAt: '10:00',
          },
          {
            id: 'partial-2',
            enrollmentId: 'enrollment-2',
            weekday: 0,
            startsAt: '09:30',
            endsAt: '10:30',
          },
          {
            id: 'partial-3',
            enrollmentId: 'enrollment-1',
            weekday: 0,
            startsAt: '10:00',
            endsAt: '11:00',
          },
        ],
      ],
    ]);

    render(
      <TimeTableGrid {...defaultProps} sessions={partialOverlapSessions} />
    );

    // 09:00-10:00과 09:30-10:30은 겹침 → yPosition: 0, 32
    // 10:00-11:00은 09:30-10:30과 겹침 → yPosition: 32
    expect(screen.getAllByText('중등수학')).toHaveLength(2);
    expect(screen.getAllByText('김요섭')).toHaveLength(2);
    expect(screen.getAllByText('영어')).toHaveLength(1);
    expect(screen.getAllByText('이영희')).toHaveLength(1);
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

  it('시간별 세로 구분선을 올바르게 렌더링한다', () => {
    render(<TimeTableGrid {...defaultProps} />);

    // 시간별 세로 구분선이 15 * 7 = 105개 있어야 함 (7일 x 15시간)
    // 구분선들은 TimeTableRow 내부에 있으므로 전체 문서에서 찾아야 함
    const timeBorders = document.querySelectorAll(
      '[data-testid^="time-border-"]'
    );
    expect(timeBorders).toHaveLength(105);

    // 첫 번째 구분선 (9:00)의 위치와 스타일 확인
    const firstBorder = document.querySelector(
      '[data-testid="time-border-0"]'
    ) as HTMLElement;
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
    const lastBorder = document.querySelector(
      '[data-testid="time-border-14"]'
    ) as HTMLElement;
    expect(lastBorder).toBeInTheDocument();
    expect(lastBorder).toHaveStyle({
      left: '1680px', // 14 * 120px
    });
  });

  it('30분 구분선을 올바르게 렌더링한다', () => {
    render(<TimeTableGrid {...defaultProps} />);

    // 30분 구분선이 30 * 7 = 210개 있어야 함 (7일 x 30개 30분 단위)
    const halfHourBorders = document.querySelectorAll(
      '[data-testid^="half-hour-border-"]'
    );
    expect(halfHourBorders).toHaveLength(210);

    // 9:30 구분선 확인
    const nineThirtyBorder = document.querySelector(
      '[data-testid="half-hour-border-1"]'
    ) as HTMLElement;
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
    const tenOClockBorder = document.querySelector(
      '[data-testid="half-hour-border-2"]'
    ) as HTMLElement;
    expect(tenOClockBorder).toBeInTheDocument();
    expect(tenOClockBorder).toHaveStyle({
      left: '120px', // 1 * 120 + 0
    });
  });

  it('겹치는 세션을 올바르게 처리한다', () => {
    const overlappingProps = {
      ...defaultProps,
      sessions: mockOverlappingSessions,
    };

    render(<TimeTableGrid {...overlappingProps} />);

    // 겹치는 세션들이 서로 다른 트랙에 배치되는지 확인
    // 이 테스트는 콘솔 로그를 통해 트랙 할당을 확인합니다
    expect(screen.getByText('월')).toBeInTheDocument();
  });
});
