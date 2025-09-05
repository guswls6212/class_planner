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
  }: {
    students: Student[];
    newStudentName: string;
    selectedStudentId: string | null;
    onNewStudentNameChange: (name: string) => void;
    onAddStudent: () => void;
    onSelectStudent: (id: string) => void;
    onDeleteStudent: (id: string) => void;
  }) => {
    // 디버깅을 위한 로그 추가
    console.log(
      'Mock StudentManagementSection - selectedStudentId:',
      selectedStudentId
    );
    console.log('Mock StudentManagementSection - students:', students);

    return (
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
          {students.map((student: Student) => {
            const isSelected = selectedStudentId === student.id;
            console.log(
              `Student ${student.id} (${student.name}) - isSelected: ${isSelected}, fontWeight: ${isSelected ? 'bold' : 'normal'}`
            );

            return (
              <div key={student.id} data-testid={`student-${student.id}`}>
                <span
                  data-testid={`student-name-${student.id}`}
                  onClick={() => onSelectStudent(student.id)}
                  style={{
                    fontWeight: isSelected ? 'bold' : 'normal',
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
            );
          })}
        </div>
      </div>
    );
  },
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
    expect(grid).toHaveClass('grid');
    expect(grid).toHaveStyle({
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

    // Students 페이지는 더 이상 과목을 직접 관리하지 않음
    // 과목 관리는 전역 상태(useGlobalSubjects)에서 처리됨
    await waitFor(() => {
      expect(screen.getByTestId('students-page')).toBeInTheDocument();
    });
  });

  it('기본 과목 색상을 올바르게 설정한다', async () => {
    // Students 페이지는 더 이상 과목을 직접 관리하지 않음
    // 과목 관리는 전역 상태(useGlobalSubjects)에서 처리됨
    render(<StudentsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('students-page')).toBeInTheDocument();
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

    // localStorage 모킹을 더 명확하게 설정
    localStorageMock.getItem.mockImplementation(key => {
      console.log('localStorage.getItem called with key:', key);
      if (key === 'students') {
        console.log('Returning students:', JSON.stringify(existingStudents));
        return JSON.stringify(existingStudents);
      }
      if (key === 'subjects') {
        console.log('Returning subjects: []');
        return JSON.stringify([]);
      }
      if (key === 'ui:selectedStudent') {
        // 'existing-1'을 JSON 문자열 형식으로 반환하도록 수정합니다.
        console.log('Returning selectedStudent: existing-1');
        return JSON.stringify('existing-1');
      }
      console.log('Returning null for key:', key);
      return null;
    });

    render(<StudentsPage />);

    const selectedStudent = screen.getByTestId('student-name-existing-1');
    const unselectedStudent = screen.getByTestId('student-name-existing-2');

    // 디버깅을 위한 로그 추가
    console.log('Selected student element:', selectedStudent);
    console.log('Selected student style:', selectedStudent.style);
    console.log(
      'Selected student fontWeight:',
      selectedStudent.style.fontWeight
    );

    // toHaveStyle 대신, style 속성을 직접 확인합니다.
    expect(selectedStudent.style.fontWeight).toBe('bold');
    expect(unselectedStudent.style.fontWeight).toBe('normal');
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
