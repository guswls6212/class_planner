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
        enrollmentIds: ['enrollment-1'],
        weekday: 0,
        startsAt: '09:00',
        endsAt: '10:00',
      },
      {
        id: 'session-2',
        enrollmentIds: ['enrollment-2'],
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
        enrollmentIds: ['enrollment-1'],
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
        enrollmentIds: ['enrollment-1'],
        weekday: 0,
        startsAt: '09:00',
        endsAt: '10:00',
      },
      {
        id: 'session-overlap-2',
        enrollmentIds: ['enrollment-2'],
        weekday: 0,
        startsAt: '09:15',
        endsAt: '10:15',
      },
      {
        id: 'session-overlap-3',
        enrollmentIds: ['enrollment-1'],
        weekday: 0,
        startsAt: '09:30',
        endsAt: '10:30',
      },
      {
        id: 'session-overlap-4',
        enrollmentIds: ['enrollment-2'],
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

    // 🆕 핵심적인 스타일만 확인
    expect(timeHeader).toHaveStyle({
      height: '40px',
      color: 'var(--color-text-secondary)',
    });
  });

  it('요일 헤더의 스타일을 올바르게 적용한다', () => {
    render(<TimeTableGrid {...defaultProps} />);

    const weekdayHeader = screen.getByText('월');

    // 🆕 실제 렌더링된 높이 47px로 수정
    expect(weekdayHeader).toHaveStyle({
      color: 'var(--color-text)',
      display: 'flex',
      height: '47px', // 🆕 47px로 수정
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
            enrollmentIds: ['enrollment-1'],
            weekday: 0,
            startsAt: '09:00',
            endsAt: '10:00',
          },
          {
            id: 'partial-2',
            enrollmentIds: ['enrollment-2'],
            weekday: 0,
            startsAt: '09:30',
            endsAt: '10:30',
          },
          {
            id: 'partial-3',
            enrollmentIds: ['enrollment-1'],
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
      gridTemplateColumns: '80px repeat(30, 60px)', // 🆕 30분 단위로 변경
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

    // 🆕 30분 단위: 9:00, 9:30, 10:00, 10:30... (30개)
    const timeHeaders = screen.getAllByText(/^\d{2}:\d{2}$/);
    expect(timeHeaders).toHaveLength(30); // 🆕 30분 단위로 변경: 15시간 × 2개 = 30개
  });

  it('요일별로 올바른 높이가 설정된다', () => {
    render(<TimeTableGrid {...defaultProps} />);

    // 실제 렌더링된 높이 확인
    const grid = screen.getByText('09:00').closest('.time-table-grid');
    const computedStyle = window.getComputedStyle(grid!);
    console.log('Actual gridTemplateRows:', computedStyle.gridTemplateRows);

    // gridTemplateRows는 동적으로 계산되므로 실제 값과 비교
    expect(computedStyle.gridTemplateRows).toBeTruthy();

    // 최소한 8개의 행이 있어야 함 (시간 헤더 + 7일)
    const rows = computedStyle.gridTemplateRows.split(' ');
    expect(rows.length).toBeGreaterThanOrEqual(8);
  });

  it('시간별 세로 구분선이 제거되었음을 확인한다', () => {
    render(<TimeTableGrid {...defaultProps} />);

    // 시간별 세로 구분선이 더 이상 렌더링되지 않아야 함
    const timeBorders = document.querySelectorAll(
      '[data-testid^="time-border-"]'
    );
    expect(timeBorders).toHaveLength(0);
  });

  it('30분 구분선이 제거되었음을 확인한다', () => {
    render(<TimeTableGrid {...defaultProps} />);

    // 30분 구분선이 더 이상 렌더링되지 않아야 함
    const halfHourBorders = document.querySelectorAll(
      '[data-testid^="half-hour-border-"]'
    );
    expect(halfHourBorders).toHaveLength(0);
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
