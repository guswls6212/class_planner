import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DropZone from '../DropZone';

describe('DropZone', () => {
  const defaultProps = {
    hourIdx: 0,
    height: 100,
    onDrop: vi.fn(),
    onDragEnter: vi.fn(),
    onDragLeave: vi.fn(),
    onDragOver: vi.fn(),
  };

  it('기본 props로 렌더링된다', () => {
    render(<DropZone {...defaultProps} />);
    const dropZone = screen.getByRole('generic');
    expect(dropZone).toBeInTheDocument();
  });

  it('드래그 오버 상태를 올바르게 관리한다', () => {
    render(<DropZone {...defaultProps} />);
    const dropZone = screen.getByRole('generic');

    // 드래그 엔터
    fireEvent.dragEnter(dropZone);
    expect(dropZone).toHaveStyle({
      border: '2px dashed var(--color-primary)',
      backgroundColor: 'rgba(var(--color-primary-rgb), 0.1)',
    });

    // 드래그 리브
    fireEvent.dragLeave(dropZone);
    expect(dropZone).toHaveStyle({
      border: '1px dashed transparent',
      backgroundColor: 'transparent',
    });
  });

  it('드롭 이벤트를 올바르게 처리한다', () => {
    render(<DropZone {...defaultProps} />);
    const dropZone = screen.getByRole('generic');

    fireEvent.drop(dropZone);
    expect(defaultProps.onDrop).toHaveBeenCalledTimes(1);
  });

  it('드래그 오버 이벤트를 올바르게 처리한다', () => {
    render(<DropZone {...defaultProps} />);
    const dropZone = screen.getByRole('generic');

    fireEvent.dragOver(dropZone);
    expect(defaultProps.onDragOver).toHaveBeenCalledTimes(1);
  });

  it('드래그 엔터 이벤트를 올바르게 처리한다', () => {
    render(<DropZone {...defaultProps} />);
    const dropZone = screen.getByRole('generic');

    fireEvent.dragEnter(dropZone);
    expect(defaultProps.onDragEnter).toHaveBeenCalledTimes(1);
  });

  it('드래그 리브 이벤트를 올바르게 처리한다', () => {
    render(<DropZone {...defaultProps} />);
    const dropZone = screen.getByRole('generic');

    fireEvent.dragLeave(dropZone);
    expect(defaultProps.onDragLeave).toHaveBeenCalledTimes(1);
  });

  it('위치와 크기를 올바르게 계산한다', () => {
    render(<DropZone hourIdx={2} height={150} {...defaultProps} />);
    const dropZone = screen.getByRole('generic');

    expect(dropZone).toHaveStyle({
      position: 'absolute',
      left: '240px', // 2 * 120
      top: '0px',
      width: '120px',
      height: '150px',
    });
  });

  it('기본 스타일 속성들을 올바르게 적용한다', () => {
    render(<DropZone {...defaultProps} />);
    const dropZone = screen.getByRole('generic');

    expect(dropZone).toHaveStyle({
      border: '1px dashed transparent',
      transition: 'border-color 0.2s',
      zIndex: 5,
    });
  });

  it('드래그 오버 시 시각적 피드백을 제공한다', () => {
    render(<DropZone {...defaultProps} />);
    const dropZone = screen.getByRole('generic');

    // 초기 상태
    expect(dropZone).toHaveStyle({
      border: '1px dashed transparent',
      backgroundColor: 'transparent',
    });

    // 드래그 오버 상태
    fireEvent.dragEnter(dropZone);
    expect(dropZone).toHaveStyle({
      border: '2px dashed var(--color-primary)',
      backgroundColor: 'rgba(var(--color-primary-rgb), 0.1)',
    });
  });

  it('여러 드래그 이벤트를 연속으로 처리한다', () => {
    render(<DropZone {...defaultProps} />);
    const dropZone = screen.getByRole('generic');

    // 드래그 엔터 → 드래그 오버 → 드롭
    fireEvent.dragEnter(dropZone);
    fireEvent.dragOver(dropZone);
    fireEvent.drop(dropZone);

    expect(defaultProps.onDragEnter).toHaveBeenCalledTimes(1);
    expect(defaultProps.onDragOver).toHaveBeenCalledTimes(1);
    expect(defaultProps.onDrop).toHaveBeenCalledTimes(1);
  });

  it('다양한 hourIdx 값에 대해 올바른 위치를 계산한다', () => {
    const testCases = [
      { hourIdx: 0, expectedLeft: '0px' },
      { hourIdx: 1, expectedLeft: '120px' },
      { hourIdx: 5, expectedLeft: '600px' },
      { hourIdx: 10, expectedLeft: '1200px' },
    ];

    testCases.forEach(({ hourIdx, expectedLeft }) => {
      const { unmount } = render(
        <DropZone hourIdx={hourIdx} height={100} {...defaultProps} />
      );

      const dropZone = screen.getByRole('generic');
      expect(dropZone).toHaveStyle({ left: expectedLeft });

      unmount();
    });
  });

  it('다양한 height 값에 대해 올바른 높이를 적용한다', () => {
    const testCases = [60, 100, 150, 200];

    testCases.forEach(height => {
      const { unmount } = render(
        <DropZone hourIdx={0} height={height} {...defaultProps} />
      );

      const dropZone = screen.getByRole('generic');
      expect(dropZone).toHaveStyle({ height: `${height}px` });

      unmount();
    });
  });
});
