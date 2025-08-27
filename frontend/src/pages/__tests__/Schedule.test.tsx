import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import SchedulePage from '../Schedule';

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

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => 'mock-uuid-123'),
  },
});

// Mock alert
global.alert = vi.fn();

describe('SchedulePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  it('기본적으로 렌더링된다', () => {
    render(<SchedulePage />);
    expect(screen.getByText('주간 시간표')).toBeInTheDocument();
  });

  it('전체 학생 시간표 안내 메시지를 표시한다', () => {
    render(<SchedulePage />);
    expect(
      screen.getByText(
        '전체 학생의 시간표입니다. 수강생 리스트에서 학생을 선택하면 해당 학생의 시간표만 볼 수 있습니다.'
      )
    ).toBeInTheDocument();
  });

  it('시간 헤더를 올바르게 표시한다', () => {
    render(<SchedulePage />);
    expect(screen.getByText('09:00')).toBeInTheDocument();
    expect(screen.getByText('10:00')).toBeInTheDocument();
    expect(screen.getByText('11:00')).toBeInTheDocument();
  });

  it('요일 라벨을 올바르게 표시한다', () => {
    render(<SchedulePage />);
    expect(screen.getByText('월')).toBeInTheDocument();
    expect(screen.getByText('화')).toBeInTheDocument();
    expect(screen.getByText('수')).toBeInTheDocument();
    expect(screen.getByText('목')).toBeInTheDocument();
    expect(screen.getByText('금')).toBeInTheDocument();
  });

  it('수강생 리스트 패널을 표시한다', () => {
    render(<SchedulePage />);
    expect(screen.getByText('수강생 리스트')).toBeInTheDocument();
  });

  it('학생이 없을 때 안내 메시지를 표시한다', () => {
    render(<SchedulePage />);
    expect(
      screen.getByText('학생 페이지에서 학생을 추가하세요')
    ).toBeInTheDocument();
  });

  it('기본 스타일이 올바르게 적용된다', () => {
    render(<SchedulePage />);
    const container = screen.getByText('주간 시간표').closest('div');
    expect(container).toHaveClass('timetable-container');
  });

  it('시간표 그리드 레이아웃이 올바르게 설정된다', () => {
    render(<SchedulePage />);
    const grid = screen.getByText('09:00').closest('.grid');
    expect(grid).toHaveClass('grid-rows-header', 'grid-cols-auto', 'gap-grid');
  });

  it('드롭 존이 올바르게 설정된다', () => {
    render(<SchedulePage />);
    const dropZones = document.querySelectorAll('.drop-zone');
    expect(dropZones.length).toBeGreaterThan(0);
    dropZones.forEach(zone => {
      expect(zone).toHaveClass('position-absolute');
    });
  });

  it('플로팅 패널이 올바르게 설정된다', () => {
    render(<SchedulePage />);
    const panel = screen.getByText('수강생 리스트').closest('.floating-panel');
    expect(panel).toHaveClass('position-fixed', 'z-1000', 'overflow-auto');
  });

  it('localStorage에서 데이터를 불러온다', () => {
    const mockData = {
      students: [{ id: '1', name: '김철수' }],
      subjects: [{ id: '1', name: '수학', color: '#ff0000' }],
      sessions: [],
      enrollments: [],
    };

    mockLocalStorage.getItem
      .mockReturnValueOnce(JSON.stringify(mockData.subjects))
      .mockReturnValueOnce(JSON.stringify(mockData.enrollments))
      .mockReturnValueOnce(JSON.stringify(mockData.sessions))
      .mockReturnValueOnce('')
      .mockReturnValueOnce(JSON.stringify(mockData.students))
      .mockReturnValueOnce(JSON.stringify({ x: 600, y: 90 }));

    render(<SchedulePage />);
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith('subjects');
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith('enrollments');
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith('sessions');
  });

  it('학생이 있을 때 학생 목록을 표시한다', () => {
    const mockStudents = [
      { id: '1', name: '김철수' },
      { id: '2', name: '이영희' },
    ];

    mockLocalStorage.getItem
      .mockReturnValueOnce(null) // subjects
      .mockReturnValueOnce(null) // enrollments
      .mockReturnValueOnce(null) // sessions
      .mockReturnValueOnce('') // selectedStudentId
      .mockReturnValueOnce(JSON.stringify(mockStudents)) // students
      .mockReturnValueOnce(JSON.stringify({ x: 600, y: 90 })); // panelPos

    render(<SchedulePage />);
    expect(screen.getByText('김철수')).toBeInTheDocument();
    expect(screen.getByText('이영희')).toBeInTheDocument();
  });

  it('학생을 클릭하면 선택된다', () => {
    const mockStudents = [{ id: '1', name: '김철수' }];

    mockLocalStorage.getItem
      .mockReturnValueOnce(null)
      .mockReturnValueOnce(null)
      .mockReturnValueOnce(null)
      .mockReturnValueOnce('')
      .mockReturnValueOnce(JSON.stringify(mockStudents))
      .mockReturnValueOnce(JSON.stringify({ x: 600, y: 90 }));

    render(<SchedulePage />);
    const studentButton = screen.getByText('김철수');
    fireEvent.mouseDown(studentButton);
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'ui:selectedStudent',
      JSON.stringify('1')
    );
  });

  it('선택된 학생이 있을 때 해당 학생의 시간표 안내 메시지를 표시한다', () => {
    const mockStudents = [{ id: '1', name: '김철수' }];

    mockLocalStorage.getItem
      .mockReturnValueOnce(null) // subjects
      .mockReturnValueOnce(null) // enrollments
      .mockReturnValueOnce(null) // sessions
      .mockReturnValueOnce('1') // selectedStudentId
      .mockReturnValueOnce(JSON.stringify(mockStudents)) // students
      .mockReturnValueOnce(JSON.stringify({ x: 600, y: 90 })); // panelPos

    render(<SchedulePage />);
    expect(screen.getByText(/학생의 시간표입니다/)).toBeInTheDocument();
  });

  it('드래그 이벤트가 올바르게 설정된다', () => {
    const mockStudents = [{ id: '1', name: '김철수' }];

    mockLocalStorage.getItem
      .mockReturnValueOnce(null)
      .mockReturnValueOnce(null)
      .mockReturnValueOnce(null)
      .mockReturnValueOnce('')
      .mockReturnValueOnce(JSON.stringify(mockStudents))
      .mockReturnValueOnce(JSON.stringify({ x: 600, y: 90 }));

    render(<SchedulePage />);
    const studentItem = screen.getByText('김철수').closest('div');
    expect(studentItem).toHaveAttribute('draggable', 'true');
  });

  it('드래그 시작 시 데이터가 올바르게 설정된다', () => {
    const mockStudents = [{ id: '1', name: '김철수' }];

    mockLocalStorage.getItem
      .mockReturnValueOnce(null)
      .mockReturnValueOnce(null)
      .mockReturnValueOnce(null)
      .mockReturnValueOnce('')
      .mockReturnValueOnce(JSON.stringify(mockStudents))
      .mockReturnValueOnce(JSON.stringify({ x: 600, y: 90 }));

    render(<SchedulePage />);
    const studentItem = screen.getByText('김철수').closest('div');
    const mockSetData = vi.fn();
    const mockDataTransfer = {
      setData: mockSetData,
      effectAllowed: '',
    };

    fireEvent.dragStart(studentItem!, { dataTransfer: mockDataTransfer });
    expect(mockSetData).toHaveBeenCalledWith('text/plain', '1');
    expect(mockDataTransfer.effectAllowed).toBe('copy');
  });

  it('여러 속성을 동시에 적용할 수 있다', () => {
    const mockData = {
      students: [{ id: '2', name: '박민수' }],
      subjects: [{ id: '2', name: '영어', color: '#00ff00' }],
      sessions: [],
      enrollments: [],
    };

    mockLocalStorage.getItem
      .mockReturnValueOnce(JSON.stringify(mockData.subjects)) // subjects
      .mockReturnValueOnce(JSON.stringify(mockData.enrollments)) // enrollments
      .mockReturnValueOnce(JSON.stringify(mockData.sessions)) // sessions
      .mockReturnValueOnce('2') // selectedStudentId
      .mockReturnValueOnce(JSON.stringify(mockData.students)) // students
      .mockReturnValueOnce(JSON.stringify({ x: 700, y: 100 })); // panelPos

    render(<SchedulePage />);
    expect(screen.getByText('박민수')).toBeInTheDocument();
    expect(screen.getByText(/학생의 시간표입니다/)).toBeInTheDocument();
  });
});
