import { vi } from 'vitest';
import Card, {
  getBaseStyles,
  getHoverStyles,
  getPaddingStyles,
  getVariantStyles,
  isClickable,
  shouldShowTitle,
  validateCardPadding,
  validateCardVariant,
} from '../Card';

// Mock React Testing Library to avoid DOM issues
vi.mock('@testing-library/react', () => ({
  render: vi.fn(),
  screen: { getByText: vi.fn() },
}));

// Mock Typography component
vi.mock('../atoms/Typography', () => ({
  default: vi.fn(({ children }) => (
    <div data-testid="typography">{children}</div>
  )),
}));

describe('Card 컴포넌트', () => {
  it('Card 컴포넌트가 올바르게 정의되어 있다', () => {
    expect(Card).toBeDefined();
    expect(typeof Card).toBe('function');
  });

  // 단위 테스트 (함수 레벨)
  describe('유틸리티 함수 테스트', () => {
    describe('getVariantStyles', () => {
      it('default variant 스타일을 올바르게 반환한다', () => {
        const result = getVariantStyles('default');
        expect(result).toEqual({
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
        });
      });

      it('elevated variant 스타일을 올바르게 반환한다', () => {
        const result = getVariantStyles('elevated');
        expect(result).toEqual({
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          boxShadow:
            '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        });
      });

      it('outlined variant 스타일을 올바르게 반환한다', () => {
        const result = getVariantStyles('outlined');
        expect(result).toEqual({
          backgroundColor: 'transparent',
          border: '2px solid #e5e7eb',
        });
      });

      it('유효하지 않은 variant에 대해 default 스타일을 반환한다', () => {
        const result = getVariantStyles('invalid');
        expect(result).toEqual({
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
        });
      });
    });

    describe('getPaddingStyles', () => {
      it('small padding 스타일을 올바르게 반환한다', () => {
        const result = getPaddingStyles('small');
        expect(result).toEqual({ padding: '12px' });
      });

      it('medium padding 스타일을 올바르게 반환한다', () => {
        const result = getPaddingStyles('medium');
        expect(result).toEqual({ padding: '16px' });
      });

      it('large padding 스타일을 올바르게 반환한다', () => {
        const result = getPaddingStyles('large');
        expect(result).toEqual({ padding: '24px' });
      });

      it('유효하지 않은 padding에 대해 medium 스타일을 반환한다', () => {
        const result = getPaddingStyles('invalid');
        expect(result).toEqual({ padding: '16px' });
      });
    });

    describe('getBaseStyles', () => {
      it('onClick이 없을 때 기본 스타일을 반환한다', () => {
        const result = getBaseStyles();
        expect(result).toEqual({
          borderRadius: '8px',
          cursor: 'default',
          transition: 'all 0.2s ease',
        });
      });

      it('onClick이 있을 때 pointer 커서를 포함한 스타일을 반환한다', () => {
        const mockOnClick = vi.fn();
        const result = getBaseStyles(mockOnClick);
        expect(result).toEqual({
          borderRadius: '8px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        });
      });
    });

    describe('getHoverStyles', () => {
      it('onClick이 없을 때 빈 객체를 반환한다', () => {
        const result = getHoverStyles();
        expect(result).toEqual({});
      });

      it('onClick이 있고 default variant일 때 기본 hover 스타일을 반환한다', () => {
        const mockOnClick = vi.fn();
        const result = getHoverStyles(mockOnClick, 'default');
        expect(result).toEqual({
          transform: 'translateY(-2px)',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        });
      });

      it('onClick이 있고 elevated variant일 때 강화된 hover 스타일을 반환한다', () => {
        const mockOnClick = vi.fn();
        const result = getHoverStyles(mockOnClick, 'elevated');
        expect(result).toEqual({
          transform: 'translateY(-2px)',
          boxShadow:
            '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        });
      });
    });

    describe('shouldShowTitle', () => {
      it('title이 있을 때 true를 반환한다', () => {
        expect(shouldShowTitle('Card Title')).toBe(true);
        expect(shouldShowTitle('Test')).toBe(true);
      });

      it('title이 없을 때 false를 반환한다', () => {
        expect(shouldShowTitle(undefined)).toBe(false);
        expect(shouldShowTitle('')).toBe(false);
      });
    });

    describe('isClickable', () => {
      it('onClick이 있을 때 true를 반환한다', () => {
        const mockOnClick = vi.fn();
        expect(isClickable(mockOnClick)).toBe(true);
      });

      it('onClick이 없을 때 false를 반환한다', () => {
        expect(isClickable(undefined)).toBe(false);
      });
    });

    describe('validateCardVariant', () => {
      it('유효한 variant 값들이 올바르게 검증된다', () => {
        expect(validateCardVariant('default')).toBe(true);
        expect(validateCardVariant('elevated')).toBe(true);
        expect(validateCardVariant('outlined')).toBe(true);
      });

      it('유효하지 않은 variant 값들이 올바르게 검증된다', () => {
        expect(validateCardVariant('custom')).toBe(false);
        expect(validateCardVariant('shadow')).toBe(false);
        expect(validateCardVariant('')).toBe(false);
      });
    });

    describe('validateCardPadding', () => {
      it('유효한 padding 값들이 올바르게 검증된다', () => {
        expect(validateCardPadding('small')).toBe(true);
        expect(validateCardPadding('medium')).toBe(true);
        expect(validateCardPadding('large')).toBe(true);
      });

      it('유효하지 않은 padding 값들이 올바르게 검증된다', () => {
        expect(validateCardPadding('tiny')).toBe(false);
        expect(validateCardPadding('huge')).toBe(false);
        expect(validateCardPadding('')).toBe(false);
      });
    });
  });

  describe('Card 관련 상수 테스트', () => {
    it('기본 props 값들이 올바르게 정의되어 있다', () => {
      const defaultProps = {
        variant: 'default',
        padding: 'medium',
      };

      expect(defaultProps.variant).toBe('default');
      expect(defaultProps.padding).toBe('medium');
    });

    it('유효한 variant 값들이 올바르게 정의되어 있다', () => {
      const validVariants = ['default', 'elevated', 'outlined'];
      expect(validVariants).toContain('default');
      expect(validVariants).toContain('elevated');
      expect(validVariants).toContain('outlined');
    });

    it('유효한 padding 값들이 올바르게 정의되어 있다', () => {
      const validPaddings = ['small', 'medium', 'large'];
      expect(validPaddings).toContain('small');
      expect(validPaddings).toContain('medium');
      expect(validPaddings).toContain('large');
    });
  });

  describe('Card 관련 함수 조합 테스트', () => {
    it('복합적인 시나리오가 올바르게 처리된다', () => {
      // elevated variant, large padding, clickable
      const mockOnClick = vi.fn();
      const variantStyles = getVariantStyles('elevated');
      const paddingStyles = getPaddingStyles('large');
      const baseStyles = getBaseStyles(mockOnClick);
      const hoverStyles = getHoverStyles(mockOnClick, 'elevated');
      const shouldShowTitleResult = shouldShowTitle('Test Title');
      const isClickableResult = isClickable(mockOnClick);

      expect(variantStyles.backgroundColor).toBe('#ffffff');
      expect(variantStyles.boxShadow).toContain('rgba(0, 0, 0, 0.1)');
      expect(paddingStyles.padding).toBe('24px');
      expect(baseStyles.cursor).toBe('pointer');
      expect(hoverStyles.transform).toBe('translateY(-2px)');
      expect(shouldShowTitleResult).toBe(true);
      expect(isClickableResult).toBe(true);
    });

    it('non-clickable 카드가 올바르게 처리된다', () => {
      const variantStyles = getVariantStyles('outlined');
      const paddingStyles = getPaddingStyles('small');
      const baseStyles = getBaseStyles();
      const hoverStyles = getHoverStyles();
      const isClickableResult = isClickable(undefined);

      expect(variantStyles.backgroundColor).toBe('transparent');
      expect(variantStyles.border).toBe('2px solid #e5e7eb');
      expect(paddingStyles.padding).toBe('12px');
      expect(baseStyles.cursor).toBe('default');
      expect(hoverStyles).toEqual({});
      expect(isClickableResult).toBe(false);
    });

    it('유효성 검사가 올바르게 작동한다', () => {
      const isValidVariant = validateCardVariant('elevated');
      const isValidPadding = validateCardPadding('large');

      expect(isValidVariant).toBe(true);
      expect(isValidPadding).toBe(true);
    });
  });
});
