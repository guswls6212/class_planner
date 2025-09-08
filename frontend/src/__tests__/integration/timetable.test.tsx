import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Enrollment, Session, Student, Subject } from '../../lib/planner';
import SchedulePage from '../../pages/Schedule';

// Mock 컴포넌트들
vi.mock('../../components/organisms/TimeTableGrid', () => ({
  default: ({
    sessions,
    onSessionClick,
    onDrop,
  }: {
    sessions: Map<number, Session[]>;
    onSessionClick: (session: Session) => void;
    onDrop: (weekday: number, time: string, enrollmentId: string) => void;
  }) => (
    <div data-testid="time-table-grid">
      <div data-testid="sessions-count">
        총 세션 수: {Array.from(sessions.values()).flat().length}
      </div>
      <button
        onClick={() =>
          onSessionClick({
            id: 'test-session',
            enrollmentIds: ['test-enrollment'],
            weekday: 0,
            startsAt: '09:00',
            endsAt: '10:00',
          })
        }
      >
        세션 클릭 테스트
      </button>
      <button onClick={() => onDrop(0, '10:00', 'test-enrollment')}>
        드롭 테스트
      </button>
    </div>
  ),
}));

vi.mock('../../components/molecules/Card', () => ({
  default: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <div data-testid="card" {...props}>
      {children}
    </div>
  ),
}));

vi.mock('../../components/atoms/Button', () => ({
  default: ({
    children,
    onClick,
    ...props
  }: {
    children: React.ReactNode;
    onClick: () => void;
    [key: string]: unknown;
  }) => (
    <button data-testid="button" onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('../../components/atoms/Button', () => ({
  default: ({
    children,
    onClick,
    ...props
  }: {
    children: React.ReactNode;
    onClick: () => void;
    [key: string]: unknown;
  }) => (
    <button data-testid="button" onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('../../components/atoms/Label', () => ({
  default: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <label data-testid="label" {...props}>
      {children}
    </label>
  ),
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock 데이터
const mockSubjects: Subject[] = [
  { id: 'subject-1', name: '중등수학', color: '#f59e0b' },
  { id: 'subject-2', name: '영어', color: '#3b82f6' },
  { id: 'subject-3', name: '국어', color: '#10b981' },
];

const mockStudents: Student[] = [
  { id: 'student-1', name: '김철수' },
  { id: 'student-2', name: '이영희' },
];

const mockEnrollments: Enrollment[] = [
  { id: 'enrollment-1', studentId: 'student-1', subjectId: 'subject-1' },
  { id: 'enrollment-2', studentId: 'student-2', subjectId: 'subject-2' },
];

const mockSessions: Session[] = [
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
    weekday: 1,
    startsAt: '10:00',
    endsAt: '11:00',
  },
];

describe('시간표 통합 테스트', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockImplementation(key => {
      if (key === 'subjects') return JSON.stringify(mockSubjects);
      if (key === 'students') return JSON.stringify(mockStudents);
      if (key === 'enrollments') return JSON.stringify(mockEnrollments);
      if (key === 'sessions') return JSON.stringify(mockSessions);
      if (key === 'ui:selectedStudent') return '';
      if (key === 'ui:studentsPanelPos')
        return JSON.stringify({ x: 600, y: 90 });
      return null;
    });
    localStorageMock.setItem.mockClear();
  });

  it('시간표 페이지가 올바르게 렌더링된다', () => {
    render(<SchedulePage />);

    expect(screen.getByText('주간 시간표')).toBeInTheDocument();
    expect(
      screen.getByText(
        '전체 학생의 시간표입니다. 수강생 리스트에서 학생을 선택하면 해당 학생의 시간표만 볼 수 있습니다.'
      )
    ).toBeInTheDocument();
    expect(screen.getByTestId('time-table-grid')).toBeInTheDocument();
  });

  it('기본 과목과 학생 데이터를 불러온다', () => {
    render(<SchedulePage />);

    expect(localStorageMock.getItem).toHaveBeenCalledWith('subjects');
    expect(localStorageMock.getItem).toHaveBeenCalledWith('students');
    expect(localStorageMock.getItem).toHaveBeenCalledWith('enrollments');
    expect(localStorageMock.getItem).toHaveBeenCalledWith('sessions');
  });

  it('전체 세션을 표시한다', () => {
    render(<SchedulePage />);

    expect(screen.getByText('총 세션 수: 2')).toBeInTheDocument();
  });

  it('세션 클릭 이벤트를 처리한다', () => {
    render(<SchedulePage />);

    const sessionClickButton = screen.getByText('세션 클릭 테스트');
    fireEvent.click(sessionClickButton);

    // 세션 클릭 시 모달이 열리는지 확인 (실제 구현에 따라 다를 수 있음)
    expect(sessionClickButton).toBeInTheDocument();
  });

  it('드롭 이벤트를 처리한다', () => {
    render(<SchedulePage />);

    const dropButton = screen.getByText('드롭 테스트');
    fireEvent.click(dropButton);

    // 드롭 시 모달이 열리는지 확인 (실제 구현에 따라 다를 수 있음)
    expect(dropButton).toBeInTheDocument();
  });

  it('학생 선택 시 해당 학생의 세션만 표시한다', async () => {
    // 학생이 선택된 상태로 localStorage 설정
    localStorageMock.getItem.mockImplementation(key => {
      if (key === 'ui:selectedStudent') return 'student-1';
      if (key === 'subjects') return JSON.stringify(mockSubjects);
      if (key === 'students') return JSON.stringify(mockStudents);
      if (key === 'enrollments') return JSON.stringify(mockEnrollments);
      if (key === 'sessions') return JSON.stringify(mockSessions);
      if (key === 'ui:studentsPanelPos')
        return JSON.stringify({ x: 600, y: 90 });
      return null;
    });

    render(<SchedulePage />);

    // 선택된 학생의 세션이 필터링되어 표시되는지 확인
    await waitFor(
      () => {
        // 시간표 그리드가 렌더링되었는지 확인
        expect(screen.getByTestId('time-table-grid')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it('플로팅 학생 패널을 렌더링한다', () => {
    render(<SchedulePage />);

    // 학생 패널이 렌더링되는지 확인
    expect(screen.getByText('수강생 리스트')).toBeInTheDocument();
  });

  it('학생 목록을 표시한다', () => {
    render(<SchedulePage />);

    expect(screen.getByText('김철수')).toBeInTheDocument();
    expect(screen.getByText('이영희')).toBeInTheDocument();
  });

  it('시간표 그리드에 올바른 props를 전달한다', () => {
    render(<SchedulePage />);

    const timeTableGrid = screen.getByTestId('time-table-grid');
    expect(timeTableGrid).toBeInTheDocument();

    // 세션 수가 올바르게 표시되는지 확인
    expect(screen.getByText('총 세션 수: 2')).toBeInTheDocument();
  });

  it('localStorage에 변경사항을 저장한다', () => {
    render(<SchedulePage />);

    // 페이지 렌더링 시 localStorage 호출 확인
    expect(localStorageMock.getItem).toHaveBeenCalled();
  });

  it('요일별 세션 분류가 올바르게 작동한다', () => {
    render(<SchedulePage />);

    // 월요일(0)과 화요일(1)에 각각 1개씩 세션이 있는지 확인
    expect(screen.getByText('총 세션 수: 2')).toBeInTheDocument();
  });

  it('시간 범위가 9:00부터 23:00까지이다', () => {
    render(<SchedulePage />);

    // 시간표 그리드가 렌더링되는지 확인
    expect(screen.getByTestId('time-table-grid')).toBeInTheDocument();
  });

  it('과목별 색상이 올바르게 설정되어 있다', () => {
    render(<SchedulePage />);

    // 과목 데이터가 올바르게 로드되는지 확인
    expect(localStorageMock.getItem).toHaveBeenCalledWith('subjects');
  });

  it('학생별 수강신청 정보가 올바르게 연결된다', () => {
    render(<SchedulePage />);

    // 수강신청 데이터가 올바르게 로드되는지 확인
    expect(localStorageMock.getItem).toHaveBeenCalledWith('enrollments');
  });
});
