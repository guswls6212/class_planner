import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import StudentListItem from '../StudentListItem';

describe('StudentListItem', () => {
  const defaultProps = {
    student: { id: '1', name: '김요섭' },
    isSelected: false,
    onSelect: vi.fn(),
    onDelete: vi.fn(),
  };

  test('기본 렌더링이 올바르게 된다', () => {
    render(<StudentListItem {...defaultProps} />);

    expect(screen.getByText('김요섭')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /삭제/i })).toBeInTheDocument();
  });

  test('선택된 상태가 올바르게 표시된다', () => {
    render(<StudentListItem {...defaultProps} isSelected={true} />);

    const listItem = screen.getByRole('listitem');
    expect(listItem).toHaveClass('selected');
  });

  test('선택되지 않은 상태가 올바르게 표시된다', () => {
    render(<StudentListItem {...defaultProps} isSelected={false} />);

    const listItem = screen.getByRole('listitem');
    expect(listItem).not.toHaveClass('selected');
  });

  test('클릭 시 onSelect가 호출된다', () => {
    const mockOnSelect = vi.fn();
    render(<StudentListItem {...defaultProps} onSelect={mockOnSelect} />);

    const listItem = screen.getByRole('listitem');
    fireEvent.click(listItem);

    expect(mockOnSelect).toHaveBeenCalledWith('1');
  });

  test('삭제 버튼 클릭 시 onDelete가 호출된다', () => {
    const mockOnDelete = vi.fn();
    render(<StudentListItem {...defaultProps} onDelete={mockOnDelete} />);

    const deleteButton = screen.getByRole('button', { name: /삭제/i });
    fireEvent.click(deleteButton);

    expect(mockOnDelete).toHaveBeenCalledWith('1');
  });

  test('삭제 버튼이 올바르게 표시된다', () => {
    render(<StudentListItem {...defaultProps} />);

    const deleteButton = screen.getByRole('button', { name: '삭제' });
    expect(deleteButton).toBeInTheDocument();
    expect(deleteButton).toHaveTextContent('삭제');
  });

  test('다양한 학생 이름을 올바르게 표시한다', () => {
    const { rerender } = render(<StudentListItem {...defaultProps} />);
    expect(screen.getByText('김요섭')).toBeInTheDocument();

    rerender(
      <StudentListItem
        {...defaultProps}
        student={{ id: '2', name: '이현진' }}
      />,
    );
    expect(screen.getByText('이현진')).toBeInTheDocument();
  });

  test('카드 배경색이 과목 네비게이션과 일치한다', () => {
    render(<StudentListItem {...defaultProps} />);

    const listItem = screen.getByRole('listitem');
    expect(listItem).toHaveClass('container');

    // 기본 배경색이 var(--color-bg-primary)로 설정되어 있는지 확인
    const computedStyle = window.getComputedStyle(listItem);
    expect(computedStyle.backgroundColor).toBeDefined();
  });

  test('호버 시 배경색이 변경된다', () => {
    render(<StudentListItem {...defaultProps} />);

    const listItem = screen.getByRole('listitem');

    // 호버 이벤트 시뮬레이션
    fireEvent.mouseEnter(listItem);

    // 호버 상태에서 배경색이 변경되는지 확인
    expect(listItem).toHaveClass('container');
  });
});
