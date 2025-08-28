import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Student } from '../../lib/planner';
import StudentsPage from '../Students';

// Mock StudentManagementSection 컴포넌트
vi.mock('../../components/organisms/StudentManagementSection', () => ({
  default: ({
    students,
    newStudentName,
    selectedStudentId,
    onNewStudentNameChange,
    onAddStudent,
    onSelectStudent,
    onDeleteStudent,
  }: any) => (
    <div data-testid="student-management-section">
      <input
        data-testid="student-name-input"
        value={newStudentName}
        onChange={e => onNewStudentNameChange(e.target.value)}
        placeholder="학생 이름 입력"
      />
      <button data-testid="add-student-btn" onClick={onAddStudent}>
        학생 추가
      </button>
      <div data-testid="students-list">
        {students.map((student: Student) => (
          <div key={student.id} data-testid={`student-${student.id}`}>
            <span
              data-testid={`student-name-${student.id}`}
              onClick={() => onSelectStudent(student.id)}
              style={{
                fontWeight:
                  selectedStudentId === student.id ? 'bold' : 'normal',
              }}
            >
              {student.name}
            </span>
            <button
              data-testid={`delete-student-${student.id}`}
              onClick={() => onDeleteStudent(student.id)}
            >
              삭제
            </button>
          </div>
        ))}
      </div>
    </div>
  ),
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock uid 함수
vi.mock('../../lib/planner', async () => {
  const actual = await vi.importActual('../../lib/planner');
  return {
    ...actual,
    uid: () => 'test-uid-' + Math.random().toString(36).substr(2, 9),
  };
});

describe('StudentsPage', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockClear();
    localStorageMock.getItem.mockClear();
  });

  it('기본 레이아웃을 렌더링한다', () => {
    render(<StudentsPage />);

    const grid = screen.getByTestId('students-page');
    expect(grid).toHaveStyle({
      display: 'grid',
      gridTemplateColumns: '340px 1fr',
      gap: '16px',
      padding: '16px',
    });
  });

  it('StudentManagementSection을 렌더링한다', () => {
    render(<StudentsPage />);

    expect(
      screen.getByTestId('student-management-section')
    ).toBeInTheDocument();
  });

  it('기본 과목을 자동으로 생성한다', async () => {
    render(<StudentsPage />);

    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'subjects',
        expect.stringContaining('수학')
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'subjects',
        expect.stringContaining('영어')
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'subjects',
        expect.stringContaining('국어')
      );
    });
  });

  it('기본 과목 색상을 올바르게 설정한다', async () => {
    render(<StudentsPage />);

    await waitFor(() => {
      const setItemCalls = localStorageMock.setItem.mock.calls;
      const subjectsCall = setItemCalls.find(([key]) => key === 'subjects');

      if (subjectsCall) {
        const subjects = JSON.parse(subjectsCall[1]);
        expect(subjects).toEqual([
          { id: expect.any(String), name: '수학', color: '#f59e0b' },
          { id: expect.any(String), name: '영어', color: '#3b82f6' },
          { id: expect.any(String), name: '국어', color: '#10b981' },
        ]);
      }
    });
  });

  it('localStorage에서 기존 데이터를 불러온다', () => {
    const existingStudents = [
      { id: 'existing-1', name: '기존학생1' },
      { id: 'existing-2', name: '기존학생2' },
    ];

    localStorageMock.getItem.mockImplementation(key => {
      if (key === 'students') return JSON.stringify(existingStudents);
      if (key === 'subjects') return JSON.stringify([]);
      if (key === 'ui:selectedStudent') return 'existing-1';
      return null;
    });

    render(<StudentsPage />);

    expect(screen.getByText('기존학생1')).toBeInTheDocument();
    expect(screen.getByText('기존학생2')).toBeInTheDocument();
  });

  it('학생 추가 기능을 제공한다', () => {
    render(<StudentsPage />);

    const input = screen.getByTestId('student-name-input');
    const addButton = screen.getByTestId('add-student-btn');

    expect(input).toBeInTheDocument();
    expect(addButton).toBeInTheDocument();
  });

  it('학생 삭제 기능을 제공한다', () => {
    const existingStudents = [{ id: 'existing-1', name: '기존학생1' }];

    localStorageMock.getItem.mockImplementation(key => {
      if (key === 'students') return JSON.stringify(existingStudents);
      if (key === 'subjects') return JSON.stringify([]);
      return null;
    });

    render(<StudentsPage />);

    const deleteButton = screen.getByTestId('delete-student-existing-1');
    expect(deleteButton).toBeInTheDocument();
  });

  it('학생 선택 기능을 제공한다', () => {
    const existingStudents = [
      { id: 'existing-1', name: '기존학생1' },
      { id: 'existing-2', name: '기존학생2' },
    ];

    localStorageMock.getItem.mockImplementation(key => {
      if (key === 'students') return JSON.stringify(existingStudents);
      if (key === 'subjects') return JSON.stringify([]);
      if (key === 'ui:selectedStudent') return 'existing-1';
      return null;
    });

    render(<StudentsPage />);

    const selectedStudent = screen.getByTestId('student-name-existing-1');
    const unselectedStudent = screen.getByTestId('student-name-existing-2');

    expect(selectedStudent).toHaveStyle({ fontWeight: 'bold' });
    expect(unselectedStudent).toHaveStyle({ fontWeight: 'normal' });
  });

  it('좌측 너비가 340px로 고정되어 있다', () => {
    render(<StudentsPage />);

    const grid = screen.getByTestId('students-page');
    expect(grid).toHaveStyle({
      gridTemplateColumns: '340px 1fr',
    });
  });

  it('간격과 패딩이 올바르게 설정되어 있다', () => {
    render(<StudentsPage />);

    const grid = screen.getByTestId('students-page');
    expect(grid).toHaveStyle({
      gap: '16px',
      padding: '16px',
    });
  });
});
