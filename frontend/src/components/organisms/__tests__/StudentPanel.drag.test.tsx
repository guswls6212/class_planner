import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import StudentPanel from '../StudentPanel';
import type { Student } from '../../../lib/planner';
import type { StudentPanelState } from '../../../types/scheduleTypes';

// Mock 데이터
const mockStudents: Student[] = [
  { id: '1', name: '김요섭' },
  { id: '2', name: '이영희' },
  { id: '3', name: '박철수' },
];

const mockPanelState: StudentPanelState = {
  position: { x: 100, y: 100 },
  isDragging: false,
  dragOffset: { x: 0, y: 0 },
  searchQuery: '',
  filteredStudents: mockStudents,
};

const mockHandlers = {
  onMouseDown: vi.fn(),
  onStudentClick: vi.fn(),
  onDragStart: vi.fn(),
  onSearchChange: vi.fn(),
};

describe('StudentPanel - 드래그 기능 및 UX 테스트', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('드래그 가능함을 알리는 UX 요소', () => {
    it('헤더에 드래그 가능함을 알리는 툴팁이 표시된다', () => {
      render(
        <StudentPanel
          selectedStudentId=""
          panelState={mockPanelState}
          onMouseDown={mockHandlers.onMouseDown}
          onStudentClick={mockHandlers.onStudentClick}
          onDragStart={mockHandlers.onDragStart}
          onSearchChange={mockHandlers.onSearchChange}
        />
      );

      const header = screen.getByTestId('students-panel-header');
      expect(header).toHaveAttribute(
        'title',
        '드래그하여 패널 위치를 이동할 수 있습니다'
      );
    });

    it('헤더에 "수강생 리스트" 텍스트만 깔끔하게 표시된다', () => {
      render(
        <StudentPanel
          selectedStudentId=""
          panelState={mockPanelState}
          onMouseDown={mockHandlers.onMouseDown}
          onStudentClick={mockHandlers.onStudentClick}
          onDragStart={mockHandlers.onDragStart}
          onSearchChange={mockHandlers.onSearchChange}
        />
      );

      expect(screen.getByText('수강생 리스트')).toBeInTheDocument();
      expect(screen.queryByText('드래그 가능')).not.toBeInTheDocument();
      expect(screen.queryByText('이동 중...')).not.toBeInTheDocument();
    });

    it('기본 상태에서 헤더에 grab 커서가 적용된다', () => {
      render(
        <StudentPanel
          selectedStudentId=""
          panelState={mockPanelState}
          onMouseDown={mockHandlers.onMouseDown}
          onStudentClick={mockHandlers.onStudentClick}
          onDragStart={mockHandlers.onDragStart}
          onSearchChange={mockHandlers.onSearchChange}
        />
      );

      const header = screen.getByTestId('students-panel-header');
      expect(header).toHaveClass('cursor-grab');
    });

    it('드래그 중일 때 헤더에 grabbing 커서가 적용된다', () => {
      const draggingPanelState = {
        ...mockPanelState,
        isDragging: true,
      };

      render(
        <StudentPanel
          selectedStudentId=""
          panelState={draggingPanelState}
          onMouseDown={mockHandlers.onMouseDown}
          onStudentClick={mockHandlers.onStudentClick}
          onDragStart={mockHandlers.onDragStart}
          onSearchChange={mockHandlers.onSearchChange}
        />
      );

      const header = screen.getByTestId('students-panel-header');
      expect(header).toHaveClass('cursor-grabbing');
    });
  });

  describe('드래그 이벤트 처리', () => {
    it('헤더를 클릭하면 onMouseDown 핸들러가 호출된다', () => {
      render(
        <StudentPanel
          selectedStudentId=""
          panelState={mockPanelState}
          onMouseDown={mockHandlers.onMouseDown}
          onStudentClick={mockHandlers.onStudentClick}
          onDragStart={mockHandlers.onDragStart}
          onSearchChange={mockHandlers.onSearchChange}
        />
      );

      const header = screen.getByTestId('students-panel-header');
      fireEvent.mouseDown(header);

      expect(mockHandlers.onMouseDown).toHaveBeenCalledTimes(1);
    });

    it('학생을 드래그하면 onDragStart 핸들러가 호출된다', () => {
      render(
        <StudentPanel
          selectedStudentId=""
          panelState={mockPanelState}
          onMouseDown={mockHandlers.onMouseDown}
          onStudentClick={mockHandlers.onStudentClick}
          onDragStart={mockHandlers.onDragStart}
          onSearchChange={mockHandlers.onSearchChange}
        />
      );

      const studentItem = screen.getByText('김요섭');
      fireEvent.dragStart(studentItem);

      expect(mockHandlers.onDragStart).toHaveBeenCalledTimes(1);
    });
  });

  describe('패널 위치 및 스타일', () => {
    it('패널이 지정된 위치에 올바르게 렌더링된다', () => {
      render(
        <StudentPanel
          selectedStudentId=""
          panelState={mockPanelState}
          onMouseDown={mockHandlers.onMouseDown}
          onStudentClick={mockHandlers.onStudentClick}
          onDragStart={mockHandlers.onDragStart}
          onSearchChange={mockHandlers.onSearchChange}
        />
      );

      const panel = screen
        .getByTestId('students-panel-header')
        .closest('.floatingPanel');
      expect(panel).toHaveStyle({
        left: '100px',
        top: '100px',
      });
    });

    it('패널에 올바른 CSS 클래스가 적용된다', () => {
      render(
        <StudentPanel
          selectedStudentId=""
          panelState={mockPanelState}
          onMouseDown={mockHandlers.onMouseDown}
          onStudentClick={mockHandlers.onStudentClick}
          onDragStart={mockHandlers.onDragStart}
          onSearchChange={mockHandlers.onSearchChange}
        />
      );

      const panel = screen
        .getByTestId('students-panel-header')
        .closest('.floatingPanel');
      expect(panel).toHaveClass('floatingPanel');
      expect(panel).toHaveClass('position-fixed');
      expect(panel).toHaveClass('overflow-auto');
    });
  });

  describe('기능 일관성', () => {
    it('기존 기능들이 정상적으로 작동한다', () => {
      render(
        <StudentPanel
          selectedStudentId="1"
          panelState={mockPanelState}
          onMouseDown={mockHandlers.onMouseDown}
          onStudentClick={mockHandlers.onStudentClick}
          onDragStart={mockHandlers.onDragStart}
          onSearchChange={mockHandlers.onSearchChange}
        />
      );

      // 검색 기능
      const searchInput = screen.getByPlaceholderText('학생 이름 검색...');
      fireEvent.change(searchInput, { target: { value: '김' } });
      expect(mockHandlers.onSearchChange).toHaveBeenCalledWith('김');

      // 학생 클릭
      const studentItem = screen.getByText('김요섭');
      fireEvent.mouseDown(studentItem);
      expect(mockHandlers.onStudentClick).toHaveBeenCalledWith('1');

      // 선택된 학생이 하이라이트된다
      expect(studentItem).toHaveClass('selected');
    });

    it('검색 결과가 정상적으로 필터링된다', () => {
      const filteredPanelState = {
        ...mockPanelState,
        searchQuery: '김',
        filteredStudents: [mockStudents[0]], // 김요섭만
      };

      render(
        <StudentPanel
          selectedStudentId=""
          panelState={filteredPanelState}
          onMouseDown={mockHandlers.onMouseDown}
          onStudentClick={mockHandlers.onStudentClick}
          onDragStart={mockHandlers.onDragStart}
          onSearchChange={mockHandlers.onSearchChange}
        />
      );

      expect(screen.getByText('김요섭')).toBeInTheDocument();
      expect(screen.queryByText('이영희')).not.toBeInTheDocument();
      expect(screen.queryByText('박철수')).not.toBeInTheDocument();
    });
  });
});
