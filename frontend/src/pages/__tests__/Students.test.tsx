import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import StudentsPage from '../Students';

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock uid function
vi.mock('../lib/planner', () => ({
  uid: vi.fn(() => 'mock-uuid-123'),
}));

// Mock alert
global.alert = vi.fn();

describe('StudentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  it('기본적으로 렌더링된다', () => {
    render(<StudentsPage />);
    expect(screen.getByText('학생 목록')).toBeInTheDocument();
  });

  it('학생 이름 입력 필드를 표시한다', () => {
    render(<StudentsPage />);
    const input = screen.getByPlaceholderText('학생 이름');
    expect(input).toBeInTheDocument();
    expect(input.tagName).toBe('INPUT');
  });

  it('학생 추가 버튼을 표시한다', () => {
    render(<StudentsPage />);
    expect(screen.getByText('추가')).toBeInTheDocument();
  });

  it('학생이 없을 때 안내 메시지를 표시한다', () => {
    render(<StudentsPage />);
    expect(screen.getByText('학생을 추가해주세요')).toBeInTheDocument();
  });

  it('기본 스타일이 올바르게 적용된다', () => {
    render(<StudentsPage />);
    const container = screen.getByText('학생 목록').closest('div');
    expect(container).toHaveClass('grid');
  });

  it('학생 이름을 입력할 수 있다', () => {
    render(<StudentsPage />);
    const input = screen.getByPlaceholderText('학생 이름');
    fireEvent.change(input, { target: { value: '김철수' } });
    expect(input).toHaveValue('김철수');
  });

  it('Enter 키로 학생을 추가할 수 있다', () => {
    render(<StudentsPage />);
    const input = screen.getByPlaceholderText('학생 이름');
    fireEvent.change(input, { target: { value: '김철수' } });
    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter' });
    expect(mockLocalStorage.setItem).toHaveBeenCalled();
  });

  it('추가 버튼으로 학생을 추가할 수 있다', () => {
    render(<StudentsPage />);
    const input = screen.getByPlaceholderText('학생 이름');
    const addButton = screen.getByText('추가');

    fireEvent.change(input, { target: { value: '김철수' } });
    fireEvent.click(addButton);

    expect(mockLocalStorage.setItem).toHaveBeenCalled();
  });

  it('빈 이름으로는 학생을 추가할 수 없다', () => {
    render(<StudentsPage />);
    const addButton = screen.getByText('추가');

    fireEvent.click(addButton);

    // 빈 이름으로는 새로운 학생이 추가되지 않아야 함
    const studentCalls = mockLocalStorage.setItem.mock.calls.filter(
      call => call[0] === 'students' && call[1] !== '[]'
    );
    expect(studentCalls.length).toBe(0);
  });

  it('공백만 있는 이름으로는 학생을 추가할 수 없다', () => {
    render(<StudentsPage />);
    const input = screen.getByPlaceholderText('학생 이름');
    const addButton = screen.getByText('추가');

    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.click(addButton);

    // 공백만 있는 이름으로는 새로운 학생이 추가되지 않아야 함
    const studentCalls = mockLocalStorage.setItem.mock.calls.filter(
      call => call[0] === 'students' && call[1] !== '[]'
    );
    expect(studentCalls.length).toBe(0);
  });

  it('학생 추가 후 입력 필드가 초기화된다', () => {
    render(<StudentsPage />);
    const input = screen.getByPlaceholderText('학생 이름');
    const addButton = screen.getByText('추가');

    fireEvent.change(input, { target: { value: '김철수' } });
    fireEvent.click(addButton);

    expect(input).toHaveValue('');
  });

  it('localStorage에서 학생 데이터를 불러온다', () => {
    const mockStudents = [
      { id: '1', name: '김철수' },
      { id: '2', name: '이영희' },
    ];

    mockLocalStorage.getItem
      .mockReturnValueOnce(JSON.stringify(mockStudents))
      .mockReturnValueOnce(null)
      .mockReturnValueOnce('');

    render(<StudentsPage />);
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith('students');
  });

  it('학생이 있을 때 학생 목록을 표시한다', () => {
    const mockStudents = [
      { id: '1', name: '김철수' },
      { id: '2', name: '이영희' },
    ];

    mockLocalStorage.getItem
      .mockReturnValueOnce(JSON.stringify(mockStudents))
      .mockReturnValueOnce(null)
      .mockReturnValueOnce('');

    render(<StudentsPage />);
    expect(screen.getByText('김철수')).toBeInTheDocument();
    expect(screen.getByText('이영희')).toBeInTheDocument();
  });

  it('학생을 클릭하면 선택된다', () => {
    const mockStudents = [{ id: '1', name: '김철수' }];

    mockLocalStorage.getItem
      .mockReturnValueOnce(JSON.stringify(mockStudents))
      .mockReturnValueOnce(null)
      .mockReturnValueOnce('');

    render(<StudentsPage />);
    const studentButton = screen.getByText('김철수');
    fireEvent.click(studentButton);
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'ui:selectedStudent',
      JSON.stringify('1')
    );
  });

  it('선택된 학생이 있을 때 선택된 학생 정보를 표시한다', () => {
    const mockStudents = [{ id: '1', name: '김철수' }];

    mockLocalStorage.getItem
      .mockReturnValueOnce(JSON.stringify(mockStudents))
      .mockReturnValueOnce(null)
      .mockReturnValueOnce('1');

    render(<StudentsPage />);
    expect(screen.getByText(/선택된 학생:/)).toBeInTheDocument();
    expect(screen.getByText('김철수')).toBeInTheDocument();
  });

  it('학생 삭제 버튼을 클릭하면 학생이 삭제된다', () => {
    const mockStudents = [{ id: '1', name: '김철수' }];

    mockLocalStorage.getItem
      .mockReturnValueOnce(JSON.stringify(mockStudents))
      .mockReturnValueOnce(null)
      .mockReturnValueOnce('');

    render(<StudentsPage />);
    const deleteButton = screen.getByText('삭제');
    fireEvent.click(deleteButton);
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'students',
      JSON.stringify([])
    );
  });

  it('학생이 10명 이상일 때 스크롤 안내 메시지를 표시한다', () => {
    const mockStudents = Array.from({ length: 11 }, (_, i) => ({
      id: `student-${i}`,
      name: `학생${i + 1}`,
    }));

    mockLocalStorage.getItem
      .mockReturnValueOnce(JSON.stringify(mockStudents))
      .mockReturnValueOnce(null)
      .mockReturnValueOnce('');

    render(<StudentsPage />);
    expect(screen.getByText('스크롤하여 확인')).toBeInTheDocument();
  });

  it('학생이 10명 미만일 때 스크롤 안내 메시지를 표시하지 않는다', () => {
    const mockStudents = Array.from({ length: 5 }, (_, i) => ({
      id: `student-${i}`,
      name: `학생${i + 1}`,
    }));

    mockLocalStorage.getItem
      .mockReturnValueOnce(JSON.stringify(mockStudents))
      .mockReturnValueOnce(null)
      .mockReturnValueOnce('');

    render(<StudentsPage />);
    expect(screen.queryByText('스크롤하여 확인')).not.toBeInTheDocument();
  });

  it('중복된 학생 이름으로는 추가할 수 없다', () => {
    const mockStudents = [{ id: '1', name: '김철수' }];

    mockLocalStorage.getItem
      .mockReturnValueOnce(JSON.stringify(mockStudents))
      .mockReturnValueOnce(null)
      .mockReturnValueOnce('');

    render(<StudentsPage />);
    const input = screen.getByPlaceholderText('학생 이름');
    const addButton = screen.getByText('추가');

    fireEvent.change(input, { target: { value: '김철수' } });
    fireEvent.click(addButton);

    expect(global.alert).toHaveBeenCalledWith('이미 존재하는 학생 이름입니다.');
  });

  it('기본 과목들이 자동으로 생성된다', async () => {
    render(<StudentsPage />);

    await waitFor(() => {
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'subjects',
        expect.stringContaining('수학')
      );
    });
  });

  it('여러 속성을 동시에 적용할 수 있다', () => {
    const mockStudents = [
      { id: '1', name: '김철수' },
      { id: '2', name: '이영희' },
    ];

    mockLocalStorage.getItem
      .mockReturnValueOnce(JSON.stringify(mockStudents))
      .mockReturnValueOnce(null)
      .mockReturnValueOnce('1');

    render(<StudentsPage />);
    expect(screen.getByText('김철수')).toBeInTheDocument();
    expect(screen.getByText('이영희')).toBeInTheDocument();
    expect(screen.getByText(/선택된 학생:/)).toBeInTheDocument();
  });
});
