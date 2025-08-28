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
    expect(header).toHaveStyle('color: rgb(255, 0, 0)');
  });

  it('기본 스타일 속성들을 올바르게 적용한다', () => {
    render(<WeekdayHeader weekday={4} />);
    const header = screen.getByText('목');

    // 기본 스타일 속성들을 확인
    expect(header).toHaveStyle({
      textAlign: 'center',
      fontWeight: 'bold',
      fontSize: '14px',
      display: 'flex',
      minHeight: '60px',
      padding: '12px 8px',
    });
  });

  it('잘못된 요일 인덱스에 대해 적절히 처리한다', () => {
    // 잘못된 요일 인덱스로 렌더링 시도
    expect(() => {
      render(<WeekdayHeader weekday={7} />);
    }).toThrow('Invalid weekday index: 7. Must be between 0 and 6.');

    // 음수 요일 인덱스로 렌더링 시도
    expect(() => {
      render(<WeekdayHeader weekday={-1} />);
    }).toThrow('Invalid weekday index: -1. Must be between 0 and 6.');
  });
});
