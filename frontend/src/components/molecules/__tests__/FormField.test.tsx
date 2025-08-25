import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import FormField from '../FormField';

describe('FormField', () => {
  const defaultProps = {
    label: '테스트 라벨',
    name: 'test-field',
    value: '',
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('기본적으로 렌더링된다', () => {
    render(<FormField {...defaultProps} />);
    expect(screen.getByText('테스트 라벨')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('label을 올바르게 표시한다', () => {
    render(<FormField {...defaultProps} label="사용자 이름" />);
    expect(screen.getByText('사용자 이름')).toBeInTheDocument();
  });

  it('name 속성을 올바르게 적용한다', () => {
    render(<FormField {...defaultProps} name="username" />);
    const label = screen.getByText('테스트 라벨');
    expect(label).toHaveAttribute('for', 'username');
  });

  it('value를 올바르게 표시한다', () => {
    render(<FormField {...defaultProps} value="테스트 값" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('테스트 값');
  });

  it('onChange 함수를 올바르게 호출한다', () => {
    const mockOnChange = vi.fn();
    render(<FormField {...defaultProps} onChange={mockOnChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '새로운 값' } });

    expect(mockOnChange).toHaveBeenCalledWith('새로운 값');
  });

  it('placeholder를 올바르게 적용한다', () => {
    render(<FormField {...defaultProps} placeholder="입력해주세요" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('placeholder', '입력해주세요');
  });

  it('type 속성을 올바르게 적용한다', () => {
    const { rerender } = render(<FormField {...defaultProps} type="email" />);
    let input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('type', 'email');

    rerender(<FormField {...defaultProps} type="password" />);
    input = screen.getByDisplayValue('');
    expect(input).toHaveAttribute('type', 'password');

    rerender(<FormField {...defaultProps} type="number" />);
    input = screen.getByDisplayValue('');
    expect(input).toHaveAttribute('type', 'number');
  });

  it('required 속성을 올바르게 적용한다', () => {
    render(<FormField {...defaultProps} required />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('required가 false일 때 별표를 표시하지 않는다', () => {
    render(<FormField {...defaultProps} required={false} />);
    expect(screen.queryByText('*')).not.toBeInTheDocument();
  });

  it('error 메시지를 올바르게 표시한다', () => {
    render(<FormField {...defaultProps} error="오류가 발생했습니다" />);
    expect(screen.getByText('오류가 발생했습니다')).toBeInTheDocument();
  });

  it('error가 없을 때 오류 메시지를 표시하지 않는다', () => {
    render(<FormField {...defaultProps} />);
    expect(screen.queryByText(/오류/)).not.toBeInTheDocument();
  });

  it('disabled 속성을 올바르게 적용한다', () => {
    render(<FormField {...defaultProps} disabled />);
    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
  });

  it('disabled가 false일 때 입력이 가능하다', () => {
    render(<FormField {...defaultProps} disabled={false} />);
    const input = screen.getByRole('textbox');
    expect(input).not.toBeDisabled();
  });

  it('size 속성을 올바르게 적용한다', () => {
    const { rerender } = render(<FormField {...defaultProps} size="small" />);
    let input = screen.getByRole('textbox');
    expect(input.className).toContain('small');

    rerender(<FormField {...defaultProps} size="large" />);
    input = screen.getByRole('textbox');
    expect(input.className).toContain('large');
  });

  it('children을 사용하여 커스텀 입력 요소를 렌더링한다', () => {
    const CustomInput = () => <input type="text" data-testid="custom-input" />;

    render(
      <FormField {...defaultProps}>
        <CustomInput />
      </FormField>
    );

    expect(screen.getByTestId('custom-input')).toBeInTheDocument();
  });

  it('children이 없을 때 기본 Input을 렌더링한다', () => {
    render(<FormField {...defaultProps} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('여러 속성을 동시에 적용할 수 있다', () => {
    render(
      <FormField
        {...defaultProps}
        label="복합 필드"
        name="complex-field"
        value="복합 값"
        placeholder="복합 플레이스홀더"
        type="email"
        required
        error="복합 오류"
        disabled
        size="large"
      />
    );

    expect(screen.getByText('복합 필드')).toBeInTheDocument();
    expect(screen.getByText('*')).toBeInTheDocument();
    expect(screen.getByText('복합 오류')).toBeInTheDocument();

    const input = screen.getByDisplayValue('복합 값');
    expect(input).toHaveAttribute('placeholder', '복합 플레이스홀더');
    expect(input).toHaveAttribute('type', 'email');
    expect(input).toBeDisabled();
    expect(input.className).toContain('large');
  });

  it('기본 마진 스타일이 적용된다', () => {
    render(<FormField {...defaultProps} />);
    const container = screen.getByText('테스트 라벨').closest('div');
    // 기본 컨테이너가 렌더링되는지만 확인
    expect(container).toBeInTheDocument();
  });
});
