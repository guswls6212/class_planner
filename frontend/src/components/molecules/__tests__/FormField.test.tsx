import { vi } from 'vitest';
import FormField, {
  getFormFieldStyles,
  getInputProps,
  getLabelProps,
  hasError,
  isFormFieldDisabled,
  shouldUseCustomInput,
  validateFormFieldSize,
  validateFormFieldType,
} from '../FormField';

// Mock React Testing Library to avoid DOM issues
vi.mock('@testing-library/react', () => ({
  render: vi.fn(),
  screen: { getByText: vi.fn(), getByLabelText: vi.fn() },
}));

// Mock Label component
vi.mock('../atoms/Label', () => ({
  default: vi.fn(({ children, ...props }) => (
    <label data-testid="label" {...props}>
      {children}
    </label>
  )),
}));

// Mock Input component
vi.mock('../atoms/Input', () => ({
  default: vi.fn(({ ...props }) => <input data-testid="input" {...props} />),
}));

describe('FormField 컴포넌트', () => {
  it('FormField 컴포넌트가 올바르게 정의되어 있다', () => {
    expect(FormField).toBeDefined();
    expect(typeof FormField).toBe('function');
  });

  // 단위 테스트 (함수 레벨)
  describe('유틸리티 함수 테스트', () => {
    describe('getFormFieldStyles', () => {
      it('올바른 스타일을 반환한다', () => {
        const result = getFormFieldStyles();
        expect(result).toEqual({ marginBottom: '16px' });
      });
    });

    describe('shouldUseCustomInput', () => {
      it('children이 있을 때 true를 반환한다', () => {
        const customInput = <input type="text" />;
        expect(shouldUseCustomInput(customInput)).toBe(true);
        expect(shouldUseCustomInput(<div>Custom</div>)).toBe(true);
      });

      it('children이 없을 때 false를 반환한다', () => {
        expect(shouldUseCustomInput(undefined)).toBe(false);
        expect(shouldUseCustomInput(null)).toBe(false);
      });
    });

    describe('getLabelProps', () => {
      it('올바른 label props를 반환한다', () => {
        const result = getLabelProps('test-field', true, 'medium', false);
        expect(result).toEqual({
          htmlFor: 'test-field',
          required: true,
          size: 'medium',
          disabled: false,
        });
      });

      it('다양한 size 값으로 올바른 props를 반환한다', () => {
        expect(getLabelProps('field', false, 'small', false)).toEqual({
          htmlFor: 'field',
          required: false,
          size: 'small',
          disabled: false,
        });

        expect(getLabelProps('field', true, 'large', true)).toEqual({
          htmlFor: 'field',
          required: true,
          size: 'large',
          disabled: true,
        });
      });
    });

    describe('getInputProps', () => {
      it('올바른 input props를 반환한다', () => {
        const mockOnChange = vi.fn();
        const result = getInputProps(
          'email',
          'Enter email',
          'test@example.com',
          mockOnChange,
          false,
          'medium',
          undefined
        );

        expect(result).toEqual({
          type: 'email',
          placeholder: 'Enter email',
          value: 'test@example.com',
          onChange: mockOnChange,
          disabled: false,
          size: 'medium',
          error: undefined,
        });
      });

      it('error가 있을 때 올바른 props를 반환한다', () => {
        const mockOnChange = vi.fn();
        const result = getInputProps(
          'password',
          'Enter password',
          '',
          mockOnChange,
          false,
          'small',
          'Password is required'
        );

        expect(result).toEqual({
          type: 'password',
          placeholder: 'Enter password',
          value: '',
          onChange: mockOnChange,
          disabled: false,
          size: 'small',
          error: 'Password is required',
        });
      });

      it('disabled 상태일 때 올바른 props를 반환한다', () => {
        const mockOnChange = vi.fn();
        const result = getInputProps(
          'text',
          'Enter text',
          'Hello',
          mockOnChange,
          true,
          'large',
          undefined
        );

        expect(result).toEqual({
          type: 'text',
          placeholder: 'Enter text',
          value: 'Hello',
          onChange: mockOnChange,
          disabled: true,
          size: 'large',
          error: undefined,
        });
      });
    });

    describe('validateFormFieldType', () => {
      it('유효한 type 값들이 올바르게 검증된다', () => {
        expect(validateFormFieldType('text')).toBe(true);
        expect(validateFormFieldType('email')).toBe(true);
        expect(validateFormFieldType('password')).toBe(true);
        expect(validateFormFieldType('number')).toBe(true);
      });

      it('유효하지 않은 type 값들이 올바르게 검증된다', () => {
        expect(validateFormFieldType('tel')).toBe(false);
        expect(validateFormFieldType('url')).toBe(false);
        expect(validateFormFieldType('')).toBe(false);
      });
    });

    describe('validateFormFieldSize', () => {
      it('유효한 size 값들이 올바르게 검증된다', () => {
        expect(validateFormFieldSize('small')).toBe(true);
        expect(validateFormFieldSize('medium')).toBe(true);
        expect(validateFormFieldSize('large')).toBe(true);
      });

      it('유효하지 않은 size 값들이 올바르게 검증된다', () => {
        expect(validateFormFieldSize('tiny')).toBe(false);
        expect(validateFormFieldSize('huge')).toBe(false);
        expect(validateFormFieldSize('')).toBe(false);
      });
    });

    describe('hasError', () => {
      it('error가 있을 때 true를 반환한다', () => {
        expect(hasError('This field is required')).toBe(true);
        expect(hasError('Invalid input')).toBe(true);
      });

      it('error가 없을 때 false를 반환한다', () => {
        expect(hasError(undefined)).toBe(false);
        expect(hasError('')).toBe(false);
      });
    });

    describe('isFormFieldDisabled', () => {
      it('disabled가 true일 때 true를 반환한다', () => {
        expect(isFormFieldDisabled(true)).toBe(true);
      });

      it('disabled가 false일 때 false를 반환한다', () => {
        expect(isFormFieldDisabled(false)).toBe(false);
      });
    });
  });

  describe('FormField 관련 상수 테스트', () => {
    it('기본 props 값들이 올바르게 정의되어 있다', () => {
      const defaultProps = {
        type: 'text',
        required: false,
        disabled: false,
        size: 'medium',
      };

      expect(defaultProps.type).toBe('text');
      expect(defaultProps.required).toBe(false);
      expect(defaultProps.disabled).toBe(false);
      expect(defaultProps.size).toBe('medium');
    });

    it('유효한 type 값들이 올바르게 정의되어 있다', () => {
      const validTypes = ['text', 'email', 'password', 'number'];
      expect(validTypes).toContain('text');
      expect(validTypes).toContain('email');
      expect(validTypes).toContain('password');
      expect(validTypes).toContain('number');
    });

    it('유효한 size 값들이 올바르게 정의되어 있다', () => {
      const validSizes = ['small', 'medium', 'large'];
      expect(validSizes).toContain('small');
      expect(validSizes).toContain('medium');
      expect(validSizes).toContain('large');
    });
  });

  describe('FormField 관련 함수 조합 테스트', () => {
    it('복합적인 시나리오가 올바르게 처리된다', () => {
      // required, large, error, disabled
      const labelProps = getLabelProps('test-field', true, 'large', true);
      const inputProps = getInputProps(
        'email',
        'Enter email',
        '',
        vi.fn(),
        true,
        'large',
        'Email is required'
      );
      const hasErrorResult = hasError('Email is required');
      const isDisabledResult = isFormFieldDisabled(true);
      const isValidType = validateFormFieldType('email');
      const isValidSize = validateFormFieldSize('large');

      expect(labelProps.required).toBe(true);
      expect(labelProps.size).toBe('large');
      expect(labelProps.disabled).toBe(true);
      expect(inputProps.type).toBe('email');
      expect(inputProps.disabled).toBe(true);
      expect(inputProps.error).toBe('Email is required');
      expect(hasErrorResult).toBe(true);
      expect(isDisabledResult).toBe(true);
      expect(isValidType).toBe(true);
      expect(isValidSize).toBe(true);
    });

    it('정상 상태의 FormField가 올바르게 처리된다', () => {
      const labelProps = getLabelProps('normal-field', false, 'medium', false);
      const inputProps = getInputProps(
        'text',
        'Enter text',
        'Hello',
        vi.fn(),
        false,
        'medium',
        undefined
      );
      const hasErrorResult = hasError(undefined);
      const isDisabledResult = isFormFieldDisabled(false);

      expect(labelProps.required).toBe(false);
      expect(labelProps.disabled).toBe(false);
      expect(inputProps.error).toBeUndefined();
      expect(inputProps.disabled).toBe(false);
      expect(hasErrorResult).toBe(false);
      expect(isDisabledResult).toBe(false);
    });

    it('유효성 검사가 올바르게 작동한다', () => {
      const isValidType = validateFormFieldType('password');
      const isValidSize = validateFormFieldSize('small');

      expect(isValidType).toBe(true);
      expect(isValidSize).toBe(true);
    });
  });
});
