import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import type { Enrollment, Subject } from '../../../lib/planner';
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
  { id: '4', name: '고등수학', color: '#ef4444' },
  { id: '5', name: '고등영어', color: '#8b5cf6' },
  { id: '6', name: '중등사회', color: '#06b6d4' },
];

const mockStudents = [{ id: '1', name: '김요섭' }];

const mockEnrollments: Enrollment[] = [
  { id: '1', studentId: '1', subjectId: '1' },
  { id: '2', studentId: '1', subjectId: '2' },
  { id: '3', studentId: '1', subjectId: '3' },
  { id: '4', studentId: '1', subjectId: '4' },
  { id: '5', studentId: '1', subjectId: '5' },
  { id: '6', studentId: '1', subjectId: '6' },
];

describe('TimeTableGrid 겹침 판단 및 Y축 배치 로직', () => {
  test('겹치는 세션들이 순차적으로 Y축으로 분리되어 배치되어야 함', () => {
    const mockSessions = new Map([
      [
        0, // 월요일
        [
          {
            id: '1',
            enrollmentIds: ['1'],
            weekday: 0,
            startsAt: '09:00',
            endsAt: '10:00',
          },
          {
            id: '2',
            enrollmentIds: ['2'],
            weekday: 0,
            startsAt: '09:15',
            endsAt: '10:15',
          },
          {
            id: '3',
            enrollmentIds: ['3'],
            weekday: 0,
            startsAt: '09:30',
            endsAt: '10:30',
          },
          {
            id: '4',
            enrollmentIds: ['4'],
            weekday: 0,
            startsAt: '09:45',
            endsAt: '10:45',
          },
          {
            id: '5',
            enrollmentIds: ['5'],
            weekday: 0,
            startsAt: '10:00',
            endsAt: '11:00',
          },
          {
            id: '6',
            enrollmentIds: ['6'],
            weekday: 0,
            startsAt: '10:15',
            endsAt: '11:15',
          },
        ],
      ],
    ]);

    render(
      <TimeTableGrid
        sessions={mockSessions}
        subjects={mockSubjects}
        enrollments={mockEnrollments}
        students={mockStudents}
        onSessionClick={vi.fn()}
        onDrop={vi.fn()}
        onEmptySpaceClick={vi.fn()}
      />,
    );

    // 월요일 세션들이 순차적으로 배치되어야 함
    expect(screen.getByText('중등수학')).toBeInTheDocument();
    expect(screen.getByText('중등영어')).toBeInTheDocument();
    expect(screen.getByText('중등국어')).toBeInTheDocument();
    expect(screen.getByText('고등수학')).toBeInTheDocument();
    expect(screen.getByText('고등영어')).toBeInTheDocument();
    expect(screen.getByText('중등사회')).toBeInTheDocument();

    // 학생 이름은 6개 세션 모두에 표시되어야 함
    expect(screen.getAllByText('김요섭')).toHaveLength(6);
  });

  test('겹치지 않는 세션들은 같은 Y축 위치에 배치되어야 함', () => {
    const nonOverlappingSessions = new Map([
      [
        1, // 화요일
        [
          {
            id: '7',
            enrollmentIds: ['1'],
            weekday: 1,
            startsAt: '09:00',
            endsAt: '10:00',
          },
          {
            id: '8',
            enrollmentIds: ['2'],
            weekday: 1,
            startsAt: '11:00',
            endsAt: '12:00',
          },
        ],
      ],
    ]);

    render(
      <TimeTableGrid
        sessions={nonOverlappingSessions}
        subjects={mockSubjects}
        enrollments={mockEnrollments}
        students={mockStudents}
        onSessionClick={vi.fn()}
        onDrop={vi.fn()}
        onEmptySpaceClick={vi.fn()}
      />,
    );

    // 겹치지 않는 세션들은 모두 yPosition: 0에 배치되어야 함
    expect(screen.getByText('중등수학')).toBeInTheDocument();
    expect(screen.getByText('중등영어')).toBeInTheDocument();
  });

  test('부분적으로 겹치는 세션들도 겹치는 것으로 판단해야 함', () => {
    const partialOverlapSessions = new Map([
      [
        0, // 월요일
        [
          {
            id: '9',
            enrollmentIds: ['1'],
            weekday: 0,
            startsAt: '09:00',
            endsAt: '10:00',
          },
          {
            id: '10',
            enrollmentIds: ['2'],
            weekday: 0,
            startsAt: '09:30',
            endsAt: '10:30',
          },
          {
            id: '11',
            enrollmentIds: ['3'],
            weekday: 0,
            startsAt: '10:00',
            endsAt: '11:00',
          },
        ],
      ],
    ]);

    render(
      <TimeTableGrid
        sessions={partialOverlapSessions}
        subjects={mockSubjects}
        enrollments={mockEnrollments}
        students={mockStudents}
        onSessionClick={vi.fn()}
        onDrop={vi.fn()}
        onEmptySpaceClick={vi.fn()}
      />,
    );

    // 09:00-10:00과 09:30-10:30은 겹침 → yPosition: 0, 32
    // 10:00-11:00은 09:30-10:30과 겹침 → yPosition: 32
    expect(screen.getByText('중등수학')).toBeInTheDocument();
    expect(screen.getByText('중등영어')).toBeInTheDocument();
    expect(screen.getByText('중등국어')).toBeInTheDocument();
  });
});
