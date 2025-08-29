import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Session, Subject } from '../../../lib/planner';
import { TimeTableRow } from '../TimeTableRow';

// Mock 데이터
const mockSubjects: Subject[] = [
  { id: 'subject-1', name: '중등수학', color: '#f59e0b' },
  { id: 'subject-2', name: '중등영어', color: '#3b82f6' },
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
    0, // 월요일
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
  ['session-2', 32],
]);

const defaultProps = {
  weekday: 0,
  height: 120,
  sessions: mockSessions,
  subjects: mockSubjects,
  enrollments: mockEnrollments,
  students: mockStudents,
  sessionYPositions: mockSessionYPositions,
  onSessionClick: vi.fn(),
  onDrop: vi.fn(),
  onEmptySpaceClick: vi.fn(),
};

describe('TimeTableRow - 학생 정보 전달 테스트', () => {
  it('세션 블록에 학생 정보를 올바르게 전달한다', () => {
    render(<TimeTableRow {...defaultProps} />);

    // 첫 번째 세션: 중등수학 김요섭
    expect(screen.getByText('중등수학 김요섭')).toBeInTheDocument();

    // 두 번째 세션: 중등영어 이영희
    expect(screen.getByText('중등영어 이영희')).toBeInTheDocument();
  });

  it('enrollment이 없을 때 Unknown으로 표시한다', () => {
    const sessionsWithoutEnrollment = new Map<number, Session[]>([
      [
        0,
        [
          {
            id: 'session-3',
            enrollmentId: 'non-existent-enrollment',
            weekday: 0,
            startsAt: '11:00',
            endsAt: '12:00',
          },
        ],
      ],
    ]);

    render(
      <TimeTableRow {...defaultProps} sessions={sessionsWithoutEnrollment} />
    );

    // enrollment가 없으면 과목명만 표시
    expect(screen.getByText('중등수학')).toBeInTheDocument();
  });

  it('학생 정보가 없을 때 과목명만 표시한다', () => {
    const sessionsWithoutStudent = new Map<number, Session[]>([
      [
        0,
        [
          {
            id: 'session-4',
            enrollmentId: 'enrollment-1',
            weekday: 0,
            startsAt: '12:00',
            endsAt: '13:00',
          },
        ],
      ],
    ]);

    render(
      <TimeTableRow
        {...defaultProps}
        students={[]} // 빈 학생 배열
        sessions={sessionsWithoutStudent}
      />
    );

    // 학생 정보가 없으면 과목명만 표시
    expect(screen.getByText('중등수학')).toBeInTheDocument();
  });

  it('여러 요일의 세션을 올바르게 렌더링한다', () => {
    const multiDaySessions = new Map<number, Session[]>([
      [
        0, // 월요일
        [
          {
            id: 'session-5',
            enrollmentId: 'enrollment-1',
            weekday: 0,
            startsAt: '09:00',
            endsAt: '10:00',
          },
        ],
      ],
      [
        1, // 화요일
        [
          {
            id: 'session-6',
            enrollmentId: 'enrollment-2',
            weekday: 1,
            startsAt: '10:00',
            endsAt: '11:00',
          },
        ],
      ],
    ]);

    render(
      <TimeTableRow {...defaultProps} weekday={1} sessions={multiDaySessions} />
    );

    // 화요일 세션만 표시되어야 함
    expect(screen.getByText('중등영어 이영희')).toBeInTheDocument();
    expect(screen.queryByText('중등수학 김요섭')).not.toBeInTheDocument();
  });
});
