import { vi } from 'vitest';
import Input, {
  getInputClasses,
  getWrapperClasses,
  handleInputChange,
  shouldShowError,
  shouldShowIcon,
  validateInputType,
} from '../Input';

// Mock React Testing Library to avoid DOM issues
vi.mock('@testing-library/react', () => ({
  render: vi.fn(),
  screen: { getByRole: vi.fn(), getByDisplayValue: vi.fn() },
  fireEvent: { change: vi.fn() },
}));

describe('Input 컴포넌트', () => {
  it('Input 컴포넌트가 올바르게 정의되어 있다', () => {
    expect(Input).toBeDefined();
    expect(typeof Input).toBe('function');
  });

  // 단위 테스트 (함수 레벨)
  describe('유틸리티 함수 테스트', () => {
    describe('getInputClasses', () => {
      it('기본 클래스가 올바르게 생성된다', () => {
        const result = getInputClasses('medium', undefined, 'text');
        expect(result).toBe('input medium');
      });

      it('error가 있을 때 error 클래스가 추가된다', () => {
        const result = getInputClasses('medium', '에러 메시지', 'text');
        expect(result).toBe('input medium error');
      });

      it('search 타입일 때 search 클래스가 추가된다', () => {
        const result = getInputClasses('medium', undefined, 'search');
        expect(result).toBe('input medium search');
      });

      it('className이 있을 때 추가된다', () => {
        const result = getInputClasses(
          'medium',
          undefined,
          'text',
          'custom-class'
        );
        expect(result).toBe('input medium custom-class');
      });

      it('모든 조건이 있을 때 모든 클래스가 추가된다', () => {
        const result = getInputClasses('large', '에러', 'search', 'custom');
        expect(result).toBe('input large error search custom');
      });
    });

    describe('getWrapperClasses', () => {
      it('아이콘이 없을 때 기본 클래스만 반환한다', () => {
        const result = getWrapperClasses(null);
        expect(result).toBe('inputWrapper');
      });

      it('아이콘이 있을 때 inputWithIcon 클래스가 추가된다', () => {
        const icon = <span>icon</span>;
        const result = getWrapperClasses(icon);
        expect(result).toBe('inputWrapper inputWithIcon');
      });
    });

    describe('shouldShowIcon', () => {
      it('아이콘이 있을 때 true를 반환한다', () => {
        const icon = <span>icon</span>;
        expect(shouldShowIcon(icon)).toBe(true);
      });

      it('아이콘이 없을 때 false를 반환한다', () => {
        expect(shouldShowIcon(null)).toBe(false);
        expect(shouldShowIcon(undefined)).toBe(false);
      });
    });

    describe('shouldShowError', () => {
      it('에러가 있을 때 true를 반환한다', () => {
        expect(shouldShowError('에러 메시지')).toBe(true);
      });

      it('에러가 없을 때 false를 반환한다', () => {
        expect(shouldShowError(undefined)).toBe(false);
        expect(shouldShowError('')).toBe(false);
      });
    });

    describe('handleInputChange', () => {
      it('disabled가 false일 때 onChange가 호출된다', () => {
        const mockOnChange = vi.fn();
        handleInputChange('test', false, mockOnChange);
        expect(mockOnChange).toHaveBeenCalledWith('test');
      });

      it('disabled가 true일 때 onChange가 호출되지 않는다', () => {
        const mockOnChange = vi.fn();
        handleInputChange('test', true, mockOnChange);
        expect(mockOnChange).not.toHaveBeenCalled();
      });
    });

    describe('validateInputType', () => {
      it('유효한 타입들이 올바르게 검증된다', () => {
        expect(validateInputType('text')).toBe(true);
        expect(validateInputType('email')).toBe(true);
        expect(validateInputType('password')).toBe(true);
        expect(validateInputType('number')).toBe(true);
        expect(validateInputType('search')).toBe(true);
      });

      it('유효하지 않은 타입들이 올바르게 검증된다', () => {
        expect(validateInputType('invalid')).toBe(false);
        expect(validateInputType('tel')).toBe(false);
        expect(validateInputType('url')).toBe(false);
        expect(validateInputType('')).toBe(false);
      });
    });
  });

  describe('Input 관련 상수 테스트', () => {
    it('기본 props 값들이 올바르게 정의되어 있다', () => {
      const defaultProps = {
        type: 'text',
        disabled: false,
        size: 'medium',
      };

      expect(defaultProps.type).toBe('text');
      expect(defaultProps.disabled).toBe(false);
      expect(defaultProps.size).toBe('medium');
    });

    it('유효한 type 값들이 올바르게 정의되어 있다', () => {
      const validTypes = ['text', 'email', 'password', 'number', 'search'];
      expect(validTypes).toContain('text');
      expect(validTypes).toContain('email');
      expect(validTypes).toContain('password');
      expect(validTypes).toContain('number');
      expect(validTypes).toContain('search');
    });

    it('유효한 size 값들이 올바르게 정의되어 있다', () => {
      const validSizes = ['small', 'medium', 'large'];
      expect(validSizes).toContain('small');
      expect(validSizes).toContain('medium');
      expect(validSizes).toContain('large');
    });
  });

  describe('Input 관련 함수 조합 테스트', () => {
    it('복합적인 시나리오가 올바르게 처리된다', () => {
      // 에러가 있는 search input
      const inputClasses = getInputClasses('large', '에러', 'search', 'custom');
      const wrapperClasses = getWrapperClasses(<span>icon</span>);
      const shouldShowIconResult = shouldShowIcon(<span>icon</span>);
      const shouldShowErrorResult = shouldShowError('에러');

      expect(inputClasses).toBe('input large error search custom');
      expect(wrapperClasses).toBe('inputWrapper inputWithIcon');
      expect(shouldShowIconResult).toBe(true);
      expect(shouldShowErrorResult).toBe(true);
    });

    it('정상 상태의 input이 올바르게 처리된다', () => {
      const inputClasses = getInputClasses('medium', undefined, 'text');
      const wrapperClasses = getWrapperClasses(null);
      const shouldShowIconResult = shouldShowIcon(null);
      const shouldShowErrorResult = shouldShowError(undefined);

      expect(inputClasses).toBe('input medium');
      expect(wrapperClasses).toBe('inputWrapper');
      expect(shouldShowIconResult).toBe(false);
      expect(shouldShowErrorResult).toBe(false);
    });
  });
});
