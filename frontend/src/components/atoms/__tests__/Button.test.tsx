import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import Button from '../Button';

describe('Button 컴포넌트', () => {
  const mockOnClick = vi.fn();

  beforeEach(() => {
    mockOnClick.mockClear();
  });

  test('기본 렌더링이 정상적으로 동작한다', () => {
    render(<Button onClick={mockOnClick}>테스트 버튼</Button>);

    const button = screen.getByRole('button', { name: '테스트 버튼' });
    expect(button).toBeInTheDocument();
    // CSS 모듈 해시를 고려하여 클래스 존재 여부만 확인
    expect(button.className).toContain('button');
    expect(button.className).toContain('medium');
    expect(button.className).toContain('primary');
  });

  test('클릭 이벤트가 정상적으로 동작한다', () => {
    render(<Button onClick={mockOnClick}>클릭 테스트</Button>);

    const button = screen.getByRole('button', { name: '클릭 테스트' });
    fireEvent.click(button);

    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  test('다양한 variant가 정상적으로 적용된다', () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>);
    expect(screen.getByRole('button').className).toContain('primary');

    rerender(<Button variant="secondary">Secondary</Button>);
    expect(screen.getByRole('button').className).toContain('secondary');

    rerender(<Button variant="danger">Danger</Button>);
    expect(screen.getByRole('button').className).toContain('danger');

    rerender(<Button variant="outline">Outline</Button>);
    expect(screen.getByRole('button').className).toContain('outline');
  });

  test('다양한 size가 정상적으로 적용된다', () => {
    const { rerender } = render(<Button size="small">Small</Button>);
    expect(screen.getByRole('button').className).toContain('small');

    rerender(<Button size="medium">Medium</Button>);
    expect(screen.getByRole('button').className).toContain('medium');

    rerender(<Button size="large">Large</Button>);
    expect(screen.getByRole('button').className).toContain('large');
  });

  test('disabled 상태가 정상적으로 동작한다', () => {
    render(
      <Button disabled onClick={mockOnClick}>
        Disabled
      </Button>
    );

    const button = screen.getByRole('button', { name: 'Disabled' });
    expect(button).toBeDisabled();

    fireEvent.click(button);
    expect(mockOnClick).not.toHaveBeenCalled();
  });

  test('loading 상태가 정상적으로 동작한다', () => {
    render(
      <Button loading onClick={mockOnClick}>
        Loading
      </Button>
    );

    const button = screen.getByRole('button', { name: 'Loading' });
    expect(button).toBeDisabled();
    expect(button.className).toContain('loading');

    fireEvent.click(button);
    expect(mockOnClick).not.toHaveBeenCalled();
  });

  test('아이콘이 정상적으로 렌더링된다', () => {
    const leftIcon = <span data-testid="left-icon">🚀</span>;
    const rightIcon = <span data-testid="right-icon">🚀</span>;

    render(
      <Button icon={leftIcon} iconPosition="left">
        Left Icon
      </Button>
    );
    const leftIconElement = screen.getByTestId('left-icon');
    expect(leftIconElement).toBeInTheDocument();
    expect(leftIconElement.textContent).toBe('🚀');

    render(
      <Button icon={rightIcon} iconPosition="right">
        Right Icon
      </Button>
    );
    const rightIconElement = screen.getByTestId('right-icon');
    expect(rightIconElement).toBeInTheDocument();
    expect(rightIconElement.textContent).toBe('🚀');
  });

  test('onClick이 없어도 정상적으로 렌더링된다', () => {
    render(<Button>No Click</Button>);

    const button = screen.getByRole('button', { name: 'No Click' });
    expect(button).toBeInTheDocument();

    // 클릭해도 에러가 발생하지 않아야 함
    expect(() => fireEvent.click(button)).not.toThrow();
  });
});
