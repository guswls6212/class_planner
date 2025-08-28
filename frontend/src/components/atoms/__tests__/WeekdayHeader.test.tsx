import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import WeekdayHeader from '../WeekdayHeader';

describe('WeekdayHeader', () => {
  it('요일을 올바르게 표시한다', () => {
    render(<WeekdayHeader weekday={0} />);
    expect(screen.getByText('일')).toBeInTheDocument();
  });

  it('모든 요일을 올바르게 표시한다', () => {
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];

    weekdays.forEach((day, index) => {
      const { unmount } = render(<WeekdayHeader weekday={index} />);
      expect(screen.getByText(day)).toBeInTheDocument();
      unmount();
    });
  });

  it('기본 스타일 클래스를 적용한다', () => {
    render(<WeekdayHeader weekday={1} />);
    const header = screen.getByText('월');
    expect(header).toHaveClass('weekday-header');
  });

  it('커스텀 className을 적용한다', () => {
    render(<WeekdayHeader weekday={2} className="custom-header" />);
    const header = screen.getByText('화');
    expect(header).toHaveClass('weekday-header', 'custom-header');
  });

  it('커스텀 스타일을 적용한다', () => {
    const customStyle = { color: 'red' };
    render(<WeekdayHeader weekday={3} style={customStyle} />);
    const header = screen.getByText('수');
    expect(header).toHaveStyle('color: red');
  });

  it('기본 스타일 속성들을 올바르게 적용한다', () => {
    render(<WeekdayHeader weekday={4} />);
    const header = screen.getByText('목');

    expect(header).toHaveStyle({
      backgroundColor: 'var(--color-background)',
      textAlign: 'center',
      fontWeight: 'bold',
      fontSize: '14px',
      color: 'var(--color-text)',
      border: '1px solid var(--color-border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60px',
    });
  });

  it('잘못된 요일 인덱스에 대해 적절히 처리한다', () => {
    render(<WeekdayHeader weekday={7} />);
    // 7은 배열 범위를 벗어나므로 undefined가 표시될 수 있음
    expect(screen.getByText('')).toBeInTheDocument();
  });
});
