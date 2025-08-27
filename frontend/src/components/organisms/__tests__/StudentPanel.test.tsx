import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import StudentPanel from '../StudentPanel';

// Mock data
const mockStudents = [
  { id: '1', name: '김철수' },
  { id: '2', name: '이영희' },
  { id: '3', name: '박민수' },
];

const defaultProps = {
  students: mockStudents,
  selectedStudentId: '1',
  onStudentSelect: vi.fn(),
  panelPos: { x: 100, y: 200 },
  onPanelMove: vi.fn(),
};

describe('StudentPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('기본적으로 렌더링된다', () => {
    render(<StudentPanel {...defaultProps} />);
    expect(screen.getByText('수강생 리스트')).toBeInTheDocument();
  });

  it('학생 목록을 올바르게 표시한다', () => {
    render(<StudentPanel {...defaultProps} />);

    expect(screen.getByText('김철수')).toBeInTheDocument();
    expect(screen.getByText('이영희')).toBeInTheDocument();
    expect(screen.getByText('박민수')).toBeInTheDocument();
  });

  it('선택된 학생을 올바르게 표시한다', () => {
    render(<StudentPanel {...defaultProps} selectedStudentId="2" />);

    const selectedStudent = screen.getByText('이영희').closest('div');
    expect(selectedStudent).toHaveStyle({
      background: 'rgba(59,130,246,0.5)',
    });
  });

  it('선택되지 않은 학생은 기본 스타일을 가진다', () => {
    render(<StudentPanel {...defaultProps} selectedStudentId="1" />);

    const unselectedStudent = screen.getByText('이영희').closest('div');
    expect(unselectedStudent).toHaveStyle({
      background: 'rgba(255,255,255,0.05)',
    });
  });

  it('학생을 클릭하면 onStudentSelect가 호출된다', () => {
    const mockOnStudentSelect = vi.fn();
    render(
      <StudentPanel {...defaultProps} onStudentSelect={mockOnStudentSelect} />
    );

    fireEvent.click(screen.getByText('이영희'));
    expect(mockOnStudentSelect).toHaveBeenCalledWith('2');
  });

  it('학생이 없을 때 안내 메시지를 표시한다', () => {
    render(<StudentPanel {...defaultProps} students={[]} />);
    expect(
      screen.getByText('학생 페이지에서 학생을 추가하세요')
    ).toBeInTheDocument();
  });

  it('panelPos에 따라 위치가 설정된다', () => {
    render(<StudentPanel {...defaultProps} panelPos={{ x: 300, y: 400 }} />);

    const panel = screen
      .getByText('수강생 리스트')
      .closest('div')?.parentElement;
    expect(panel).toHaveStyle({
      left: '300px',
      top: '400px',
    });
  });

  it('기본 스타일이 올바르게 적용된다', () => {
    render(<StudentPanel {...defaultProps} />);

    const panel = screen
      .getByText('수강생 리스트')
      .closest('div')?.parentElement;
    expect(panel).toHaveStyle({
      position: 'fixed',
      width: '280px',
      overflow: 'auto',
      background: 'rgba(0,0,0,0.5)',
      padding: '16px',
    });
  });

  it('헤더의 기본 커서 스타일이 적용된다', () => {
    render(<StudentPanel {...defaultProps} />);

    const header = screen.getByText('수강생 리스트');
    expect(header).toHaveStyle({
      cursor: 'grab',
    });
  });

  it('학생 항목의 기본 스타일이 적용된다', () => {
    render(<StudentPanel {...defaultProps} />);

    const studentItem = screen.getByText('김철수').closest('div');
    expect(studentItem).toHaveStyle({
      width: '100%',
      textAlign: 'left',
      padding: '8px 12px',
      borderRadius: '6px',
      border: '1px solid rgba(255,255,255,0.15)',
      color: '#fff',
      cursor: 'grab',
      userSelect: 'none',
      boxSizing: 'border-box',
    });
  });

  it('학생 목록의 그리드 레이아웃이 적용된다', () => {
    render(<StudentPanel {...defaultProps} />);

    const studentList = screen.getByText('김철수').closest('ul');
    expect(studentList).toHaveStyle({
      listStyle: 'none',
      margin: '0px',
      padding: '0px',
      display: 'grid',
      gap: '8px',
    });
  });

  it('드래그 속성이 올바르게 설정된다', () => {
    render(<StudentPanel {...defaultProps} />);

    const studentItem = screen.getByText('김철수').closest('div');
    expect(studentItem).toHaveAttribute('draggable', 'true');
  });

  it('여러 속성을 동시에 적용할 수 있다', () => {
    render(
      <StudentPanel
        students={[{ id: '4', name: '정수진' }]}
        selectedStudentId="4"
        onStudentSelect={vi.fn()}
        panelPos={{ x: 500, y: 600 }}
        onPanelMove={vi.fn()}
      />
    );

    expect(screen.getByText('정수진')).toBeInTheDocument();
    expect(screen.getByText('정수진').closest('div')).toHaveStyle({
      background: 'rgba(59,130,246,0.5)',
    });

    const panel = screen
      .getByText('수강생 리스트')
      .closest('div')?.parentElement;
    expect(panel).toHaveStyle({
      left: '500px',
      top: '600px',
    });
  });
});
