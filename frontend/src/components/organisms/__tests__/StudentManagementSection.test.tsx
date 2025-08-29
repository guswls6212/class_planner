import { render, screen, fireEvent } from '@testing-library/react';
import StudentManagementSection from '../StudentManagementSection';

// Mock useLocal hook
vi.mock('../../../hooks/useLocal', () => ({
  useLocal: vi.fn(() => [
    [
      { id: '1', name: '김요섭' },
      { id: '2', name: '이현진' },
    ],
    vi.fn(),
  ]),
}));

// Mock useLocal for subjects
vi.mock('../../../hooks/useLocal', () => ({
  useLocal: vi.fn(key => {
    if (key === 'students') {
      return [
        [
          { id: '1', name: '김요섭' },
          { id: '2', name: '이현진' },
        ],
        vi.fn(),
      ];
    }
    if (key === 'subjects') {
      return [
        [
          { id: '1', name: '중등수학', color: '#f59e0b' },
          { id: '2', name: '중등영어', color: '#3b82f6' },
        ],
        vi.fn(),
      ];
    }
    if (key === 'selectedStudentId') {
      return ['', vi.fn()];
    }
    return [[], vi.fn()];
  }),
}));

describe('StudentManagementSection', () => {
  const defaultProps = {
    students: [
      { id: '1', name: '김요섭' },
      { id: '2', name: '이현진' },
    ],
    subjects: [
      { id: '1', name: '중등수학', color: '#f59e0b' },
      { id: '2', name: '중등영어', color: '#3b82f6' },
    ],
    newStudentName: '',
    selectedStudentId: '',
    onNewStudentNameChange: vi.fn(),
    onAddStudent: vi.fn(),
    onSelectStudent: vi.fn(),
    onDeleteStudent: vi.fn(),
  };

  test('기본 렌더링이 올바르게 된다', () => {
    render(<StudentManagementSection {...defaultProps} />);

    expect(screen.getByText('학생 목록')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('학생 이름')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '추가' })).toBeInTheDocument();
  });

  test('학생 목록이 올바르게 표시된다', () => {
    render(<StudentManagementSection {...defaultProps} />);

    expect(screen.getByText('김요섭')).toBeInTheDocument();
    expect(screen.getByText('이현진')).toBeInTheDocument();
  });

  test('새 학생 추가 입력창이 올바르게 작동한다', () => {
    const mockOnChange = vi.fn();
    render(
      <StudentManagementSection
        {...defaultProps}
        onNewStudentNameChange={mockOnChange}
      />
    );

    const input = screen.getByPlaceholderText('학생 이름');
    fireEvent.change(input, { target: { value: '새로운 학생' } });

    expect(mockOnChange).toHaveBeenCalledWith('새로운 학생');
  });

  test('추가 버튼 클릭 시 onAddStudent가 호출된다', () => {
    const mockOnAdd = vi.fn();
    render(
      <StudentManagementSection {...defaultProps} onAddStudent={mockOnAdd} />
    );

    const addButton = screen.getByRole('button', { name: '추가' });
    fireEvent.click(addButton);

    expect(mockOnAdd).toHaveBeenCalled();
  });

  test('학생 삭제 버튼이 올바르게 표시된다', () => {
    render(<StudentManagementSection {...defaultProps} />);

    const deleteButtons = screen.getAllByRole('button', { name: /삭제/i });
    expect(deleteButtons).toHaveLength(2);
  });

  test('학생 삭제 버튼 클릭 시 onDeleteStudent가 호출된다', () => {
    const mockOnDelete = vi.fn();
    render(
      <StudentManagementSection
        {...defaultProps}
        onDeleteStudent={mockOnDelete}
      />
    );

    const deleteButtons = screen.getAllByRole('button', { name: /삭제/i });
    fireEvent.click(deleteButtons[0]);

    expect(mockOnDelete).toHaveBeenCalledWith('1');
  });

  test('선택된 학생이 올바르게 표시된다', () => {
    render(
      <StudentManagementSection {...defaultProps} selectedStudentId="1" />
    );

    const selectedStudent = screen.getByText('김요섭').closest('div');
    expect(selectedStudent).toHaveClass('selected');
  });

  test('학생 클릭 시 onSelectStudent가 호출된다', () => {
    const mockOnSelect = vi.fn();
    render(
      <StudentManagementSection
        {...defaultProps}
        onSelectStudent={mockOnSelect}
      />
    );

    const studentItem = screen.getByText('김요섭');
    fireEvent.click(studentItem);

    expect(mockOnSelect).toHaveBeenCalledWith('1');
  });
});
