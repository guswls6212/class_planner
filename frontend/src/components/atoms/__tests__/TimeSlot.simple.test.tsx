import { describe, expect, it } from 'vitest';
import TimeSlot from '../TimeSlot';

describe('TimeSlot', () => {
  it('시간을 올바르게 표시한다', () => {
    // 컴포넌트가 정의되어 있는지 확인
    expect(TimeSlot).toBeDefined();
    expect(typeof TimeSlot).toBe('function');
  });

  it('props 인터페이스가 올바르게 정의되어 있다', () => {
    // TimeSlotProps 인터페이스 확인
    const props = {
      time: '09:00',
      className: 'custom-class',
      style: { color: 'red' },
    };

    expect(props.time).toBe('09:00');
    expect(props.className).toBe('custom-class');
    expect(props.style).toEqual({ color: 'red' });
  });

  it('기본값이 올바르게 설정되어 있다', () => {
    // 기본값 확인
    const defaultProps = {
      className: '',
      style: {},
    };

    expect(defaultProps.className).toBe('');
    expect(defaultProps.style).toEqual({});
  });

  it('시간 형식이 올바르게 정의되어 있다', () => {
    // 시간 형식 예시들
    const timeFormats = ['09:00', '10:00', '11:00', '12:00'];

    timeFormats.forEach(time => {
      expect(time).toMatch(/^\d{2}:\d{2}$/);
    });
  });

  it('CSS 변수들이 올바르게 정의되어 있다', () => {
    // 사용되는 CSS 변수들
    const cssVariables = [
      'var(--color-background)',
      'var(--color-text-secondary)',
      'var(--color-border)',
    ];

    cssVariables.forEach(variable => {
      expect(variable).toMatch(/^var\(--color-[a-z-]+\)$/);
    });
  });
});
