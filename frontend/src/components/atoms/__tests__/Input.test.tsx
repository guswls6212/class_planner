import { render, screen, fireEvent } from '@testing-library/react';
import Input from '../Input';

describe('Input', () => {
  const defaultProps = {
    placeholder: '테스트 입력',
    value: '',
    onChange: vi.fn(),
  };

  test('기본 렌더링이 올바르게 된다', () => {
    render(<Input {...defaultProps} />);

    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('placeholder', '테스트 입력');
    expect(input).toHaveValue('');
  });

  test('value prop이 올바르게 설정된다', () => {
    render(<Input {...defaultProps} value="테스트 값" />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('테스트 값');
  });

  test('onChange 이벤트가 올바르게 처리된다', () => {
    const mockOnChange = vi.fn();
    render(<Input {...defaultProps} onChange={mockOnChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '새로운 값' } });

    expect(mockOnChange).toHaveBeenCalledTimes(1);
  });

  test('placeholder가 올바르게 설정된다', () => {
    render(<Input {...defaultProps} placeholder="사용자 입력" />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('placeholder', '사용자 입력');
  });

  test('disabled 상태가 올바르게 적용된다', () => {
    render(<Input {...defaultProps} disabled />);

    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
  });

  test('className prop이 올바르게 적용된다', () => {
    render(<Input {...defaultProps} className="custom-class" />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('custom-class');
  });

  test('size prop이 올바르게 적용된다', () => {
    const { rerender } = render(<Input {...defaultProps} size="small" />);
    let input = screen.getByRole('textbox');
    expect(input).toHaveClass('small');

    rerender(<Input {...defaultProps} size="large" />);
    input = screen.getByRole('textbox');
    expect(input).toHaveClass('large');
  });

  test('error 상태가 올바르게 적용된다', () => {
    render(<Input {...defaultProps} error />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('error');
  });

  test('style prop이 올바르게 적용된다', () => {
    const customStyle = { backgroundColor: 'red' };
    render(<Input {...defaultProps} style={customStyle} />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveStyle('background-color: rgb(255, 0, 0)');
  });
});
