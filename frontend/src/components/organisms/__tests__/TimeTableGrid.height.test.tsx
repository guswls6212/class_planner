import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { Enrollment, Subject } from '../../../lib/planner';
import TimeTableGrid from '../TimeTableGrid';

// localStorage 모킹
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// 테스트용 데이터
const mockSubjects: Subject[] = [
  { id: '1', name: '중등수학', color: '#f59e0b' },
  { id: '2', name: '중등영어', color: '#3b82f6' },
  { id: '3', name: '중등국어', color: '#10b981' },
];

const mockStudents = [{ id: '1', name: '김요섭' }];

const mockEnrollments: Enrollment[] = [
  { id: '1', studentId: '1', subjectId: '1' },
  { id: '2', studentId: '1', subjectId: '2' },
  { id: '3', studentId: '1', subjectId: '3' },
];

describe('TimeTableGrid 동적 높이 계산', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockReturnValue(JSON.stringify(mockSubjects));
  });

  test('세션이 없는 요일은 기본 높이(60px)를 가져야 함', () => {
    const emptySessions = new Map();

    render(
      <TimeTableGrid
        sessions={emptySessions}
        subjects={mockSubjects}
        enrollments={mockEnrollments}
        students={mockStudents}
        onSessionClick={vi.fn()}
        onDrop={vi.fn()}
        onEmptySpaceClick={vi.fn()}
      />
    );

    // 모든 요일이 기본 높이를 가져야 함
    const grid = screen.getByText('09:00').closest('.time-table-grid');
    expect(grid).toHaveStyle(
      'grid-template-rows: 40px 60px 60px 60px 60px 60px 60px 60px'
    );
  });

  test('겹치는 세션이 많은 요일은 더 큰 높이를 가져야 함', () => {
    const overlappingSessions = new Map([
      [
        0, // 월요일 - 6개 세션이 겹침
        [
          {
            id: '1',
            enrollmentId: '1',
            weekday: 0,
            startsAt: '09:00',
            endsAt: '10:00',
          },
          {
            id: '2',
            enrollmentId: '2',
            weekday: 0,
            startsAt: '09:15',
            endsAt: '10:15',
          },
          {
            id: '3',
            enrollmentId: '3',
            weekday: 0,
            startsAt: '09:30',
            endsAt: '10:30',
          },
          {
            id: '4',
            enrollmentId: '1',
            weekday: 0,
            startsAt: '09:45',
            endsAt: '10:45',
          },
          {
            id: '5',
            enrollmentId: '2',
            weekday: 0,
            startsAt: '10:00',
            endsAt: '11:00',
          },
          {
            id: '6',
            enrollmentId: '3',
            weekday: 0,
            startsAt: '10:15',
            endsAt: '11:15',
          },
        ],
      ],
      [
        1, // 화요일 - 2개 세션만 겹침
        [
          {
            id: '7',
            enrollmentId: '1',
            weekday: 1,
            startsAt: '09:00',
            endsAt: '10:00',
          },
          {
            id: '8',
            enrollmentId: '2',
            weekday: 1,
            startsAt: '09:30',
            endsAt: '10:30',
          },
        ],
      ],
    ]);

    render(
      <TimeTableGrid
        sessions={overlappingSessions}
        subjects={mockSubjects}
        enrollments={mockEnrollments}
        students={mockStudents}
        onSessionClick={vi.fn()}
        onDrop={vi.fn()}
        onEmptySpaceClick={vi.fn()}
      />
    );

    // 월요일은 더 큰 높이를 가져야 함 (max yPosition: 160 + 32 + 28 = 220)
    // 화요일은 작은 높이를 가져야 함 (max yPosition: 32 + 32 + 28 = 92)
    const grid = screen.getByText('09:00').closest('.time-table-grid');
    expect(grid).toHaveStyle(
      'grid-template-rows: 40px 220px 92px 60px 60px 60px 60px 60px'
    );
  });

  test('세션의 최대 yPosition을 정확히 반영한 높이를 계산해야 함', () => {
    const complexSessions = new Map([
      [
        0, // 월요일
        [
          {
            id: '1',
            enrollmentId: '1',
            weekday: 0,
            startsAt: '09:00',
            endsAt: '10:00',
          },
          {
            id: '2',
            enrollmentId: '2',
            weekday: 0,
            startsAt: '09:15',
            endsAt: '10:15',
          },
          {
            id: '3',
            enrollmentId: '3',
            weekday: 0,
            startsAt: '09:30',
            endsAt: '10:30',
          },
          {
            id: '4',
            enrollmentId: '1',
            weekday: 0,
            startsAt: '09:45',
            endsAt: '10:45',
          },
          {
            id: '5',
            enrollmentId: '2',
            weekday: 0,
            startsAt: '10:00',
            endsAt: '11:00',
          },
          {
            id: '6',
            enrollmentId: '3',
            weekday: 0,
            startsAt: '10:15',
            endsAt: '11:15',
          },
          {
            id: '7',
            enrollmentId: '1',
            weekday: 0,
            startsAt: '10:30',
            endsAt: '11:30',
          },
        ],
      ],
    ]);

    render(
      <TimeTableGrid
        sessions={complexSessions}
        subjects={mockSubjects}
        enrollments={mockEnrollments}
        students={mockStudents}
        onSessionClick={vi.fn()}
        onDrop={vi.fn()}
        onEmptySpaceClick={vi.fn()}
      />
    );

    // 7개 세션이 순차적으로 겹침: yPosition 0, 32, 64, 96, 128, 160, 192
    // 최대 yPosition: 192 + 32 + 28 = 252
    const grid = screen.getByText('09:00').closest('.time-table-grid');
    expect(grid).toHaveStyle(
      'grid-template-rows: 40px 252px 60px 60px 60px 60px 60px 60px'
    );
  });
});
