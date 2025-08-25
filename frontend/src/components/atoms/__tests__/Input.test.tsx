import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import Input from '../Input';

describe('Input 컴포넌트', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  test('기본 렌더링이 정상적으로 동작한다', () => {
    render(<Input value="테스트 값" onChange={mockOnChange} />);

    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue('테스트 값');
    expect(input.className).toContain('input');
    expect(input.className).toContain('medium');
  });

  test('다양한 type이 정상적으로 적용된다', () => {
    const { rerender } = render(
      <Input type="text" value="" onChange={mockOnChange} />
    );
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'text');

    rerender(<Input type="email" value="" onChange={mockOnChange} />);
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email');

    rerender(<Input type="password" value="" onChange={mockOnChange} />);
    // password 타입은 textbox 역할이 아님, input 요소로 직접 확인
    const passwordInput = screen.getByDisplayValue('');
    expect(passwordInput).toHaveAttribute('type', 'password');

    rerender(<Input type="number" value="" onChange={mockOnChange} />);
    expect(screen.getByRole('spinbutton')).toHaveAttribute('type', 'number');
  });

  test('다양한 size가 정상적으로 적용된다', () => {
    const { rerender } = render(
      <Input size="small" value="" onChange={mockOnChange} />
    );
    expect(screen.getByRole('textbox').className).toContain('small');

    rerender(<Input size="medium" value="" onChange={mockOnChange} />);
    expect(screen.getByRole('textbox').className).toContain('medium');

    rerender(<Input size="large" value="" onChange={mockOnChange} />);
    expect(screen.getByRole('textbox').className).toContain('large');
  });

  test('placeholder가 정상적으로 표시된다', () => {
    render(
      <Input placeholder="입력해주세요" value="" onChange={mockOnChange} />
    );

    const input = screen.getByPlaceholderText('입력해주세요');
    expect(input).toBeInTheDocument();
  });

  test('onChange 이벤트가 정상적으로 동작한다', () => {
    render(<Input value="" onChange={mockOnChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '새로운 값' } });

    expect(mockOnChange).toHaveBeenCalledWith('새로운 값');
  });

  test('disabled 상태가 정상적으로 동작한다', () => {
    render(<Input disabled value="" onChange={mockOnChange} />);

    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();

    fireEvent.change(input, { target: { value: '변경 시도' } });
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  test('error 상태가 정상적으로 표시된다', () => {
    render(<Input error="에러 메시지" value="" onChange={mockOnChange} />);

    const input = screen.getByRole('textbox');
    expect(input.className).toContain('error');

    const errorMessage = screen.getByText('에러 메시지');
    expect(errorMessage).toBeInTheDocument();
    expect(errorMessage.className).toContain('errorMessage');
  });

  test('search 타입이 정상적으로 적용된다', () => {
    render(<Input type="search" value="" onChange={mockOnChange} />);

    const input = screen.getByRole('searchbox');
    expect(input.className).toContain('search');
  });

  test('아이콘이 정상적으로 렌더링된다', () => {
    const icon = <span data-testid="icon">🔍</span>;

    render(<Input icon={icon} value="" onChange={mockOnChange} />);

    const iconElement = screen.getByTestId('icon');
    expect(iconElement).toBeInTheDocument();
    // 아이콘이 렌더링되고 내용이 제대로 표시되는지만 확인
    expect(iconElement.textContent).toBe('🔍');
  });

  test('className이 정상적으로 적용된다', () => {
    render(<Input className="custom-class" value="" onChange={mockOnChange} />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('custom-class');
  });

  test('value 변경이 정상적으로 반영된다', () => {
    const { rerender } = render(
      <Input value="초기값" onChange={mockOnChange} />
    );

    let input = screen.getByRole('textbox');
    expect(input).toHaveValue('초기값');

    rerender(<Input value="변경된값" onChange={mockOnChange} />);
    input = screen.getByRole('textbox');
    expect(input).toHaveValue('변경된값');
  });
});
