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
    expect(timeSlot).toHaveStyle('background-color: red');
  });

  it('기본 스타일 속성들을 올바르게 적용한다', () => {
    render(<TimeSlot time="13:00" />);
    const timeSlot = screen.getByText('13:00');

    expect(timeSlot).toHaveStyle({
      backgroundColor: 'var(--color-background)',
      textAlign: 'center',
      fontSize: '12px',
      color: 'var(--color-text-secondary)',
      border: '1px solid var(--color-border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60px',
    });
  });
});
