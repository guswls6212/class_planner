import { render, screen } from '@testing-library/react';
import FormField from '../FormField';

describe('FormField', () => {
  const defaultProps = {
    label: '테스트 라벨',
    name: 'test-field',
    value: '',
    onChange: () => {},
    children: <input type="text" data-testid="test-input" />,
  };

  test('기본 렌더링이 올바르게 된다', () => {
    render(<FormField {...defaultProps} />);

    expect(screen.getByText('테스트 라벨')).toBeInTheDocument();
    expect(screen.getByTestId('test-input')).toBeInTheDocument();
  });

  test('required prop이 올바르게 표시된다', () => {
    render(<FormField {...defaultProps} required />);

    const requiredSpan = screen.getByText('*');
    expect(requiredSpan).toBeInTheDocument();
    expect(requiredSpan).toHaveClass('required');
  });

  test('required prop이 없을 때 별표가 표시되지 않는다', () => {
    render(<FormField {...defaultProps} />);

    const requiredSpan = screen.queryByText('*');
    expect(requiredSpan).not.toBeInTheDocument();
  });

  test('다양한 라벨 텍스트를 올바르게 표시한다', () => {
    const { rerender } = render(<FormField {...defaultProps} />);
    expect(screen.getByText('테스트 라벨')).toBeInTheDocument();

    rerender(<FormField {...defaultProps} label="학생 이름" />);
    expect(screen.getByText('학생 이름')).toBeInTheDocument();

    rerender(<FormField {...defaultProps} label="과목 선택" />);
    expect(screen.getByText('과목 선택')).toBeInTheDocument();
  });

  test('children이 올바르게 렌더링된다', () => {
    const customChildren = (
      <div data-testid="custom-children">
        <input type="email" placeholder="이메일 입력" />
        <button type="submit">제출</button>
      </div>
    );

    render(<FormField {...defaultProps} children={customChildren} />);

    expect(screen.getByTestId('custom-children')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('이메일 입력')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '제출' })).toBeInTheDocument();
  });

  test('FormField이 올바른 구조로 렌더링된다', () => {
    render(<FormField {...defaultProps} />);

    const formField = screen.getByText('테스트 라벨').closest('div');
    expect(formField).toBeInTheDocument();
    expect(formField).toBeInstanceOf(HTMLDivElement);
  });
});
