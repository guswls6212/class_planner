import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import ThemeToggle from '../ThemeToggle';

// ThemeContext 모킹
vi.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'light',
    toggleTheme: vi.fn(),
  }),
}));

describe('ThemeToggle', () => {
  it('기본적으로 렌더링된다', () => {
    render(<ThemeToggle />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('라이트 테마일 때 태양 아이콘과 다크 텍스트를 표시한다', () => {
    render(<ThemeToggle />);

    expect(screen.getByText('☀️')).toBeInTheDocument();
    expect(screen.getByText('다크')).toBeInTheDocument();
  });

  it('size 속성을 올바르게 적용한다', () => {
    const { rerender } = render(<ThemeToggle size="small" />);
    let button = screen.getByRole('button');
    expect(button).toHaveStyle({ padding: '6px 8px', fontSize: '12px' });

    rerender(<ThemeToggle size="large" />);
    button = screen.getByRole('button');
    expect(button).toHaveStyle({ padding: '12px 16px', fontSize: '16px' });
  });

  it('variant가 icon일 때 텍스트를 표시하지 않는다', () => {
    render(<ThemeToggle variant="icon" />);

    expect(screen.getByText('☀️')).toBeInTheDocument();
    expect(screen.queryByText('다크')).not.toBeInTheDocument();
  });

  it('variant가 text일 때 아이콘을 표시하지 않는다', () => {
    render(<ThemeToggle variant="text" />);

    expect(screen.queryByText('☀️')).not.toBeInTheDocument();
    expect(screen.getByText('다크')).toBeInTheDocument();
  });

  it('variant가 both일 때 아이콘과 텍스트를 모두 표시한다', () => {
    render(<ThemeToggle variant="both" />);

    expect(screen.getByText('☀️')).toBeInTheDocument();
    expect(screen.getByText('다크')).toBeInTheDocument();
  });

  it('올바른 title 속성을 가진다', () => {
    render(<ThemeToggle />);
    expect(screen.getByRole('button')).toHaveAttribute(
      'title',
      '현재 테마: 라이트'
    );
  });

  it('아이콘 크기가 size에 따라 달라진다', () => {
    const { rerender } = render(<ThemeToggle size="small" variant="icon" />);
    let icon = screen.getByText('☀️');
    expect(icon).toHaveStyle({ fontSize: '14px' });

    rerender(<ThemeToggle size="large" variant="icon" />);
    icon = screen.getByText('☀️');
    expect(icon).toHaveStyle({ fontSize: '20px' });
  });
});
