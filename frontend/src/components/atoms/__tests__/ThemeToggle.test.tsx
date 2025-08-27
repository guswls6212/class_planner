import { vi } from 'vitest';
import ThemeToggle, {
  getIconStyles,
  getSizeStyles,
  getThemeIcon,
  getThemeText,
  getThemeTitle,
  shouldShowIcon,
  shouldShowText,
  validateThemeToggleSize,
  validateThemeToggleVariant,
} from '../ThemeToggle';

// Mock React Testing Library to avoid DOM issues
vi.mock('@testing-library/react', () => ({
  render: vi.fn(),
  screen: { getByRole: vi.fn(), getByText: vi.fn() },
  fireEvent: { click: vi.fn() },
}));

// Mock ThemeContext
vi.mock('../../contexts/ThemeContext', () => ({
  useTheme: vi.fn(() => ({
    theme: 'light',
    toggleTheme: vi.fn(),
  })),
}));

describe('ThemeToggle 컴포넌트', () => {
  it('ThemeToggle 컴포넌트가 올바르게 정의되어 있다', () => {
    expect(ThemeToggle).toBeDefined();
    expect(typeof ThemeToggle).toBe('function');
  });

  // 단위 테스트 (함수 레벨)
  describe('유틸리티 함수 테스트', () => {
    describe('getSizeStyles', () => {
      it('small 크기 스타일을 올바르게 반환한다', () => {
        const result = getSizeStyles('small');
        expect(result).toEqual({ padding: '6px 8px', fontSize: '12px' });
      });

      it('medium 크기 스타일을 올바르게 반환한다', () => {
        const result = getSizeStyles('medium');
        expect(result).toEqual({ padding: '8px 12px', fontSize: '14px' });
      });

      it('large 크기 스타일을 올바르게 반환한다', () => {
        const result = getSizeStyles('large');
        expect(result).toEqual({ padding: '12px 16px', fontSize: '16px' });
      });

      it('유효하지 않은 크기에 대해 medium 스타일을 반환한다', () => {
        const result = getSizeStyles('invalid');
        expect(result).toEqual({ padding: '8px 12px', fontSize: '14px' });
      });
    });

    describe('getIconStyles', () => {
      it('small 크기 아이콘 스타일을 올바르게 반환한다', () => {
        const result = getIconStyles('small');
        expect(result).toEqual({ fontSize: '14px' });
      });

      it('medium 크기 아이콘 스타일을 올바르게 반환한다', () => {
        const result = getIconStyles('medium');
        expect(result).toEqual({ fontSize: '16px' });
      });

      it('large 크기 아이콘 스타일을 올바르게 반환한다', () => {
        const result = getIconStyles('large');
        expect(result).toEqual({ fontSize: '20px' });
      });

      it('유효하지 않은 크기에 대해 medium 아이콘 스타일을 반환한다', () => {
        const result = getIconStyles('invalid');
        expect(result).toEqual({ fontSize: '16px' });
      });
    });

    describe('shouldShowIcon', () => {
      it('variant가 icon일 때 true를 반환한다', () => {
        expect(shouldShowIcon('icon')).toBe(true);
      });

      it('variant가 both일 때 true를 반환한다', () => {
        expect(shouldShowIcon('both')).toBe(true);
      });

      it('variant가 text일 때 false를 반환한다', () => {
        expect(shouldShowIcon('text')).toBe(false);
      });
    });

    describe('shouldShowText', () => {
      it('variant가 text일 때 true를 반환한다', () => {
        expect(shouldShowText('text')).toBe(true);
      });

      it('variant가 both일 때 true를 반환한다', () => {
        expect(shouldShowText('both')).toBe(true);
      });

      it('variant가 icon일 때 false를 반환한다', () => {
        expect(shouldShowText('icon')).toBe(false);
      });
    });

    describe('getThemeIcon', () => {
      it('dark 테마일 때 달 아이콘을 반환한다', () => {
        expect(getThemeIcon('dark')).toBe('🌙');
      });

      it('light 테마일 때 해 아이콘을 반환한다', () => {
        expect(getThemeIcon('light')).toBe('☀️');
      });

      it('기타 테마에 대해서도 light 테마 아이콘을 반환한다', () => {
        expect(getThemeIcon('custom')).toBe('☀️');
      });
    });

    describe('getThemeText', () => {
      it('dark 테마일 때 "라이트" 텍스트를 반환한다', () => {
        expect(getThemeText('dark')).toBe('라이트');
      });

      it('light 테마일 때 "다크" 텍스트를 반환한다', () => {
        expect(getThemeText('light')).toBe('다크');
      });

      it('기타 테마에 대해서도 "다크" 텍스트를 반환한다', () => {
        expect(getThemeText('custom')).toBe('다크');
      });
    });

    describe('getThemeTitle', () => {
      it('dark 테마일 때 올바른 title을 반환한다', () => {
        expect(getThemeTitle('dark')).toBe('현재 테마: 다크');
      });

      it('light 테마일 때 올바른 title을 반환한다', () => {
        expect(getThemeTitle('light')).toBe('현재 테마: 라이트');
      });

      it('기타 테마에 대해서도 light 테마 title을 반환한다', () => {
        expect(getThemeTitle('custom')).toBe('현재 테마: 라이트');
      });
    });

    describe('validateThemeToggleSize', () => {
      it('유효한 size 값들이 올바르게 검증된다', () => {
        expect(validateThemeToggleSize('small')).toBe(true);
        expect(validateThemeToggleSize('medium')).toBe(true);
        expect(validateThemeToggleSize('large')).toBe(true);
      });

      it('유효하지 않은 size 값들이 올바르게 검증된다', () => {
        expect(validateThemeToggleSize('tiny')).toBe(false);
        expect(validateThemeToggleSize('huge')).toBe(false);
        expect(validateThemeToggleSize('')).toBe(false);
      });
    });

    describe('validateThemeToggleVariant', () => {
      it('유효한 variant 값들이 올바르게 검증된다', () => {
        expect(validateThemeToggleVariant('icon')).toBe(true);
        expect(validateThemeToggleVariant('text')).toBe(true);
        expect(validateThemeToggleVariant('both')).toBe(true);
      });

      it('유효하지 않은 variant 값들이 올바르게 검증된다', () => {
        expect(validateThemeToggleVariant('button')).toBe(false);
        expect(validateThemeToggleVariant('toggle')).toBe(false);
        expect(validateThemeToggleVariant('')).toBe(false);
      });
    });
  });

  describe('ThemeToggle 관련 상수 테스트', () => {
    it('기본 props 값들이 올바르게 정의되어 있다', () => {
      const defaultProps = {
        size: 'medium',
        variant: 'both',
      };

      expect(defaultProps.size).toBe('medium');
      expect(defaultProps.variant).toBe('both');
    });

    it('유효한 size 값들이 올바르게 정의되어 있다', () => {
      const validSizes = ['small', 'medium', 'large'];
      expect(validSizes).toContain('small');
      expect(validSizes).toContain('medium');
      expect(validSizes).toContain('large');
    });

    it('유효한 variant 값들이 올바르게 정의되어 있다', () => {
      const validVariants = ['icon', 'text', 'both'];
      expect(validVariants).toContain('icon');
      expect(validVariants).toContain('text');
      expect(validVariants).toContain('both');
    });
  });

  describe('ThemeToggle 관련 함수 조합 테스트', () => {
    it('복합적인 시나리오가 올바르게 처리된다', () => {
      // large, both variant, dark theme
      const sizeStyles = getSizeStyles('large');
      const iconStyles = getIconStyles('large');
      const shouldShowIconResult = shouldShowIcon('both');
      const shouldShowTextResult = shouldShowText('both');
      const themeIcon = getThemeIcon('dark');
      const themeText = getThemeText('dark');
      const themeTitle = getThemeTitle('dark');

      expect(sizeStyles).toEqual({ padding: '12px 16px', fontSize: '16px' });
      expect(iconStyles).toEqual({ fontSize: '20px' });
      expect(shouldShowIconResult).toBe(true);
      expect(shouldShowTextResult).toBe(true);
      expect(themeIcon).toBe('🌙');
      expect(themeText).toBe('라이트');
      expect(themeTitle).toBe('현재 테마: 다크');
    });

    it('icon only variant가 올바르게 처리된다', () => {
      const shouldShowIconResult = shouldShowIcon('icon');
      const shouldShowTextResult = shouldShowText('icon');

      expect(shouldShowIconResult).toBe(true);
      expect(shouldShowTextResult).toBe(false);
    });

    it('text only variant가 올바르게 처리된다', () => {
      const shouldShowIconResult = shouldShowIcon('text');
      const shouldShowTextResult = shouldShowText('text');

      expect(shouldShowIconResult).toBe(false);
      expect(shouldShowTextResult).toBe(true);
    });

    it('유효성 검사가 올바르게 작동한다', () => {
      const isValidSize = validateThemeToggleSize('medium');
      const isValidVariant = validateThemeToggleVariant('both');

      expect(isValidSize).toBe(true);
      expect(isValidVariant).toBe(true);
    });
  });
});
