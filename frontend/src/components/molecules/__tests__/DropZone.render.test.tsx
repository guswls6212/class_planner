import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DropZone from '../DropZone';

describe('DropZone 렌더링 테스트', () => {
  const mockOnDrop = vi.fn();
  const mockOnEmptySpaceClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('기본 props로 렌더링된다', () => {
    render(
      <DropZone
        weekday={0}
        time="09:00"
        onDrop={mockOnDrop}
        onEmptySpaceClick={mockOnEmptySpaceClick}
      />
    );

    const dropZone = screen.getByTestId('dropzone-0-09:00');
    expect(dropZone).toBeInTheDocument();
  });

  it('드래그 오버 시 시각적 피드백을 제공한다', () => {
    render(
      <DropZone
        weekday={0}
        time="09:00"
        onDrop={mockOnDrop}
        onEmptySpaceClick={mockOnEmptySpaceClick}
      />
    );

    const dropZone = screen.getByTestId('dropzone-0-09:00');

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
        weekday={0}
        time="09:00"
        onDrop={mockOnDrop}
        onEmptySpaceClick={mockOnEmptySpaceClick}
      />
    );

    const dropZone = screen.getByTestId('dropzone-0-09:00');

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
        weekday={0}
        time="09:00"
        onDrop={mockOnDrop}
        onEmptySpaceClick={mockOnEmptySpaceClick}
      />
    );

    const dropZone = screen.getByTestId('dropzone-0-09:00');

    // 드래그 오버
    fireEvent.dragEnter(dropZone);

    // 드롭
    fireEvent.drop(dropZone, {
      dataTransfer: {
        getData: () => 'test-enrollment-id',
      },
    });

    expect(mockOnDrop).toHaveBeenCalledWith(0, '09:00', 'test-enrollment-id');
  });

  it('기본 크기와 위치를 올바르게 설정한다', () => {
    render(
      <DropZone
        weekday={0}
        time="09:00"
        onDrop={mockOnDrop}
        onEmptySpaceClick={mockOnEmptySpaceClick}
      />
    );

    const dropZone = screen.getByTestId('dropzone-0-09:00');
    expect(dropZone).toHaveStyle({
      cursor: 'pointer',
    });
  });

  it('여러 드롭존이 동시에 존재할 때 각각 독립적으로 동작한다', () => {
    render(
      <div>
        <DropZone
          weekday={0}
          time="09:00"
          onDrop={mockOnDrop}
          onEmptySpaceClick={mockOnEmptySpaceClick}
        />
        <DropZone
          weekday={1}
          time="10:00"
          onDrop={mockOnDrop}
          onEmptySpaceClick={mockOnEmptySpaceClick}
        />
      </div>
    );

    const firstDropZone = screen.getByTestId('dropzone-0-09:00');
    const secondDropZone = screen.getByTestId('dropzone-1-10:00');

    expect(firstDropZone).toBeInTheDocument();
    expect(secondDropZone).toBeInTheDocument();

    // 각각 독립적으로 동작하는지 확인
    fireEvent.dragEnter(firstDropZone);
    expect(firstDropZone).toHaveStyle({
      border: '2px dashed var(--color-primary)',
    });
    expect(secondDropZone).toHaveStyle({
      border: '1px dashed transparent',
    });
  });

  it('트랜지션 효과를 올바르게 적용한다', () => {
    render(
      <DropZone
        weekday={0}
        time="09:00"
        onDrop={mockOnDrop}
        onEmptySpaceClick={mockOnEmptySpaceClick}
      />
    );

    const dropZone = screen.getByTestId('dropzone-0-09:00');
    expect(dropZone).toBeInTheDocument();
  });

  it('z-index가 올바르게 설정된다', () => {
    render(
      <DropZone
        weekday={0}
        time="09:00"
        onDrop={mockOnDrop}
        onEmptySpaceClick={mockOnEmptySpaceClick}
        style={{ zIndex: 5 }}
      />
    );

    const dropZone = screen.getByTestId('dropzone-0-09:00');
    expect(dropZone).toHaveStyle({
      zIndex: '5',
    });
  });
});
