import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import TimeSlot from '../TimeSlot';

describe('TimeSlot 렌더링 테스트', () => {
  it('시간을 올바르게 렌더링한다', () => {
    render(<TimeSlot time="09:00" />);
    expect(screen.getByText('09:00')).toBeInTheDocument();
  });

  it('커스텀 className을 적용한다', () => {
    render(<TimeSlot time="10:00" className="custom-time" />);
    const timeSlot = screen.getByText('10:00');
    expect(timeSlot).toHaveClass('time-slot', 'custom-time');
  });

  it('커스텀 스타일을 적용한다', () => {
    const customStyle = { backgroundColor: 'red' };
    render(<TimeSlot time="11:00" style={customStyle} />);
    const timeSlot = screen.getByText('11:00');
    expect(timeSlot).toHaveStyle('background-color: rgb(255, 0, 0)');
  });

  it('기본 스타일 속성들을 올바르게 적용한다', () => {
    render(<TimeSlot time="12:00" />);
    const timeSlot = screen.getByText('12:00');

    // 기본 스타일 확인
    expect(timeSlot).toHaveStyle({
      textAlign: 'center',
      fontSize: '12px',
      minHeight: '60px',
    });
  });

  it('여러 시간 슬롯을 올바르게 렌더링한다', () => {
    const times = ['09:00', '10:00', '11:00', '12:00'];

    times.forEach(time => {
      const { unmount } = render(<TimeSlot time={time} />);
      expect(screen.getByText(time)).toBeInTheDocument();
      unmount();
    });
  });
});
