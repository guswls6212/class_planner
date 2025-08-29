import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DropZone from '../DropZone';

describe('DropZone', () => {
  const defaultProps = {
    weekday: 0,
    time: '09:00',
    onDrop: vi.fn(),
    onEmptySpaceClick: vi.fn(),
  };

  it('기본 props로 렌더링된다', () => {
    render(<DropZone {...defaultProps} />);
    const dropZone = screen.getByTestId('dropzone-0-09:00');
    expect(dropZone).toBeInTheDocument();
  });

  it('드래그 오버 상태를 올바르게 관리한다', () => {
    render(<DropZone {...defaultProps} />);
    const dropZone = screen.getByTestId('dropzone-0-09:00');

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
    });
  });

  it('드롭 이벤트를 올바르게 처리한다', () => {
    render(<DropZone {...defaultProps} />);
    const dropZone = screen.getByTestId('dropzone-0-09:00');

    // Mock dataTransfer
    const mockDataTransfer = {
      getData: vi.fn().mockReturnValue('test-enrollment-id'),
    };

    fireEvent.drop(dropZone, { dataTransfer: mockDataTransfer });
    expect(defaultProps.onDrop).toHaveBeenCalledWith(
      0,
      '09:00',
      'test-enrollment-id'
    );
  });

  it('드래그 오버 이벤트를 올바르게 처리한다', () => {
    render(<DropZone {...defaultProps} />);
    const dropZone = screen.getByTestId('dropzone-0-09:00');

    fireEvent.dragOver(dropZone);
    // dragOver는 preventDefault만 호출하므로 특별한 동작 없음
    expect(dropZone).toBeInTheDocument();
  });

  it('드래그 엔터 이벤트를 올바르게 처리한다', () => {
    render(<DropZone {...defaultProps} />);
    const dropZone = screen.getByTestId('dropzone-0-09:00');

    fireEvent.dragEnter(dropZone);
    expect(dropZone).toHaveStyle({
      border: '2px dashed var(--color-primary)',
      backgroundColor: 'rgba(var(--color-primary-rgb), 0.1)',
    });
  });

  it('드래그 리브 이벤트를 올바르게 처리한다', () => {
    render(<DropZone {...defaultProps} />);
    const dropZone = screen.getByTestId('dropzone-0-09:00');

    // 먼저 드래그 엔터로 상태 변경
    fireEvent.dragEnter(dropZone);
    // 그 다음 드래그 리브
    fireEvent.dragLeave(dropZone);
    expect(dropZone).toHaveStyle({
      border: '1px dashed transparent',
    });
  });

  it('클릭 이벤트를 올바르게 처리한다', () => {
    render(<DropZone {...defaultProps} />);
    const dropZone = screen.getByTestId('dropzone-0-09:00');

    fireEvent.click(dropZone);
    expect(defaultProps.onEmptySpaceClick).toHaveBeenCalledWith(0, '09:00');
  });

  it('기본 스타일 속성들을 올바르게 적용한다', () => {
    render(<DropZone {...defaultProps} />);
    const dropZone = screen.getByTestId('dropzone-0-09:00');

    expect(dropZone).toHaveStyle({
      border: '1px dashed transparent',
      cursor: 'pointer',
    });
  });

  it('드래그 오버 시 시각적 피드백을 제공한다', () => {
    render(<DropZone {...defaultProps} />);
    const dropZone = screen.getByTestId('dropzone-0-09:00');

    // 초기 상태
    expect(dropZone).toHaveStyle({
      border: '1px dashed transparent',
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
    const dropZone = screen.getByTestId('dropzone-0-09:00');

    // 드래그 엔터 → 드래그 오버 → 드롭
    fireEvent.dragEnter(dropZone);
    fireEvent.dragOver(dropZone);

    const mockDataTransfer = {
      getData: vi.fn().mockReturnValue('test-enrollment-id'),
    };
    fireEvent.drop(dropZone, { dataTransfer: mockDataTransfer });

    expect(defaultProps.onDrop).toHaveBeenCalledWith(
      0,
      '09:00',
      'test-enrollment-id'
    );
  });

  it('다양한 weekday 값에 대해 올바른 data-testid를 생성한다', () => {
    const testCases = [
      { weekday: 0, time: '09:00', expectedTestId: 'dropzone-0-09:00' },
      { weekday: 1, time: '10:00', expectedTestId: 'dropzone-1-10:00' },
      { weekday: 5, time: '14:00', expectedTestId: 'dropzone-5-14:00' },
    ];

    testCases.forEach(({ weekday, time, expectedTestId }) => {
      const { unmount } = render(
        <DropZone
          weekday={weekday}
          time={time}
          onDrop={vi.fn()}
          onEmptySpaceClick={vi.fn()}
        />
      );

      const dropZone = screen.getByTestId(expectedTestId);
      expect(dropZone).toBeInTheDocument();

      unmount();
    });
  });

  it('커스텀 스타일을 올바르게 적용한다', () => {
    const customStyle = { backgroundColor: 'red', width: '200px' };
    render(<DropZone {...defaultProps} style={customStyle} />);
    const dropZone = screen.getByTestId('dropzone-0-09:00');

    // 디버깅을 위해 실제 스타일 출력
    console.log('Actual styles:', dropZone.style.cssText);
    console.log('Expected backgroundColor: red, width: 200px');

    expect(dropZone).toHaveStyle({
      'background-color': 'rgb(255, 0, 0)',
      width: '200px',
    });
  });
});
