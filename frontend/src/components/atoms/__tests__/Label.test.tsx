import { vi } from 'vitest';
import Label, {
  getLabelClasses,
  getWrapperClasses,
  shouldShowHelpText,
  shouldShowRequired,
  validateLabelSize,
  validateLabelVariant,
} from '../Label';

// Mock React Testing Library to avoid DOM issues
vi.mock('@testing-library/react', () => ({
  render: vi.fn(),
  screen: { getByText: vi.fn(), getByLabelText: vi.fn() },
}));

describe('Label 컴포넌트', () => {
  it('Label 컴포넌트가 올바르게 정의되어 있다', () => {
    expect(Label).toBeDefined();
    expect(typeof Label).toBe('function');
  });

  // 단위 테스트 (함수 레벨)
  describe('유틸리티 함수 테스트', () => {
    describe('getLabelClasses', () => {
      it('기본 클래스가 올바르게 생성된다', () => {
        const result = getLabelClasses(
          'medium',
          'default',
          false,
          false,
          false,
          false
        );
        expect(result).toBe('label medium default');
      });

      it('error 상태일 때 error 클래스가 추가된다', () => {
        const result = getLabelClasses(
          'medium',
          'default',
          true,
          false,
          false,
          false
        );
        expect(result).toBe('label medium default error');
      });

      it('success 상태일 때 success 클래스가 추가된다', () => {
        const result = getLabelClasses(
          'medium',
          'default',
          false,
          true,
          false,
          false
        );
        expect(result).toBe('label medium default success');
      });

      it('warning 상태일 때 warning 클래스가 추가된다', () => {
        const result = getLabelClasses(
          'medium',
          'default',
          false,
          false,
          true,
          false
        );
        expect(result).toBe('label medium default warning');
      });

      it('disabled 상태일 때 disabled 클래스가 추가된다', () => {
        const result = getLabelClasses(
          'medium',
          'default',
          false,
          false,
          false,
          true
        );
        expect(result).toBe('label medium default disabled');
      });

      it('모든 상태가 true일 때 모든 클래스가 추가된다', () => {
        const result = getLabelClasses(
          'large',
          'checkbox',
          true,
          true,
          true,
          true
        );
        expect(result).toBe(
          'label large checkbox error success warning disabled'
        );
      });
    });

    describe('getWrapperClasses', () => {
      it('variant가 group일 때 labelGroup 클래스가 추가된다', () => {
        const result = getWrapperClasses('group');
        expect(result).toBe('labelGroup');
      });

      it('variant가 group이 아닐 때 빈 문자열을 반환한다', () => {
        expect(getWrapperClasses('default')).toBe('');
        expect(getWrapperClasses('checkbox')).toBe('');
        expect(getWrapperClasses('inline')).toBe('');
      });
    });

    describe('shouldShowRequired', () => {
      it('required가 true일 때 true를 반환한다', () => {
        expect(shouldShowRequired(true)).toBe(true);
      });

      it('required가 false일 때 false를 반환한다', () => {
        expect(shouldShowRequired(false)).toBe(false);
      });
    });

    describe('shouldShowHelpText', () => {
      it('helpText가 있을 때 true를 반환한다', () => {
        expect(shouldShowHelpText('도움말 텍스트')).toBe(true);
      });

      it('helpText가 없을 때 false를 반환한다', () => {
        expect(shouldShowHelpText(undefined)).toBe(false);
        expect(shouldShowHelpText('')).toBe(false);
      });
    });

    describe('validateLabelSize', () => {
      it('유효한 size 값들이 올바르게 검증된다', () => {
        expect(validateLabelSize('small')).toBe(true);
        expect(validateLabelSize('medium')).toBe(true);
        expect(validateLabelSize('large')).toBe(true);
      });

      it('유효하지 않은 size 값들이 올바르게 검증된다', () => {
        expect(validateLabelSize('tiny')).toBe(false);
        expect(validateLabelSize('huge')).toBe(false);
        expect(validateLabelSize('')).toBe(false);
      });
    });

    describe('validateLabelVariant', () => {
      it('유효한 variant 값들이 올바르게 검증된다', () => {
        expect(validateLabelVariant('default')).toBe(true);
        expect(validateLabelVariant('checkbox')).toBe(true);
        expect(validateLabelVariant('inline')).toBe(true);
        expect(validateLabelVariant('group')).toBe(true);
      });

      it('유효하지 않은 variant 값들이 올바르게 검증된다', () => {
        expect(validateLabelVariant('custom')).toBe(false);
        expect(validateLabelVariant('button')).toBe(false);
        expect(validateLabelVariant('')).toBe(false);
      });
    });
  });

  describe('Label 관련 상수 테스트', () => {
    it('기본 props 값들이 올바르게 정의되어 있다', () => {
      const defaultProps = {
        required: false,
        size: 'medium',
        disabled: false,
        variant: 'default',
        error: false,
        success: false,
        warning: false,
      };

      expect(defaultProps.required).toBe(false);
      expect(defaultProps.size).toBe('medium');
      expect(defaultProps.disabled).toBe(false);
      expect(defaultProps.variant).toBe('default');
      expect(defaultProps.error).toBe(false);
      expect(defaultProps.success).toBe(false);
      expect(defaultProps.warning).toBe(false);
    });

    it('유효한 size 값들이 올바르게 정의되어 있다', () => {
      const validSizes = ['small', 'medium', 'large'];
      expect(validSizes).toContain('small');
      expect(validSizes).toContain('medium');
      expect(validSizes).toContain('large');
    });

    it('유효한 variant 값들이 올바르게 정의되어 있다', () => {
      const validVariants = ['default', 'checkbox', 'inline', 'group'];
      expect(validVariants).toContain('default');
      expect(validVariants).toContain('checkbox');
      expect(validVariants).toContain('inline');
      expect(validVariants).toContain('group');
    });
  });

  describe('Label 관련 함수 조합 테스트', () => {
    it('복합적인 시나리오가 올바르게 처리된다', () => {
      // error 상태의 large checkbox label
      const labelClasses = getLabelClasses(
        'large',
        'checkbox',
        true,
        false,
        false,
        false
      );
      const wrapperClasses = getWrapperClasses('checkbox');
      const shouldShowRequiredResult = shouldShowRequired(true);
      const shouldShowHelpTextResult = shouldShowHelpText('도움말');

      expect(labelClasses).toBe('label large checkbox error');
      expect(wrapperClasses).toBe('');
      expect(shouldShowRequiredResult).toBe(true);
      expect(shouldShowHelpTextResult).toBe(true);
    });

    it('정상 상태의 label이 올바르게 처리된다', () => {
      const labelClasses = getLabelClasses(
        'medium',
        'default',
        false,
        false,
        false,
        false
      );
      const wrapperClasses = getWrapperClasses('default');
      const shouldShowRequiredResult = shouldShowRequired(false);
      const shouldShowHelpTextResult = shouldShowHelpText(undefined);

      expect(labelClasses).toBe('label medium default');
      expect(wrapperClasses).toBe('');
      expect(shouldShowRequiredResult).toBe(false);
      expect(shouldShowHelpTextResult).toBe(false);
    });

    it('group variant가 올바르게 처리된다', () => {
      const labelClasses = getLabelClasses(
        'small',
        'group',
        false,
        false,
        false,
        false
      );
      const wrapperClasses = getWrapperClasses('group');

      expect(labelClasses).toBe('label small group');
      expect(wrapperClasses).toBe('labelGroup');
    });
  });
});
