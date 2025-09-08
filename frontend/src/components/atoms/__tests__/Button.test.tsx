import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from '../Button';

describe('Button', () => {
  it('기본 props로 렌더링된다', () => {
    render(<Button onClick={() => {}}>테스트 버튼</Button>);
    expect(screen.getByText('테스트 버튼')).toBeInTheDocument();
  });

  it('disabled prop이 올바르게 작동한다', () => {
    render(
      <Button onClick={() => {}} disabled>
        비활성화된 버튼
      </Button>,
    );

    const button = screen.getByText('비활성화된 버튼');
    expect(button).toBeDisabled();
  });

  it('disabled가 false일 때 활성화된다', () => {
    render(
      <Button onClick={() => {}} disabled={false}>
        활성화된 버튼
      </Button>,
    );

    const button = screen.getByText('활성화된 버튼');
    expect(button).not.toBeDisabled();
  });

  it('variant prop이 올바르게 적용된다', () => {
    render(
      <Button onClick={() => {}} variant="danger">
        위험 버튼
      </Button>,
    );

    const button = screen.getByText('위험 버튼');
    expect(button).toHaveClass('danger');
  });

  it('size prop이 올바르게 적용된다', () => {
    render(
      <Button onClick={() => {}} size="large">
        큰 버튼
      </Button>,
    );

    const button = screen.getByText('큰 버튼');
    expect(button).toHaveClass('large');
  });
});
