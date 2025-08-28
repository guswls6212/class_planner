import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import TimeSlot from '../TimeSlot';

describe('TimeSlot', () => {
  it('시간을 올바르게 표시한다', () => {
    render(<TimeSlot time="09:00" />);
    expect(screen.getByText('09:00')).toBeInTheDocument();
  });

  it('기본 스타일 클래스를 적용한다', () => {
    render(<TimeSlot time="10:00" />);
    const timeSlot = screen.getByText('10:00');
    expect(timeSlot).toHaveClass('time-slot');
  });

  it('커스텀 className을 적용한다', () => {
    render(<TimeSlot time="11:00" className="custom-class" />);
    const timeSlot = screen.getByText('11:00');
    expect(timeSlot).toHaveClass('time-slot', 'custom-class');
  });

  it('커스텀 스타일을 적용한다', () => {
    const customStyle = { backgroundColor: 'red' };
    render(<TimeSlot time="12:00" style={customStyle} />);
    const timeSlot = screen.getByText('12:00');
    expect(timeSlot).toHaveStyle('background-color: rgb(255, 0, 0)');
  });

  it('기본 스타일 속성들을 올바르게 적용한다', () => {
    render(<TimeSlot time="13:00" />);

    const timeSlot = screen.getByText('13:00');

    // 기본 스타일 속성들을 확인
    expect(timeSlot).toHaveStyle({
      textAlign: 'center',
      fontSize: '12px',
      display: 'flex',
      padding: '8px',
      minHeight: '60px',
    });
  });
});
