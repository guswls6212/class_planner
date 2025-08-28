import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DropZone from '../DropZone';

describe('DropZone 렌더링 테스트', () => {
  const defaultProps = {
    weekday: 0,
    time: '09:00',
    onDrop: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('기본 props로 렌더링된다', () => {
    render(<DropZone {...defaultProps} />);

    const dropZone = screen.getByTestId('drop-zone');
    expect(dropZone).toBeInTheDocument();
  });

  it('드래그 오버 시 시각적 피드백을 제공한다', () => {
    render(<DropZone {...defaultProps} />);

    const dropZone = screen.getByTestId('drop-zone');

    // 드래그 오버 전
    expect(dropZone).toHaveStyle({
      borderColor: 'transparent',
    });

    // 드래그 오버 시
    fireEvent.dragEnter(dropZone);
    expect(dropZone).toHaveStyle({
      borderColor: 'var(--color-primary)',
      backgroundColor: 'var(--color-primary-light)',
    });
  });

  it('드래그 리브 시 시각적 피드백을 제거한다', () => {
    render(<DropZone {...defaultProps} />);

    const dropZone = screen.getByTestId('drop-zone');

    // 드래그 오버
    fireEvent.dragEnter(dropZone);
    expect(dropZone).toHaveStyle({
      borderColor: 'var(--color-primary)',
    });

    // 드래그 리브
    fireEvent.dragLeave(dropZone);
    expect(dropZone).toHaveStyle({
      borderColor: 'transparent',
    });
  });

  it('드롭 이벤트를 올바르게 처리한다', () => {
    const mockOnDrop = vi.fn();
    render(<DropZone {...defaultProps} onDrop={mockOnDrop} />);

    const dropZone = screen.getByTestId('drop-zone');

    // 드래그 오버
    fireEvent.dragEnter(dropZone);

    // 드롭
    fireEvent.drop(dropZone, {
      dataTransfer: {
        getData: () => 'test-enrollment-id',
      },
    });

    expect(mockOnDrop).toHaveBeenCalledWith('test-enrollment-id');
  });

  it('드래그 오버 시 z-index가 올바르게 설정된다', () => {
    render(<DropZone {...defaultProps} />);

    const dropZone = screen.getByTestId('drop-zone');

    // 기본 상태
    expect(dropZone).toHaveStyle({
      zIndex: 5,
    });

    // 드래그 오버 시
    fireEvent.dragEnter(dropZone);
    expect(dropZone).toHaveStyle({
      zIndex: 10,
    });
  });

  it('커스텀 스타일을 올바르게 적용한다', () => {
    const customStyle = {
      width: '150px',
      height: '80px',
      backgroundColor: 'red',
    };

    render(<DropZone {...defaultProps} style={customStyle} />);

    const dropZone = screen.getByTestId('drop-zone');
    expect(dropZone).toHaveStyle({
      width: '150px',
      height: '80px',
      backgroundColor: 'red',
    });
  });

  it('여러 시간대의 드롭존을 올바르게 렌더링한다', () => {
    const times = ['09:00', '10:00', '11:00', '12:00'];

    times.forEach(time => {
      const { unmount } = render(<DropZone {...defaultProps} time={time} />);

      const dropZone = screen.getByTestId('drop-zone');
      expect(dropZone).toBeInTheDocument();
      unmount();
    });
  });

  it('여러 요일의 드롭존을 올바르게 렌더링한다', () => {
    const weekdays = [0, 1, 2, 3, 4, 5, 6];

    weekdays.forEach(weekday => {
      const { unmount } = render(
        <DropZone {...defaultProps} weekday={weekday} />
      );

      const dropZone = screen.getByTestId('drop-zone');
      expect(dropZone).toBeInTheDocument();
      unmount();
    });
  });

  it('드래그 오버 상태에서 올바른 색상을 적용한다', () => {
    render(<DropZone {...defaultProps} />);

    const dropZone = screen.getByTestId('drop-zone');

    // 드래그 오버 전
    expect(dropZone).toHaveStyle({
      borderColor: 'transparent',
      backgroundColor: 'transparent',
    });

    // 드래그 오버 시
    fireEvent.dragEnter(dropZone);
    expect(dropZone).toHaveStyle({
      borderColor: 'var(--color-primary)',
      backgroundColor: 'var(--color-primary-light)',
    });
  });

  it('트랜지션 효과를 올바르게 적용한다', () => {
    render(<DropZone {...defaultProps} />);

    const dropZone = screen.getByTestId('drop-zone');
    expect(dropZone).toHaveStyle({
      transition: 'border-color 0.2s, background-color 0.2s',
    });
  });

  it('기본 크기와 위치를 올바르게 설정한다', () => {
    render(<DropZone {...defaultProps} />);

    const dropZone = screen.getByTestId('drop-zone');
    expect(dropZone).toHaveStyle({
      position: 'absolute',
      width: '120px',
      height: '60px',
    });
  });

  it('드래그 오버 상태가 해제되면 원래 스타일로 복원된다', () => {
    render(<DropZone {...defaultProps} />);

    const dropZone = screen.getByTestId('drop-zone');

    // 드래그 오버
    fireEvent.dragEnter(dropZone);
    expect(dropZone).toHaveStyle({
      borderColor: 'var(--color-primary)',
      backgroundColor: 'var(--color-primary-light)',
    });

    // 드래그 리브
    fireEvent.dragLeave(dropZone);
    expect(dropZone).toHaveStyle({
      borderColor: 'transparent',
      backgroundColor: 'transparent',
    });
  });

  it('여러 드롭존이 동시에 존재할 때 각각 독립적으로 동작한다', () => {
    const { rerender } = render(<DropZone {...defaultProps} />);

    const firstDropZone = screen.getByTestId('drop-zone');

    // 첫 번째 드롭존에 드래그 오버
    fireEvent.dragEnter(firstDropZone);
    expect(firstDropZone).toHaveStyle({
      borderColor: 'var(--color-primary)',
    });

    // 두 번째 드롭존으로 변경
    rerender(<DropZone {...defaultProps} time="10:00" />);
    const secondDropZone = screen.getByTestId('drop-zone');

    // 두 번째 드롭존은 기본 상태여야 함
    expect(secondDropZone).toHaveStyle({
      borderColor: 'transparent',
    });
  });
});
