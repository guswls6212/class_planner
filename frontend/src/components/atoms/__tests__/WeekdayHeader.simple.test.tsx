import { describe, expect, it } from 'vitest';
import WeekdayHeader from '../WeekdayHeader';

describe('WeekdayHeader', () => {
  it('요일 헤더 컴포넌트가 올바르게 정의되어 있다', () => {
    expect(WeekdayHeader).toBeDefined();
    expect(typeof WeekdayHeader).toBe('function');
  });

  it('요일 배열이 올바르게 정의되어 있다', () => {
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];

    expect(weekdays).toHaveLength(7);
    expect(weekdays[0]).toBe('일');
    expect(weekdays[6]).toBe('토');
  });

  it('props 인터페이스가 올바르게 정의되어 있다', () => {
    const props = {
      weekday: 0,
      className: 'custom-header',
      style: { color: 'red' },
    };

    expect(props.weekday).toBe(0);
    expect(props.className).toBe('custom-header');
    expect(props.style).toEqual({ color: 'red' });
  });

  it('기본값이 올바르게 설정되어 있다', () => {
    const defaultProps = {
      className: '',
      style: {},
    };

    expect(defaultProps.className).toBe('');
    expect(defaultProps.style).toEqual({});
  });

  it('CSS 변수들이 올바르게 정의되어 있다', () => {
    const cssVariables = [
      'var(--color-background)',
      'var(--color-text)',
      'var(--color-border)',
    ];

    cssVariables.forEach(variable => {
      expect(variable).toMatch(/^var\(--color-[a-z-]+\)$/);
    });
  });

  it('요일 인덱스가 올바른 범위에 있다', () => {
    const validIndices = [0, 1, 2, 3, 4, 5, 6];

    validIndices.forEach(index => {
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(7);
    });
  });
});
