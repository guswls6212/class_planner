import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import WeekdayHeader from '../WeekdayHeader';

describe('WeekdayHeader 렌더링 테스트', () => {
  it('요일을 올바르게 렌더링한다', () => {
    render(<WeekdayHeader weekday={0} />);
    expect(screen.getByText('일')).toBeInTheDocument();
  });

  it('다른 요일들을 올바르게 렌더링한다', () => {
    const weekdays = [
      { index: 1, name: '월' },
      { index: 2, name: '화' },
      { index: 3, name: '수' },
      { index: 4, name: '목' },
      { index: 5, name: '금' },
      { index: 6, name: '토' },
    ];

    weekdays.forEach(({ index, name }) => {
      const { unmount } = render(<WeekdayHeader weekday={index} />);
      expect(screen.getByText(name)).toBeInTheDocument();
      unmount();
    });
  });

  it('커스텀 className을 적용한다', () => {
    render(<WeekdayHeader weekday={0} className="custom-header" />);
    const header = screen.getByText('일');
    expect(header).toHaveClass('weekday-header', 'custom-header');
  });

  it('커스텀 스타일을 적용한다', () => {
    const customStyle = { color: 'blue' };
    render(<WeekdayHeader weekday={0} style={customStyle} />);
    const header = screen.getByText('일');
    expect(header).toHaveStyle('color: rgb(0, 0, 255)');
  });

  it('기본 스타일 속성들을 올바르게 적용한다', () => {
    render(<WeekdayHeader weekday={0} />);
    const header = screen.getByText('일');

    // 기본 스타일 확인
    expect(header).toHaveStyle({
      textAlign: 'center',
      fontWeight: 'bold',
      fontSize: '14px',
    });
  });

  it('잘못된 요일 인덱스에 대해 에러를 처리한다', () => {
    // 잘못된 인덱스로 렌더링 시도
    expect(() => render(<WeekdayHeader weekday={7} />)).toThrow();
  });
});
