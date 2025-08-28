import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DropZone from '../DropZone';

describe('DropZone 렌더링 테스트', () => {
  const mockOnDrop = vi.fn();
  const mockOnDragEnter = vi.fn();
  const mockOnDragLeave = vi.fn();
  const mockOnDragOver = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('기본 props로 렌더링된다', () => {
    render(
      <DropZone
        hourIdx={0}
        height={60}
        onDrop={mockOnDrop}
        onDragEnter={mockOnDragEnter}
        onDragLeave={mockOnDragLeave}
        onDragOver={mockOnDragOver}
      />
    );

    const dropZone = screen.getByTestId('drop-zone');
    expect(dropZone).toBeInTheDocument();
  });

  it('드래그 오버 시 시각적 피드백을 제공한다', () => {
    render(
      <DropZone
        hourIdx={0}
        height={60}
        onDrop={mockOnDrop}
        onDragEnter={mockOnDragEnter}
        onDragLeave={mockOnDragLeave}
        onDragOver={mockOnDragOver}
      />
    );

    const dropZone = screen.getByTestId('drop-zone');

    // 드래그 오버 전
    expect(dropZone).toHaveStyle({
      border: '1px dashed transparent',
    });

    // 드래그 오버 시
    fireEvent.dragEnter(dropZone);
    expect(dropZone).toHaveStyle({
      border: '2px dashed var(--color-primary)',
    });
  });

  it('드래그 리브 시 시각적 피드백을 제거한다', () => {
    render(
      <DropZone
        hourIdx={0}
        height={60}
        onDrop={mockOnDrop}
        onDragEnter={mockOnDragEnter}
        onDragLeave={mockOnDragLeave}
        onDragOver={mockOnDragOver}
      />
    );

    const dropZone = screen.getByTestId('drop-zone');

    // 드래그 오버
    fireEvent.dragEnter(dropZone);
    expect(dropZone).toHaveStyle({
      border: '2px dashed var(--color-primary)',
    });

    // 드래그 리브
    fireEvent.dragLeave(dropZone);
    expect(dropZone).toHaveStyle({
      border: '1px dashed transparent',
    });
  });

  it('드롭 이벤트를 올바르게 처리한다', () => {
    render(
      <DropZone
        hourIdx={0}
        height={60}
        onDrop={mockOnDrop}
        onDragEnter={mockOnDragEnter}
        onDragLeave={mockOnDragLeave}
        onDragOver={mockOnDragOver}
      />
    );

    const dropZone = screen.getByTestId('drop-zone');

    // 드래그 오버
    fireEvent.dragEnter(dropZone);

    // 드롭
    fireEvent.drop(dropZone, {
      dataTransfer: {
        getData: () => 'test-enrollment-id',
      },
    });

    expect(mockOnDrop).toHaveBeenCalled();
  });

  it('기본 크기와 위치를 올바르게 설정한다', () => {
    render(
      <DropZone
        hourIdx={0}
        height={60}
        onDrop={mockOnDrop}
        onDragEnter={mockOnDragEnter}
        onDragLeave={mockOnDragLeave}
        onDragOver={mockOnDragOver}
      />
    );

    const dropZone = screen.getByTestId('drop-zone');
    expect(dropZone).toHaveStyle({
      position: 'absolute',
      width: '120px',
      height: '60px',
      left: '0px',
    });
  });

  it('여러 드롭존이 동시에 존재할 때 각각 독립적으로 동작한다', () => {
    render(
      <div>
        <DropZone
          hourIdx={0}
          height={60}
          onDrop={mockOnDrop}
          onDragEnter={mockOnDragEnter}
          onDragLeave={mockOnDragLeave}
          onDragOver={mockOnDragOver}
        />
        <DropZone
          hourIdx={1}
          height={60}
          onDrop={mockOnDrop}
          onDragEnter={mockOnDragEnter}
          onDragLeave={mockOnDragLeave}
          onDragOver={mockOnDragOver}
        />
      </div>
    );

    const firstDropZone = screen.getAllByTestId('drop-zone')[0];
    const secondDropZone = screen.getAllByTestId('drop-zone')[1];

    // 첫 번째 드롭존에 드래그 오버
    fireEvent.dragEnter(firstDropZone);

    // 첫 번째 드롭존은 드래그 오버 상태여야 함
    expect(firstDropZone).toHaveStyle({
      border: '2px dashed var(--color-primary)',
    });

    // 두 번째 드롭존은 기본 상태여야 함
    expect(secondDropZone).toHaveStyle({
      border: '1px dashed transparent',
    });
  });

  it('트랜지션 효과를 올바르게 적용한다', () => {
    render(
      <DropZone
        hourIdx={0}
        height={60}
        onDrop={mockOnDrop}
        onDragEnter={mockOnDragEnter}
        onDragLeave={mockOnDragLeave}
        onDragOver={mockOnDragOver}
      />
    );

    const dropZone = screen.getByTestId('drop-zone');
    expect(dropZone).toHaveStyle({
      transition: 'border-color 0.2s',
    });
  });

  it('z-index가 올바르게 설정된다', () => {
    render(
      <DropZone
        hourIdx={0}
        height={60}
        onDrop={mockOnDrop}
        onDragEnter={mockOnDragEnter}
        onDragLeave={mockOnDragLeave}
        onDragOver={mockOnDragOver}
      />
    );

    const dropZone = screen.getByTestId('drop-zone');
    expect(dropZone).toHaveStyle({
      zIndex: 5,
    });
  });
});
